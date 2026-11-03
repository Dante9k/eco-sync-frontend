import json
import tempfile
import threading
import unittest
from datetime import datetime, timezone, timedelta
from pathlib import Path
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.request import Request, urlopen
from backend.app import Application, make_server
from backend.adapters import SimulationSource, SimulationWorkflow
from backend.models import Fault, SourcePage, NormalizedRecord, year_range


class FrameworkTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.app = Application(self.temp.name, demo=True)

    def tearDown(self):
        self.app.close()
        self.temp.cleanup()

    def update(self, section, value):
        return self.app.api.handle('POST', '/api/exo/config/' + section,
                                   {'version': self.app.config.snapshot()['version'], 'value': value})

    def sync(self):
        result = self.app.service.trigger(2024)
        return self.app.service.wait(result['runId'])

    def test_year_ranges_are_shanghai_and_end_exclusive(self):
        now = datetime(2026, 11, 3, 2, tzinfo=timezone.utc)
        current = year_range(2026, now)
        self.assertEqual(current['startInclusive'], '2025-12-31T16:00:00Z')
        self.assertEqual(current['endExclusive'], '2026-11-03T16:00:00Z')
        self.assertEqual(year_range(2024, now)['endExclusive'], '2024-12-31T16:00:00Z')
        for value in (2027, True, '2024', 1969):
            with self.assertRaises(Fault):
                year_range(value, now)

    def test_configuration_version_backup_atomic_failure_and_validation(self):
        first = self.app.config.snapshot()
        second = self.update('schedule', {'enabled': True, 'kind': 'daily', 'time': '09:00', 'timezone': 'Asia/Shanghai'})
        self.assertEqual(second['version'], 2)
        backup = json.loads((Path(self.temp.name) / 'config.json.bak').read_text(encoding='utf-8'))
        self.assertEqual(backup, first)
        with self.assertRaises(Fault) as conflict:
            self.app.config.update('notifications', {'enabled': True}, 1)
        self.assertEqual(conflict.exception.code, 'CONFIG_CONFLICT')
        with patch('backend.modules.config_manager.os.replace', side_effect=OSError('private-path')):
            with self.assertRaises(Fault):
                self.update('notifications', {'enabled': True})
        self.assertEqual(self.app.config.snapshot(), second)
        self.assertEqual(json.loads((Path(self.temp.name) / 'config.json').read_text(encoding='utf-8')), second)
        with self.assertRaises(Fault):
            self.update('warnings', {'intervals': [{'minDays': 0, 'maxDays': 10}, {'minDays': 9, 'maxDays': 20}]})

    def test_repeated_runs_preserve_manual_fields_and_never_delete(self):
        first = self.sync()
        self.assertEqual(first['stats']['added'], 12)
        with self.app.store.transaction() as db:
            row = db.execute("SELECT fields FROM simulation_records WHERE key='EXO-2024-001'").fetchone()
            fields = json.loads(row['fields'])
            fields.update(title='旧标题', manual='人工备注')
            db.execute("UPDATE simulation_records SET fields=? WHERE key='EXO-2024-001'", (json.dumps(fields),))
            db.execute("INSERT INTO simulation_records VALUES ('demo-table','extra',?)", (json.dumps({'manual': '保留'}),))
        second = self.sync()
        self.assertEqual(second['state'], 'success')
        self.assertEqual(second['stats'], {'added': 0, 'updated': 1, 'removed': 0, 'unchanged': 11})
        rows = self.app.store.rows("SELECT fields FROM simulation_records WHERE key='EXO-2024-001'")
        self.assertEqual(json.loads(rows[0]['fields'])['manual'], '人工备注')
        self.assertEqual(len(self.app.store.rows('SELECT * FROM simulation_records')), 13)
        third = self.sync()
        self.assertEqual(third['stats']['unchanged'], 12)
        self.assertEqual(third['counters']['written'], 0)

    def test_partial_failure_resumes_only_unconfirmed_and_keeps_snapshot(self):
        store = self.app.store
        class Partial(SimulationWorkflow):
            failed = False
            sizes = []
            def write_batch(self, operations, config):
                self.sizes.append(len(operations))
                if not self.failed:
                    self.failed = True
                    super().write_batch(operations[:3], config)
                    raise OSError('private credential must not leak')
                super().write_batch(operations, config)
        workflow = Partial(store)
        self.app.registry.simulation = (SimulationSource(), workflow)
        run = self.sync()
        self.assertEqual(run['outcome'], 'partial')
        self.assertEqual(run['counters']['written'], 3)
        self.assertEqual(run['counters']['failed'], 9)
        self.update('notifications', {'enabled': True})
        self.app.service.resume(run['runId'])
        recovered = self.app.service.wait(run['runId'])
        self.assertEqual(recovered['state'], 'success')
        self.assertEqual(recovered['configVersion'], 1)
        self.assertEqual(recovered['notificationState'], 'disabled')
        self.assertEqual(workflow.sizes, [12, 9])

    def test_restart_reconciles_remote_commit_before_checkpoint(self):
        class Crash(SimulationWorkflow):
            def write_batch(self, operations, config):
                super().write_batch(operations[:4], config)
                raise SystemExit('simulated process loss')
        self.app.registry.simulation = (SimulationSource(), Crash(self.app.store))
        run_id = self.app.service.trigger(2024)['runId']
        with self.assertRaises(SystemExit):
            self.app.service.wait(run_id)
        self.app.close()
        self.app = Application(self.temp.name, demo=True)
        interrupted = self.app.store.run(run_id)
        self.assertEqual(interrupted['outcome'], 'interrupted')
        self.app.service.resume(run_id)
        restored = self.app.service.wait(run_id)
        self.assertEqual(restored['state'], 'success')
        self.assertEqual(len(self.app.store.rows('SELECT * FROM simulation_operations')), 12)
        self.assertEqual(restored['counters']['written'], 12)

    def test_source_incomplete_or_conflicting_keys_stop_all_writes(self):
        class Missing(SimulationSource):
            def fetch_page(self, *_):
                return SourcePage([{'id': 'one'}], 2)
        self.app.registry.simulation = (Missing(), SimulationWorkflow(self.app.store))
        self.assertEqual(self.sync()['state'], 'error')
        self.assertFalse(self.app.store.rows('SELECT * FROM simulation_records'))
        class Duplicate(SimulationSource):
            def normalize(self, row, config):
                original = super().normalize(row, config)
                return NormalizedRecord('same', original.fields, original.warning_days)
        self.app.registry.simulation = (Duplicate(), SimulationWorkflow(self.app.store))
        self.assertEqual(self.sync()['state'], 'error')
        self.assertFalse(self.app.store.rows('SELECT * FROM simulation_records'))

    def test_target_change_between_read_and_write_cannot_be_overwritten(self):
        self.sync()
        class Conflict(SimulationWorkflow):
            def write_batch(self, operations, config):
                with self.store.transaction() as db:
                    db.execute("UPDATE simulation_records SET fields=? WHERE key=?", (json.dumps({'title': '人工并发修改'}), operations[0]['key']))
                super().write_batch(operations, config)
        # Force an update, then simulate another writer racing after the preflight read.
        with self.app.store.transaction() as db:
            db.execute("UPDATE simulation_records SET fields=? WHERE key='EXO-2024-001'", (json.dumps({'title': 'old'}),))
        self.app.registry.simulation = (SimulationSource(), Conflict(self.app.store))
        run = self.sync()
        self.assertEqual(run['state'], 'error')
        record = self.app.registry.simulation[1].read(['EXO-2024-001'], run['config'])
        self.assertEqual(record['EXO-2024-001']['title'], '人工并发修改')
        self.assertFalse(run['recoverable'])
        self.assertIn('其他操作修改', run['errorMessage'])

    def test_notifications_fail_independently_and_retry_without_writes(self):
        self.update('warnings', {'intervals': [{'minDays': 0, 'maxDays': 100}]})
        self.update('notifications', {'enabled': True})
        class NoticeFailure(SimulationWorkflow):
            fail = True
            def notify(self, alerts, operation_id, config):
                super().notify(alerts, operation_id, config)
                if self.fail:
                    raise OSError('response lost')
        workflow = NoticeFailure(self.app.store)
        self.app.registry.simulation = (SimulationSource(), workflow)
        run = self.sync()
        self.assertEqual(run['state'], 'success')
        self.assertEqual(run['notificationState'], 'failed')
        self.assertEqual(run['warningCount'], 12)
        workflow.fail = False
        self.app.service.retry_notification(run['runId'])
        self.app.service.futures['notice:' + run['runId']].result(timeout=10)
        self.assertEqual(self.app.store.run(run['runId'])['notificationState'], 'sent')
        self.assertEqual(len(self.app.store.rows('SELECT * FROM simulation_messages')), 1)
        self.assertEqual(len(self.app.store.rows('SELECT * FROM simulation_operations')), 12)

    def test_disabled_notifications_still_evaluate_warnings(self):
        self.update('warnings', {'intervals': [{'minDays': 0, 'maxDays': 100}]})
        run = self.sync()
        self.assertEqual(run['warningCount'], 12)
        self.assertEqual(run['notificationState'], 'disabled')
        self.assertFalse(self.app.store.rows('SELECT * FROM simulation_messages'))

    def test_shared_target_lock_for_manual_and_scheduler(self):
        entered, release = threading.Event(), threading.Event()
        class Slow(SimulationSource):
            def fetch_page(self, *args):
                entered.set()
                release.wait(10)
                return super().fetch_page(*args)
        self.app.registry.simulation = (Slow(), SimulationWorkflow(self.app.store))
        self.update('schedule', {'enabled': True, 'kind': 'daily', 'time': '09:00', 'timezone': 'Asia/Shanghai'})
        run_id = self.app.service.trigger(2024)['runId']
        try:
            self.assertTrue(entered.wait(5))
            with self.assertRaises(Fault) as conflict:
                self.app.service.trigger(2024)
            self.assertEqual(conflict.exception.code, 'SYNC_IN_PROGRESS')
            self.app.scheduler.tick(datetime.fromisoformat(self.app.store.get_meta('schedule')['nextAt'].replace('Z', '+00:00')) + timedelta(seconds=1))
            self.assertEqual(len(self.app.store.runs()), 1)
            self.assertEqual(self.app.logs.list(category='schedule')['items'][0]['event'], 'schedule.skipped')
        finally:
            release.set()
        self.app.service.wait(run_id)

    def test_config_snapshot_does_not_change_while_running(self):
        entered, release = threading.Event(), threading.Event()
        class Slow(SimulationSource):
            def fetch_page(self, *args):
                entered.set()
                release.wait(10)
                return super().fetch_page(*args)
        self.app.registry.simulation = (Slow(), SimulationWorkflow(self.app.store))
        run_id = self.app.service.trigger(2024)['runId']
        try:
            self.assertTrue(entered.wait(5))
            self.update('warnings', {'intervals': [{'minDays': 0, 'maxDays': 100}]})
        finally:
            release.set()
        run = self.app.service.wait(run_id)
        self.assertEqual(run['configVersion'], 1)
        self.assertEqual(run['warningCount'], 0)

    def test_custom_unconfigured_adapter_fails_closed(self):
        settings = self.app.config.snapshot()['integrations']
        self.update('integrations', {**settings, 'mode': 'custom'})
        with self.assertRaises(Fault) as fault:
            self.app.service.trigger(2024)
        self.assertEqual(fault.exception.code, 'INTEGRATION_NOT_READY')
        self.assertEqual(self.app.service.status()['ready'], False)

    def test_old_failed_run_cannot_overwrite_newer_success(self):
        class Missing(SimulationSource):
            def fetch_page(self, *_):
                return SourcePage([], 1)
        self.app.registry.simulation = (Missing(), SimulationWorkflow(self.app.store))
        old = self.sync()
        self.app.registry.simulation = (SimulationSource(), SimulationWorkflow(self.app.store))
        self.assertEqual(self.sync()['state'], 'success')
        with self.assertRaises(Fault) as rejected:
            self.app.service.resume(old['runId'])
        self.assertEqual(rejected.exception.code, 'RUN_SUPERSEDED')
        old_public = next(run for run in self.app.service.history(1, 20)['items'] if run['runId'] == old['runId'])
        self.assertFalse(old_public['recoverable'])

    def test_schedule_deadline_survives_restart_and_triggers_shared_pipeline(self):
        self.update('schedule', {'enabled': True, 'kind': 'daily', 'time': '09:00', 'timezone': 'Asia/Shanghai'})
        deadline = self.app.store.get_meta('schedule')['nextAt']
        self.update('warnings', {'intervals': [{'minDays': 0, 'maxDays': 100}]})
        self.app.close()
        self.app = Application(self.temp.name, demo=True)
        self.assertEqual(self.app.store.get_meta('schedule')['nextAt'], deadline)
        now = datetime.fromisoformat(deadline.replace('Z', '+00:00')) + timedelta(seconds=1)
        self.app.scheduler.tick(now)
        run_id = self.app.store.runs()[0]['runId']
        run = self.app.service.wait(run_id)
        self.assertEqual(run['source'], 'scheduled')
        self.assertEqual(run['state'], 'success')
        self.assertEqual(run['warningCount'], 12)
        self.app.scheduler.tick(now)
        self.assertEqual(len(self.app.store.runs()), 1)

    def test_data_directory_rejects_second_backend_process(self):
        with self.assertRaises(Fault) as rejected:
            Application(self.temp.name)
        self.assertEqual(rejected.exception.code, 'INSTANCE_RUNNING')

    def test_http_contract_csrf_and_spa_fallback(self):
        dist = Path(self.temp.name) / 'dist'
        dist.mkdir()
        (dist / 'index.html').write_text('<html>app</html>', encoding='utf-8')
        server = make_server(self.app, port=0, dist=dist)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        base = f'http://127.0.0.1:{server.server_port}'
        try:
            with urlopen(base + '/api/exo/config') as response:
                self.assertTrue(json.load(response)['ok'])
            with urlopen(base + '/history/example') as response:
                self.assertIn(b'<html>', response.read())
            for route in ('/api/unknown', '/admin/unknown', '/assets/missing.js'):
                with self.assertRaises(HTTPError) as missing:
                    urlopen(base + route)
                self.assertEqual(missing.exception.code, 404)
            with self.assertRaises(HTTPError) as rejected:
                urlopen(Request(base + '/api/exo/sync', b'{"year":2024}', {'Content-Type': 'application/json'}))
            self.assertEqual(rejected.exception.code, 403)
            with urlopen(Request(base + '/api/exo/sync', b'{"year":2024}', {'Content-Type': 'application/json', 'X-Requested-With': 'fetch'})) as response:
                self.assertEqual(response.status, 202)
                run_id = json.load(response)['data']['runId']
            self.app.service.wait(run_id)
            with self.assertRaises(HTTPError) as invalid:
                urlopen(base + '/api/exo/history?pageSize=101')
            self.assertEqual(invalid.exception.code, 400)
        finally:
            server.shutdown()
            server.server_close()
            thread.join()

    def test_public_responses_and_debug_logs_exclude_private_run_data(self):
        self.update('logging', {'level': 'DEBUG'})
        run = self.sync()
        public = json.dumps(self.app.service.history(1, 20), ensure_ascii=False)
        self.assertNotIn('operations', public)
        self.assertNotIn('managedFields', public)
        self.assertEqual(self.app.service.history(1, 20)['items'][0]['mode'], 'simulation')
        logs = json.dumps(self.app.logs.list(page_size=100), ensure_ascii=False)
        self.assertNotIn('EXO-2024', logs)
        self.assertNotIn('模拟变更单', logs)
        completed = self.app.logs.list(category='sync')['items'][0]
        self.assertEqual(completed['context']['counters']['written'], 12)
        diff = self.app.service.diff(run['runId'], 1, 5)
        self.assertEqual(len(diff['records']), 5)
        self.assertEqual(diff['summary']['added'], 12)

    def test_status_is_scoped_to_the_current_target(self):
        self.assertEqual(self.sync()['state'], 'success')
        settings = self.app.config.snapshot()['integrations']
        self.update('integrations', {**settings, 'tableId': 'another-table'})
        status = self.app.service.status()
        self.assertEqual(status['state'], 'idle')
        self.assertIsNone(status['latestRun'])
        self.assertIsNone(status['lastSuccessAt'])
        self.assertEqual(status['counts']['target'], 0)

    def test_admission_audit_failure_does_not_leave_a_running_lock(self):
        with patch.object(self.app.logs, 'record', side_effect=OSError('private disk path')):
            with self.assertRaises(Fault) as rejected:
                self.app.service.trigger(2024)
        self.assertEqual(rejected.exception.code, 'TASK_START_FAILED')
        run = self.app.store.runs()[0]
        self.assertEqual(run['state'], 'error')
        self.assertTrue(run['recoverable'])
        self.assertNotIn('private', run['errorMessage'])
        self.app.service.resume(run['runId'])
        self.assertEqual(self.app.service.wait(run['runId'])['state'], 'success')

    def test_audit_failure_during_execution_finishes_as_error(self):
        original = self.app.logs.record
        def fail_after_start(event, *args, **kwargs):
            if event == 'sync.started':
                return original(event, *args, **kwargs)
            raise OSError('private log error')
        with patch.object(self.app.logs, 'record', side_effect=fail_after_start):
            run = self.sync()
        self.assertEqual(run['state'], 'error')
        self.assertTrue(run['recoverable'])
        self.assertIn('操作记录', run['errorMessage'])
        self.assertFalse(self.app.store.rows("SELECT id FROM runs WHERE state='syncing'"))


if __name__ == '__main__':
    unittest.main()
