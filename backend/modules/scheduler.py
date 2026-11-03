"""6. Durable calendar slots; shared sync pipeline and restart-safe task submission."""
import threading
import uuid
from datetime import datetime
from ..models import Fault, SHANGHAI, iso, utc_now
from ..scheduling import next_occurrence


class Scheduler:
    def __init__(self, store, config, service, logs):
        self.store, self.config, self.service, self.logs = store, config, service, logs
        self.lock = threading.RLock()
        self.stop = threading.Event()
        self.thread = None
        self.reconfigure()

    def reconfigure(self, now=None):
        with self.lock:
            schedule = self.config.snapshot()['schedule']
            saved = self.store.get_meta('schedule', {})
            if saved.get('settings') != schedule:
                self.store.set_meta('schedule', {
                    'settings': schedule, 'nextAt': iso(next_occurrence(schedule, now or utc_now())) if schedule['enabled'] else None,
                    'pending': None, 'lastOutcome': None, 'lastAttemptAt': None, 'message': None,
                })

    def tick(self, now=None):
        now = now or utc_now()
        with self.lock:
            # Consistent lock order prevents a config save racing a due task's snapshot.
            with self.service.lock, self.config.lock:
                self.reconfigure(now)
                saved = self.store.get_meta('schedule')
                if not saved['nextAt'] or now < datetime.fromisoformat(saved['nextAt'].replace('Z', '+00:00')):
                    return
                if not saved.get('pending'):
                    saved['pending'] = {'key': uuid.uuid4().hex, 'at': saved['nextAt']}
                    self.store.set_meta('schedule', saved)
                # Persist the slot before submitting. Reusing its key finds the existing
                # run if the process died after insertion but before advancing nextAt.
                outcome, message = 'started', None
                try:
                    self.service.trigger(now.astimezone(SHANGHAI).year, 'scheduled', now,
                                         schedule_key=saved['pending']['key'])
                except Fault as error:
                    busy = error.code == 'SYNC_IN_PROGRESS'
                    outcome = 'skipped' if busy else 'failed'
                    message = '上次自动同步遇到正在进行的任务，已跳过。' if busy else '上次自动同步未能开始，请检查系统连接或操作记录。'
                    self.logs.record('schedule.skipped' if busy else 'schedule.failed',
                                     level='INFO' if busy else 'ERROR')
                saved.update(nextAt=iso(next_occurrence(saved['settings'], now)), pending=None,
                             lastOutcome=outcome, lastAttemptAt=iso(now), message=message)
                self.store.set_meta('schedule', saved)  # At most one catch-up; retain calendar anchor.

    def start(self):
        def loop():
            while not self.stop.wait(1):
                try:
                    self.tick()
                except Exception:
                    self.logs.record('schedule.failed', level='ERROR')
        self.thread = threading.Thread(target=loop, daemon=True, name='exo-scheduler')
        self.thread.start()

    def close(self):
        self.stop.set()
        if self.thread:
            self.thread.join()
