import copy
import json
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch
from backend.app import Application
from backend.models import Fault, iso
from backend.modules.config_manager import defaults, validate, ConfigManager
from backend.intervals import matches_day
from backend.scheduling import next_occurrence, validate_schedule


def instant(value):
    return datetime.fromisoformat(value.replace('Z', '+00:00'))


def schedule(kind='daily', **extra):
    return {'enabled':True, 'kind':kind, 'time':'09:00', 'timezone':'Asia/Shanghai', **extra}


class CalendarRulesTests(unittest.TestCase):
    def test_daily_fixed_clock_and_exact_boundary(self):
        value = schedule()
        self.assertEqual(iso(next_occurrence(value, instant('2026-11-03T00:59:59Z'))), '2026-11-03T01:00:00Z')
        self.assertEqual(iso(next_occurrence(value, instant('2026-11-03T01:00:00Z'))), '2026-11-04T01:00:00Z')
        self.assertEqual(iso(next_occurrence(value, instant('2026-11-03T03:25:00Z'))), '2026-11-04T01:00:00Z')

    def test_weekly_does_not_become_a_rolling_seven_days(self):
        value = schedule('weekly', weekday=1)
        self.assertEqual(iso(next_occurrence(value, instant('2026-11-03T03:00:00Z'))), '2026-11-09T01:00:00Z')
        self.assertEqual(iso(next_occurrence(value, instant('2026-11-09T01:00:00Z'))), '2026-11-16T01:00:00Z')

    def test_month_end_leap_year_and_year_rollover(self):
        value = schedule('monthly', monthDay=31)
        for before, expected in [
            ('2026-01-31T01:00:00Z', '2026-02-28T01:00:00Z'),
            ('2028-01-31T01:00:00Z', '2028-02-29T01:00:00Z'),
            ('2028-02-29T01:00:00Z', '2028-03-31T01:00:00Z'),
            ('2026-12-31T01:00:00Z', '2027-01-31T01:00:00Z'),
        ]:
            self.assertEqual(iso(next_occurrence(value, instant(before))), expected)

    def test_every_n_days_preserves_anchor_after_downtime(self):
        value = schedule('interval', intervalDays=3, startDate='2026-11-01')
        self.assertEqual(iso(next_occurrence(value, instant('2026-10-30T02:00:00Z'))), '2026-11-01T01:00:00Z')
        self.assertEqual(iso(next_occurrence(value, instant('2026-11-04T01:00:00Z'))), '2026-11-07T01:00:00Z')
        self.assertEqual(iso(next_occurrence(value, instant('2026-11-17T07:00:00Z'))), '2026-11-19T01:00:00Z')

    def test_invalid_schedule_never_enters_config(self):
        cases = [
            {'enabled':True,'intervalMinutes':1},
            schedule(time='24:00'), schedule(time='9:00'),
            schedule('weekly', weekday=True), schedule('weekly', weekday=0),
            schedule('monthly', monthDay=32),
            schedule('interval', intervalDays=0, startDate='2026-11-01'),
            schedule('interval', intervalDays=1.5, startDate='2026-11-01'),
            schedule('interval', intervalDays=3, startDate='2026-02-30'),
            schedule('interval', intervalDays=3, startDate='20261101'),
        ]
        for value in cases:
            with self.subTest(value=value), self.assertRaises(Fault):
                validate_schedule(value)

    def test_half_open_adjacent_and_single_day_rules(self):
        ranges = [{'minDays':0,'maxDays':7},{'minDays':7,'maxDays':7},{'minDays':8,'maxDays':14}]
        value = defaults()
        value['warnings']['intervals'] = ranges
        validate(value)
        for day, expected in [(0,[0]),(6,[0]),(7,[1]),(8,[2]),(13,[2]),(14,[])]:
            self.assertEqual([i for i,r in enumerate(ranges) if matches_day(day,r)], expected)

    def test_overlap_checks_singletons_and_containment(self):
        for intervals in [
            [{'minDays':0,'maxDays':8},{'minDays':7,'maxDays':7}],
            [{'minDays':7,'maxDays':7},{'minDays':7,'maxDays':14}],
            [{'minDays':0,'maxDays':20},{'minDays':2,'maxDays':5}],
            [{'minDays':7,'maxDays':7},{'minDays':7,'maxDays':7}],
        ]:
            value = defaults()
            value['warnings']['intervals'] = intervals
            with self.assertRaises(Fault):
                validate(value)

    def test_legacy_config_backed_up_migrates_once_and_disables_minutes(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'config.json'
            old = defaults(True)
            del old['schemaVersion']
            old['schedule'] = {'enabled':True, 'intervalMinutes':120}
            old['warnings']['intervals'] = [{'minDays':0,'maxDays':7}]
            path.write_text(json.dumps(old), encoding='utf-8')
            manager = ConfigManager(path)
            self.assertTrue(manager.migrated)
            self.assertEqual(manager.snapshot()['schemaVersion'], 2)
            self.assertFalse(manager.snapshot()['schedule']['enabled'])
            self.assertEqual(manager.snapshot()['warnings'], old['warnings'])
            self.assertEqual(manager.snapshot()['version'], old['version'] + 1)
            self.assertEqual(json.loads(path.with_suffix('.json.pre-v2.bak').read_text(encoding='utf-8')), old)
            self.assertEqual(ConfigManager(path).snapshot(), manager.snapshot())

    def test_failed_migration_preserves_original_file(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'config.json'
            old = defaults(True)
            del old['schemaVersion']
            old['schedule'] = {'enabled':True,'intervalMinutes':60}
            path.write_text(json.dumps(old),encoding='utf-8')
            with patch('backend.modules.config_manager.os.replace',side_effect=OSError()), self.assertRaises(Fault):
                ConfigManager(path)
            self.assertEqual(json.loads(path.read_text(encoding='utf-8')),old)


class CalendarPipelineTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.app = Application(self.temp.name, demo=True)

    def tearDown(self):
        self.app.close()
        self.temp.cleanup()

    def enable(self):
        self.app.config.update('schedule', schedule(), self.app.config.snapshot()['version'])
        self.app.scheduler.reconfigure(instant('2026-11-01T00:00:00Z'))

    def restart(self):
        self.app.close()
        self.app = Application(self.temp.name, demo=True)

    def test_no_lost_slot_when_crashing_before_task_creation(self):
        self.enable()
        due = instant('2026-11-01T01:00:01Z')
        with patch.object(self.app.service, 'trigger', side_effect=SystemExit()), self.assertRaises(SystemExit):
            self.app.scheduler.tick(due)
        self.assertFalse(self.app.store.runs())
        self.assertIsNotNone(self.app.store.get_meta('schedule')['pending'])
        self.restart()
        self.app.scheduler.tick(due)
        run = self.app.store.runs()[0]
        self.app.service.wait(run['runId'])
        self.assertEqual(len(self.app.store.runs()),1)
        self.assertEqual(self.app.store.get_meta('schedule')['nextAt'], '2026-11-02T01:00:00Z')

    def test_no_duplicate_when_crashing_after_task_creation(self):
        self.enable()
        due = instant('2026-11-01T01:00:01Z')
        original = self.app.store.set_meta
        def fail_after_submit(key, value):
            if key == 'schedule' and value.get('lastOutcome') == 'started':
                raise SystemExit()
            original(key,value)
        with patch.object(self.app.store,'set_meta',side_effect=fail_after_submit), self.assertRaises(SystemExit):
            self.app.scheduler.tick(due)
        run = self.app.store.runs()[0]
        self.app.service.wait(run['runId'])
        self.restart()
        self.app.scheduler.tick(due)
        self.assertEqual(len(self.app.store.runs()),1)
        self.assertIsNone(self.app.store.get_meta('schedule')['pending'])

    def test_downtime_catches_up_once_then_returns_to_wall_clock(self):
        self.enable()
        self.app.scheduler.tick(instant('2026-11-10T05:37:00Z'))
        self.app.service.wait(self.app.store.runs()[0]['runId'])
        self.assertEqual(self.app.store.get_meta('schedule')['nextAt'],'2026-11-11T01:00:00Z')
        self.app.scheduler.tick(instant('2026-11-10T05:38:00Z'))
        self.assertEqual(len(self.app.store.runs()),1)

    def test_failed_schedule_is_visible_in_status(self):
        self.enable()
        settings = self.app.config.snapshot()['integrations']
        self.app.config.update('integrations',{**settings,'mode':'unconfigured'},self.app.config.snapshot()['version'])
        self.app.scheduler.tick(instant('2026-11-01T01:00:01Z'))
        self.assertEqual(self.app.service.status()['scheduleInfo']['lastOutcome'],'failed')
        self.assertIsNotNone(self.app.service.status()['scheduleInfo']['message'])

    def test_old_run_snapshot_keeps_legacy_warning_semantics(self):
        self.app.config.update('warnings',{'intervals':[{'minDays':0,'maxDays':3}]},1)
        run_id = self.app.service.trigger(2024)['runId']
        run = self.app.service.wait(run_id)
        self.assertEqual(run['warningCount'],0)  # Demo first record has age 3.
        legacy = copy.deepcopy(run)
        del legacy['config']['schemaVersion']
        self.app.service.notifier.evaluate(legacy)
        self.assertEqual(legacy['warningCount'],1)


if __name__ == '__main__':
    unittest.main()
