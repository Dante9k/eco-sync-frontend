"""7. One pipeline for scheduled/manual runs, with immutable configuration and recovery."""
import copy
import threading
import uuid
from concurrent.futures import ThreadPoolExecutor
from ..models import Fault, iso, public_error, year_range
from .agent_manager import AgentManager
from .external_client import ExternalClient
from .data_cleaner import DataCleaner
from .bitable_writer import BitableWriter
from .warning_notifier import WarningNotifier


def public_run(run):
    names = ('runId', 'startedAt', 'finishedAt', 'state', 'stats', 'errorMessage', 'source', 'year',
             'configVersion', 'stage', 'counters', 'outcome', 'recoverable', 'notificationState',
             'notificationError', 'warningCount', 'timeRange')
    return {**{name: copy.deepcopy(run.get(name)) for name in names}, 'mode': run['config']['integrations']['mode']}


class SyncService:
    def __init__(self, store, config, registry, logs):
        self.store, self.config, self.registry, self.logs = store, config, registry, logs
        self.lock = threading.RLock()
        self.executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix='exo-sync')
        self.futures = {}
        self.notice_jobs = set()
        self.stopping = False
        self.agents, self.client, self.cleaner, self.writer = AgentManager(), ExternalClient(), DataCleaner(), BitableWriter()
        self.notifier = WarningNotifier(store, logs)
        for run in store.runs():
            if run['state'] == 'syncing':
                run.update(state='error', outcome='interrupted', recoverable=True, finishedAt=iso(),
                           errorMessage='上次执行因进程中断而停止，可恢复并核验已写入结果。')
                if run['notificationState'] == 'sending':
                    run['notificationState'] = 'failed'
                store.save_run(run)
                logs.record('sync.interrupted', run['runId'], run['configVersion'], 'ERROR')
            elif run['notificationState'] == 'sending':
                run['notificationState'] = 'failed'
                run['notificationError'] = '通知发送期间进程中断，请单独重试并核验。'
                store.save_run(run)

    def trigger(self, year, source='manual', now=None, schedule_key=None):
        time_range = year_range(year, now)
        with self.lock:
            if self.stopping:
                raise Fault('SERVICE_STOPPING', '服务正在停止，请稍后重试。', 503)
            if schedule_key:
                existing = self.store.scheduled_run(schedule_key)
                if existing:
                    return {'runId': existing}
            config = self.config.snapshot()
            self.registry.resolve(config)  # Fail closed before claiming a job was accepted.
            target = config['integrations']['mode'] + ':' + config['integrations']['tableId']
            run = {'runId': uuid.uuid4().hex, 'target': target, 'source': source, 'year': year,
                   'timeRange': time_range, 'config': config, 'configVersion': config['version'], 'scheduleKey': schedule_key,
                   'startedAt': iso(now), 'finishedAt': None, 'state': 'syncing', 'stage': 'queued',
                   'stats': {'added': 0, 'updated': 0, 'removed': 0, 'unchanged': 0},
                   'counters': {'fetched': 0, 'valid': 0, 'written': 0, 'failed': 0},
                   'errorMessage': None, 'outcome': 'running', 'recoverable': False,
                   'records': None, 'operations': None, 'alerts': [], 'warningCount': 0,
                   'notificationState': 'pending', 'notificationError': None}
            self.store.create_run(run)
            self._launch(run, 'sync.started')
            return {'runId': run['runId']}

    def _audit(self, event, run, level='INFO'):
        try:
            self.logs.record(event, run['runId'], run['configVersion'], level)
        except Exception:
            raise Fault('AUDIT_FAILED', '操作记录写入失败，任务已停止，请联系管理员。', 503) from None

    def _launch(self, run, event):
        try:
            self._audit(event, run)
            self.futures[run['runId']] = self.executor.submit(self._execute, run)
        except Exception:
            run.update(state='error', outcome='failed', finishedAt=iso(), recoverable=True,
                       errorMessage='任务未能启动，请联系管理员检查运行记录和服务状态后继续同步。')
            self.store.save_run(run)
            raise Fault('TASK_START_FAILED', run['errorMessage'], 503) from None

    def _stage(self, run, stage):
        run['stage'] = stage
        self.store.save_run(run)
        self._audit('sync.stage', run, 'DEBUG')

    def _checkpoint(self, run, audit=True):
        confirmed = [op for op in run['operations'] or [] if op['state'] == 'confirmed']
        run['stats']['added'] = sum(op['kind'] == 'added' for op in confirmed)
        run['stats']['updated'] = sum(op['kind'] == 'updated' for op in confirmed)
        run['counters']['written'] = len(confirmed)
        run['counters']['failed'] = 0
        self.store.save_run(run)
        if audit:
            self._audit('sync.checkpoint', run, 'DEBUG')

    def _execute(self, run):
        try:
            self._stage(run, 'access')
            source, workflow = self.agents.connect(self.registry, run['config'])
            if run['records'] is None:
                self._stage(run, 'fetch')
                rows = self.client.fetch(source, run['timeRange'], run['config'])
                run['counters']['fetched'] = len(rows)
                self._stage(run, 'clean')
                records = self.cleaner.clean(rows, source, run['config'])
                run['records'] = records
                run['counters']['valid'] = len(records)
                self.store.save_run(run)
            if run['operations'] is None:
                self._stage(run, 'plan')
                operations, unchanged = self.writer.plan(run['records'], workflow, run['config'])
                run['operations'], run['stats']['unchanged'] = operations, unchanged
                self.store.save_run(run)  # Plan commits before any remote mutation.
            self._stage(run, 'write')
            self.writer.execute(run, workflow, self._checkpoint)
            self._checkpoint(run)
            self._stage(run, 'warnings')
            self.notifier.evaluate(run)
            self._stage(run, 'notify')
            self.notifier.send(run, workflow)
            run.update(state='success', stage='complete', outcome='complete', finishedAt=iso(), recoverable=False, errorMessage=None)
            self.store.save_run(run)
            self._audit('sync.completed', run)
        except Exception as error:
            fault = public_error(error)
            self._checkpoint(run, audit=False)
            run['counters']['failed'] = sum(op['state'] != 'confirmed' for op in run['operations'] or [])
            if run['operations'] is None:
                run['counters']['failed'] = run['counters']['fetched']
            run.update(state='error', outcome='partial' if run['counters']['written'] else 'failed',
                       errorMessage=fault.message, finishedAt=iso(), recoverable=fault.code != 'TARGET_CONFLICT')
            self.store.save_run(run)
            try:
                self._audit('sync.failed', run, 'ERROR')
            except Fault:
                run['errorMessage'] += ' 操作记录暂未保存。'
                self.store.save_run(run)

    def resume(self, run_id):
        with self.lock:
            run = self.store.run(run_id)
            if self.stopping or run['state'] != 'error' or not run['recoverable']:
                raise Fault('RUN_NOT_RECOVERABLE', '该任务当前不能恢复。', 409)
            latest = next(r for r in self.store.runs() if r['target'] == run['target'])
            if latest['runId'] != run_id:
                raise Fault('RUN_SUPERSEDED', '该目标已有更新任务，为避免覆盖新数据，请发起新的同步。', 409)
            self.registry.resolve(run['config'])
            run.update(state='syncing', outcome='running', finishedAt=None, recoverable=False, errorMessage=None)
            self.store.save_run(run)
            self._launch(run, 'sync.resumed')
            return {'runId': run_id}

    def retry_notification(self, run_id):
        with self.lock:
            run = self.store.run(run_id)
            if self.stopping or run_id in self.notice_jobs or run['state'] != 'success' or run['notificationState'] != 'failed':
                raise Fault('NOTICE_NOT_RETRYABLE', '通知当前不能重试。', 409)
            self.notice_jobs.add(run_id)
            self.futures['notice:' + run_id] = self.executor.submit(self._retry_notification, run)
            return {'runId': run_id}

    def _retry_notification(self, run):
        try:
            _, workflow = self.agents.connect(self.registry, run['config'])
            self.notifier.send(run, workflow)
        except Exception:
            self.logs.record('notification.failed', run['runId'], run['configVersion'], 'ERROR')
        finally:
            with self.lock:
                self.notice_jobs.discard(run['runId'])

    def history(self, page, page_size, state=''):
        runs = [run for run in self.store.runs() if not state or run['state'] == state]
        latest_by_target = {}
        for run in self.store.runs():
            latest_by_target.setdefault(run['target'], run['runId'])
        items = []
        for run in runs[(page-1)*page_size:page*page_size]:
            item = public_run(run)
            item['recoverable'] = item['recoverable'] and latest_by_target[run['target']] == run['runId']
            items.append(item)
        return {'items': items, 'page': page, 'pageSize': page_size, 'total': len(runs)}

    def diff(self, run_id, page, page_size):
        run = self.store.run(run_id)
        operations = [op for op in run['operations'] or [] if op['state'] == 'confirmed']
        def display(value):
            if value is None:
                return None
            return str(value)
        return {'runId': run_id, 'summary': {key: run['stats'][key] for key in ('added', 'updated', 'removed')},
                'records': [{'key': op['key'], 'kind': op['kind'], 'fields': [
                    {'name': name, 'before': display((op['before'] or {}).get(name)), 'after': display(value)}
                    for name, value in op['after'].items() if op['before'] is None or op['before'].get(name) != value]}
                            for op in operations[(page-1)*page_size:page*page_size]]}

    def status(self):
        config = self.config.snapshot()
        target = config['integrations']['mode'] + ':' + config['integrations']['tableId']
        runs = [run for run in self.store.runs() if run['target'] == target]
        latest = next((run for run in runs if run['state'] == 'syncing'), runs[0] if runs else None)
        success = next((run for run in runs if run['state'] == 'success'), None)
        error = next((run for run in runs if run['state'] == 'error'), None)
        schedule = self.store.get_meta('schedule', {})
        stages = {'queued': 0, 'access': 5, 'fetch': 15, 'clean': 35, 'plan': 45, 'write': 60, 'warnings': 85, 'notify': 95}
        return {'state': latest['state'] if latest else 'idle', 'lastSyncAt': latest['startedAt'] if latest else None,
                'lastSuccessAt': success['finishedAt'] if success else None,
                'lastError': {'message': error['errorMessage'], 'at': error['finishedAt']} if error else None,
                'progress': stages.get(latest['stage'], 0) if latest and latest['state'] == 'syncing' else None,
                'nextScheduledAt': schedule.get('nextAt') if config['schedule']['enabled'] else None,
                'scheduleInfo': {key: schedule.get(key) for key in ('lastOutcome', 'lastAttemptAt', 'message')},
                'counts': {'source': latest['counters']['fetched'] if latest else 0,
                           'target': latest['counters']['written'] if latest else 0,
                           'pending': sum(op['state'] != 'confirmed' for op in (latest['operations'] or [])) if latest else 0},
                'mode': config['integrations']['mode'], 'ready': self.registry.ready(config),
                'latestRun': public_run(latest) if latest else None}

    def wait(self, run_id):
        self.futures[run_id].result(timeout=30)
        return self.store.run(run_id)

    def close(self):
        with self.lock:
            self.stopping = True
        self.executor.shutdown(wait=True)
