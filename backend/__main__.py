import argparse
import importlib
from pathlib import Path
from .app import Application, make_server
from .models import public_error


def main():
    parser = argparse.ArgumentParser(description='EXO synchronization backend')
    parser.add_argument('--port', type=int, default=8000)
    parser.add_argument('--data-dir')
    parser.add_argument('--demo', action='store_true', help='Initialize a separate persistent simulation workspace')
    parser.add_argument('--dist', default=str(Path(__file__).resolve().parents[1] / 'frontend' / 'dist'))
    parser.add_argument('--adapter-factory', help='Trusted server extension module:function returning (SourceAdapter, WorkflowAdapter)')
    parser.add_argument('--allowed-origin', action='append', default=[], help='Explicit authenticated reverse-proxy origin')
    args = parser.parse_args()
    custom = None
    if args.adapter_factory:
        module, function = args.adapter_factory.split(':', 1)
        custom = getattr(importlib.import_module(module), function)()
        if not isinstance(custom, tuple) or len(custom) != 2:
            parser.error('Adapter factory must return a pair of adapters')
    app = Application(args.data_dir or ('.local/demo' if args.demo else '.local/backend'), args.demo, custom)
    try:
        server = make_server(app, args.port, args.dist, args.allowed_origin)
        app.scheduler.start()
        print(f'EXO backend listening at http://127.0.0.1:{args.port} (mode={app.config.snapshot()["integrations"]["mode"]})', flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
        finally:
            server.server_close()
    finally:
        app.close()


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(public_error(error).message)
        raise SystemExit(1) from None
