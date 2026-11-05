"""Application composition and loopback HTTP host; not a business module."""
import json
import mimetypes
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit, unquote
from .adapters import AdapterRegistry
from .board import BoardReader
from .models import Fault, public_error
from .storage import InstanceLock, Store
from .modules.config_manager import ConfigManager
from .modules.log_manager import LogManager
from .modules.sync_service import SyncService
from .modules.scheduler import Scheduler
from .modules.panel_api import PanelAPI


class Application:
    def __init__(self, data_dir, demo=False, custom=None):
        directory = Path(data_dir)
        self.instance = InstanceLock(directory)
        try:
            self.config = ConfigManager(directory / 'config.json', demo)
            self.store = Store(directory / 'state.sqlite3')
            self.registry = AdapterRegistry(self.store, custom)
            self.logs = LogManager(self.store, self.config)
            if self.config.migrated:
                self.logs.record('config.migrated', config_version=self.config.snapshot()['version'])
            self.service = SyncService(self.store, self.config, self.registry, self.logs)
            self.scheduler = Scheduler(self.store, self.config, self.service, self.logs)
            self.board = BoardReader(self.config)
            self.api = PanelAPI(self.config, self.service, self.scheduler, self.logs, self.board)
        except BaseException:
            if hasattr(self, 'store'):
                self.store.close()
            self.instance.close()
            raise

    def close(self):
        self.scheduler.close()
        self.service.close()
        self.store.close()
        self.instance.close()


def make_server(app, port=8000, dist=None, allowed_origins=()):
    root = Path(dist).resolve() if dist else None
    origins = {f'http://localhost:{port}', f'http://127.0.0.1:{port}',
               'http://localhost:5173', 'http://127.0.0.1:5173', *allowed_origins}

    class Handler(BaseHTTPRequestHandler):
        server_version = 'ExoSync'

        def setup(self):
            super().setup()
            self.connection.settimeout(20)

        def log_message(self, *_):
            pass  # Never emit URLs, headers or payloads to an access log.

        def reply(self, status, content, content_type='application/json; charset=utf-8', cache='no-store'):
            self.send_response(status)
            self.send_header('Content-Type', content_type)
            self.send_header('Content-Length', str(len(content)))
            self.send_header('Cache-Control', cache)
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.send_header('Referrer-Policy', 'same-origin')
            self.send_header('Content-Security-Policy', "default-src 'self'; connect-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; frame-ancestors 'none'; base-uri 'self'")
            self.end_headers()
            if self.command != 'HEAD':
                self.wfile.write(content)

        def dispatch(self):
            try:
                host = self.headers.get('Host', '')
                hostname = urlsplit('http://' + host).hostname
                allowed_hosts = {'localhost', '127.0.0.1'} | {urlsplit(origin).hostname for origin in allowed_origins}
                if hostname not in allowed_hosts:
                    raise Fault('HOST_REJECTED', '请求主机不受信任。', 403)
                path = urlsplit(self.path).path
                if path.startswith('/api') or path.startswith('/admin'):
                    body = None
                    if self.command == 'POST':
                        origin = self.headers.get('Origin')
                        if self.headers.get('X-Requested-With') != 'fetch' or (origin and origin not in origins):
                            raise Fault('ORIGIN_REJECTED', '请求来源验证失败。', 403)
                        if self.headers.get_content_type() != 'application/json' or self.headers.get('Transfer-Encoding'):
                            raise Fault('INVALID_CONTENT_TYPE', '请求必须使用 JSON。', 415)
                        try:
                            length = int(self.headers.get('Content-Length', '0'))
                            if not 0 < length <= 131072:
                                raise ValueError()
                            def reject_constant(_):
                                raise ValueError()
                            body = json.loads(self.rfile.read(length), parse_constant=reject_constant)
                        except (ValueError, UnicodeError):
                            raise Fault('INVALID_JSON', '请求 JSON 无效或超出大小限制。') from None
                    data = app.api.handle(self.command, self.path, body)
                    result = json.dumps({'ok': True, 'data': data}, ensure_ascii=False, allow_nan=False).encode()
                    self.reply(202 if self.command == 'POST' and ('/sync' == path[-5:] or '/runs/' in path) else 200, result)
                    return
                if self.command not in ('GET', 'HEAD'):
                    raise Fault('METHOD_NOT_ALLOWED', '该路径不支持此方法。', 405)
                if not root or not (root / 'index.html').is_file():
                    raise Fault('FRONTEND_NOT_BUILT', '前端尚未构建，请使用 Vite 开发服务或先构建。', 404)
                relative = unquote(path).lstrip('/').replace('\\', '/')
                target = (root / relative).resolve()
                if not target.is_relative_to(root):
                    raise Fault('NOT_FOUND', '未找到该资源。', 404)
                if not target.is_file():
                    if path.startswith('/assets/') or Path(relative).suffix:
                        raise Fault('NOT_FOUND', '未找到该资源。', 404)
                    target = root / 'index.html'
                content_type = mimetypes.guess_type(target.name)[0] or 'application/octet-stream'
                if target.suffix == '.js':
                    content_type = 'application/javascript'
                self.reply(200, target.read_bytes(), content_type, 'public, max-age=31536000, immutable' if path.startswith('/assets/') else 'no-cache')
            except Exception as error:
                fault = public_error(error)
                payload = json.dumps({'ok': False, 'error': {'code': fault.code, 'message': fault.message}}, ensure_ascii=False).encode()
                self.reply(fault.status, payload)

        do_GET = do_POST = do_HEAD = do_PUT = do_DELETE = do_OPTIONS = dispatch

    return ThreadingHTTPServer(('127.0.0.1', port), Handler)
