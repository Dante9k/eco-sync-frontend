"""5. Warning evaluation is independent of notification delivery."""
from ..models import iso
from ..intervals import matches_day


class WarningNotifier:
    def __init__(self, store, logs):
        self.store, self.logs = store, logs

    def evaluate(self, run):
        intervals = run['config']['warnings']['intervals']
        run['alerts'] = [{'key': row['key'], 'days': row['warningDays'], 'interval': interval}
                         for row in run['records'] if row['warningDays'] is not None
                         for interval in intervals if (matches_day(row['warningDays'], interval) if run['config'].get('schemaVersion', 1) >= 2
                                                      else interval['minDays'] <= row['warningDays'] <= interval['maxDays'])]
        run['warningCount'] = len(run['alerts'])
        self.store.save_run(run)

    def send(self, run, workflow):
        if run['notificationState'] == 'sent':
            return
        if not run['config']['notifications']['enabled'] or not run['alerts']:
            run['notificationState'] = 'disabled' if not run['config']['notifications']['enabled'] else 'none'
            self.store.save_run(run)
            self.logs.record('notification.skipped', run['runId'], run['configVersion'])
            return
        run['notificationState'] = 'sending'
        self.store.save_run(run)
        try:
            workflow.notify(run['alerts'], 'notice:' + run['runId'], run['config'])
        except Exception:
            run['notificationState'] = 'failed'
            run['notificationError'] = '通知发送未确认，可单独重试；已确认的表格写入保留。'
            self.logs.record('notification.failed', run['runId'], run['configVersion'], 'ERROR')
        else:
            run['notificationState'] = 'sent'
            run['notificationError'] = None
            run['notifiedAt'] = iso()
            self.logs.record('notification.sent', run['runId'], run['configVersion'])
        self.store.save_run(run)
