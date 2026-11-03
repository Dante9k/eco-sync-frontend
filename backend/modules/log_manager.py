"""10. Structured audit trail. Never stores raw payloads or exception strings."""
import json
from ..models import iso

MESSAGES = {
    'config.migrated': '已升级为按日调度与左闭右开区间；旧分钟计划已停用，请重新设置自动同步。',
    'config.updated': '配置已保存。', 'sync.started': '同步任务已创建。',
    'sync.resumed': '开始恢复未完成的同步。', 'sync.stage': '同步阶段已更新。',
    'sync.completed': '同步写入已核验完成。', 'sync.failed': '同步未完成，请查看任务状态。',
    'sync.interrupted': '进程中断，任务可在核验后恢复。', 'sync.checkpoint': '写入进度已持久化。',
    'notification.sent': '预警消息已发送。', 'notification.failed': '预警推送失败，可单独重试。',
    'notification.skipped': '本次未发送预警消息。', 'schedule.skipped': '调度到期时目标正忙，本次已跳过。',
    'schedule.failed': '定时任务未能启动，请检查集成配置。',
}


class LogManager:
    def __init__(self, store, config):
        self.store, self.config = store, config

    def record(self, event, run_id=None, config_version=None, level='INFO', section=None):
        if level == 'DEBUG' and self.config.snapshot()['logging']['level'] != 'DEBUG':
            return
        context = {}
        if run_id:
            run = self.store.run(run_id)
            context = {key: run[key] for key in ('stage', 'source', 'outcome', 'counters')}
        if section in ('schedule', 'warnings', 'notifications', 'integrations', 'logging'):
            context['section'] = section
        with self.store.transaction() as db:
            db.execute('INSERT INTO audit(at,level,event,message,run_id,config_version,context) VALUES(?,?,?,?,?,?,?)',
                       (iso(), level, event, MESSAGES[event], run_id, config_version, json.dumps(context)))

    def list(self, page=1, page_size=20, level='', category=''):
        filters, args = [], []
        if level:
            filters.append('level=?')
            args.append(level)
        if category:
            filters.append('event LIKE ?')
            args.append(category + '.%')
        where = ' WHERE ' + ' AND '.join(filters) if filters else ''
        total = self.store.rows('SELECT COUNT(*) AS n FROM audit' + where, args)[0]['n']
        rows = self.store.rows('SELECT * FROM audit' + where + ' ORDER BY id DESC LIMIT ? OFFSET ?', [*args, page_size, (page - 1) * page_size])
        return {'items': [{'id': row['id'], 'at': row['at'], 'level': row['level'], 'event': row['event'], 'message': row['message'], 'runId': row['run_id'], 'configVersion': row['config_version'], 'context': json.loads(row['context'])} for row in rows], 'page': page, 'pageSize': page_size, 'total': total}
