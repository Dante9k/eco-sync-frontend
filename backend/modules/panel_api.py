"""1. Validated HTTP-independent routes. All configuration mutations go through one owner."""
import re
from urllib.parse import unquote, urlsplit, parse_qs
from ..models import Fault


class PanelAPI:
    def __init__(self, config, service, scheduler, logs):
        self.config, self.service, self.scheduler, self.logs = config, service, scheduler, logs

    def handle(self, method, url, body=None):
        parsed = urlsplit(url)
        path = parsed.path.rstrip('/')
        query = parse_qs(parsed.query)
        def param(name, default=''):
            values = query.get(name, [default])
            if len(values) != 1:
                raise Fault('INVALID_QUERY', '查询参数不能重复。')
            return values[0]
        def pagination():
            try:
                page, size = int(param('page', '1')), int(param('pageSize', '20'))
                if not 1 <= page <= 1_000_000 or not 1 <= size <= 100:
                    raise ValueError()
                return page, size
            except ValueError:
                raise Fault('INVALID_PAGINATION', '分页参数无效，pageSize 上限为 100。') from None
        if method == 'GET':
            if path == '/api/exo/config':
                return self.config.snapshot()
            if path == '/api/exo/status':
                return self.service.status()
            if path == '/api/exo/history':
                state = param('state')
                if state not in ('', 'idle', 'syncing', 'success', 'error'):
                    raise Fault('INVALID_STATE', '状态筛选无效。')
                return self.service.history(*pagination(), state)
            if path.startswith('/api/exo/diff/'):
                return self.service.diff(unquote(path.removeprefix('/api/exo/diff/')), *pagination())
            if path == '/api/exo/logs':
                level, category = param('level'), param('category')
                if level not in ('', 'INFO', 'DEBUG', 'ERROR') or category not in ('', 'config', 'sync', 'notification', 'schedule'):
                    raise Fault('INVALID_FILTER', '日志筛选无效。')
                return self.logs.list(*pagination(), level, category)
        if method == 'POST':
            if not isinstance(body, dict):
                raise Fault('INVALID_BODY', '请求体必须是 JSON 对象。')
            if path == '/api/exo/sync':
                if set(body) != {'year'}:
                    raise Fault('YEAR_REQUIRED', '应急同步必须提交年份。')
                return self.service.trigger(body['year'])
            if path.startswith('/api/exo/config/'):
                if set(body) != {'version', 'value'}:
                    raise Fault('INVALID_BODY', '请提交配置版本及配置内容。')
                section = path.removeprefix('/api/exo/config/')
                result = self.config.update(section, body['value'], body['version'])
                self.logs.record('config.updated', config_version=result['version'], section=section)
                if section == 'schedule':
                    self.scheduler.reconfigure()
                return result
            match = re.fullmatch(r'/api/exo/runs/([^/]+)/(resume|notifications/retry)', path)
            if match:
                if body:
                    raise Fault('INVALID_BODY', '该操作不接受额外参数。')
                run_id, action = unquote(match[1]), match[2]
                return self.service.resume(run_id) if action == 'resume' else self.service.retry_notification(run_id)
        raise Fault('NOT_FOUND', '未找到该接口。', 404)
