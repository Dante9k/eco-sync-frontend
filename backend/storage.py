"""Persistence infrastructure, separate from business configuration."""
import json
import os
import sqlite3
import threading
from contextlib import contextmanager
from pathlib import Path
from .models import Fault


class InstanceLock:
    """One backend process per data directory, released by the OS on process exit."""
    def __init__(self, directory):
        Path(directory).mkdir(parents=True, exist_ok=True)
        self.file = open(Path(directory) / 'instance.lock', 'a+b')
        try:
            # Windows denies reads of another handle's locked byte, so inspect size, not contents.
            if os.fstat(self.file.fileno()).st_size == 0:
                self.file.write(b'0')
                self.file.flush()
            self.file.seek(0)
            if os.name == 'nt':
                import msvcrt
                msvcrt.locking(self.file.fileno(), msvcrt.LK_NBLCK, 1)
            else:
                import fcntl
                fcntl.flock(self.file, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError:
            self.file.close()
            raise Fault('INSTANCE_RUNNING', '该数据目录已有后端进程运行。', 409)

    def close(self):
        if not self.file.closed:
            self.file.seek(0)
            if os.name == 'nt':
                import msvcrt
                msvcrt.locking(self.file.fileno(), msvcrt.LK_UNLCK, 1)
            self.file.close()


class Store:
    def __init__(self, path):
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        self.db = sqlite3.connect(path, check_same_thread=False, isolation_level=None)
        self.db.row_factory = sqlite3.Row
        self.lock = threading.RLock()
        self.db.executescript('''
          PRAGMA journal_mode=WAL;
          PRAGMA synchronous=FULL;
          PRAGMA busy_timeout=5000;
          CREATE TABLE IF NOT EXISTS runs (id TEXT PRIMARY KEY, target TEXT NOT NULL, state TEXT NOT NULL, document TEXT NOT NULL);
          CREATE UNIQUE INDEX IF NOT EXISTS one_active_target ON runs(target) WHERE state='syncing';
          CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT NOT NULL, level TEXT NOT NULL, event TEXT NOT NULL, message TEXT NOT NULL, run_id TEXT, config_version INTEGER);
          CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
          CREATE TABLE IF NOT EXISTS simulation_records (target TEXT, key TEXT, fields TEXT NOT NULL, PRIMARY KEY(target,key));
          CREATE TABLE IF NOT EXISTS simulation_operations (id TEXT PRIMARY KEY);
          CREATE TABLE IF NOT EXISTS simulation_messages (id TEXT PRIMARY KEY, payload TEXT NOT NULL);
        ''')
        if 'schedule_key' not in {row['name'] for row in self.db.execute('PRAGMA table_info(runs)')}:
            self.db.execute('ALTER TABLE runs ADD COLUMN schedule_key TEXT')
        self.db.execute('CREATE UNIQUE INDEX IF NOT EXISTS one_run_per_schedule_slot ON runs(schedule_key) WHERE schedule_key IS NOT NULL')
        if 'context' not in {row['name'] for row in self.db.execute('PRAGMA table_info(audit)')}:
            self.db.execute("ALTER TABLE audit ADD COLUMN context TEXT NOT NULL DEFAULT '{}'")

    @contextmanager
    def transaction(self):
        with self.lock:
            self.db.execute('BEGIN IMMEDIATE')
            try:
                yield self.db
                self.db.execute('COMMIT')
            except BaseException:
                self.db.execute('ROLLBACK')
                raise

    def rows(self, sql, args=()):
        with self.lock:
            return self.db.execute(sql, args).fetchall()

    def create_run(self, run):
        try:
            with self.transaction() as db:
                db.execute('INSERT INTO runs (id,target,state,document,schedule_key) VALUES (?,?,?,?,?)',
                           (run['runId'], run['target'], run['state'], json.dumps(run, ensure_ascii=False), run.get('scheduleKey')))
        except sqlite3.IntegrityError:
            raise Fault('SYNC_IN_PROGRESS', '该目标已有同步任务运行。', 409)

    def save_run(self, run):
        try:
            with self.transaction() as db:
                db.execute('UPDATE runs SET state=?, document=? WHERE id=?', (run['state'], json.dumps(run, ensure_ascii=False), run['runId']))
        except sqlite3.IntegrityError:
            raise Fault('SYNC_IN_PROGRESS', '该目标已有同步任务运行。', 409)

    def run(self, run_id):
        rows = self.rows('SELECT document FROM runs WHERE id=?', (run_id,))
        if not rows:
            raise Fault('RUN_NOT_FOUND', '未找到该次同步。', 404)
        return json.loads(rows[0]['document'])

    def scheduled_run(self, key):
        rows = self.rows('SELECT id FROM runs WHERE schedule_key=?', (key,))
        return rows[0]['id'] if rows else None

    def runs(self):
        return [json.loads(row['document']) for row in self.rows('SELECT document FROM runs ORDER BY rowid DESC')]

    def get_meta(self, key, default=None):
        rows = self.rows('SELECT value FROM meta WHERE key=?', (key,))
        return json.loads(rows[0]['value']) if rows else default

    def set_meta(self, key, value):
        with self.transaction() as db:
            db.execute('INSERT OR REPLACE INTO meta VALUES (?,?)', (key, json.dumps(value)))

    def close(self):
        with self.lock:
            self.db.close()
