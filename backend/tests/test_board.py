import tempfile
import unittest
from urllib.parse import urlencode
from backend.app import Application
from backend.models import Fault


class BoardTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.app = Application(self.temp.name, demo=True)

    def tearDown(self):
        self.app.close()
        self.temp.cleanup()

    def records(self, **query):
        return self.app.api.handle('GET', '/api/exo/board/records?' + urlencode(query))

    def tasks(self, record='demo-record-001', **query):
        return self.app.api.handle('GET', f'/api/exo/board/records/{record}/tasks?' + urlencode(query))

    def test_matches_all_roles_and_counts_unique_parents(self):
        # Chen is primary on task 2 and secondary on task 3 of the same parent.
        page = self.records(personId='member-02')
        first = next(r for r in page['items'] if r['recordId'] == 'demo-record-001')
        self.assertEqual(first['matchedRoles'], ['primary', 'secondary'])
        self.assertEqual(first['taskSummary'], {'total': 3, 'completed': 1, 'matched': 2,
                                              'latestUpdatedAt': self.app.board.updated_at})
        self.assertEqual(len({r['number'] for r in page['items']}), page['total'])
        directory = self.app.api.handle('GET', '/api/exo/board/people')
        self.assertEqual(directory['items'][1]['recordCount'], page['total'])

    def test_filters_before_parent_pagination(self):
        total = self.records(personId='member-01')['total']
        first = self.records(personId='member-01', page=1, pageSize=2)
        second = self.records(personId='member-01', page=2, pageSize=2)
        self.assertEqual(first['total'], total)
        self.assertEqual(second['total'], total)
        self.assertTrue({r['recordId'] for r in first['items']}.isdisjoint(r['recordId'] for r in second['items']))
        closed = self.records(personId='member-01', status='closed')
        self.assertTrue(all(r['status'] == '已关闭' for r in closed['items']))
        self.assertEqual(closed['stats']['total'], total)
        self.assertEqual(self.records(personId='member-12')['total'], 0)

    def test_tasks_are_loaded_separately_and_scoped_by_role(self):
        record = self.records(search='优化装配流程')['items'][0]
        self.assertNotIn('tasks', record)
        self.assertNotIn('taskNumber', record)
        self.assertEqual(len(record), 18)  # 15 public fields, ID, summary, matched roles.
        self.assertEqual(self.tasks(personId='member-01')['total'], 3)  # Creator sees all.
        related = self.tasks(personId='member-02')
        self.assertEqual(related['total'], 2)
        self.assertEqual([t['taskId'] for t in related['items']], ['demo-task-001-02', 'demo-task-001-03'])
        self.assertEqual(self.tasks(personId='member-02', scope='all')['total'], 3)
        self.assertEqual(self.tasks(personId='member-05')['total'], 1)
        self.assertEqual(self.tasks(personId='member-12')['total'], 0)

    def test_task_pagination_never_splits_parent_records(self):
        first = self.tasks('demo-record-002', pageSize=5)
        second = self.tasks('demo-record-002', pageSize=5, page=2)
        self.assertEqual(first['total'], 7)
        self.assertEqual(len(first['items']), 5)
        self.assertEqual(len(second['items']), 2)
        self.assertTrue({t['taskId'] for t in first['items']}.isdisjoint(t['taskId'] for t in second['items']))
        number = second['items'][1]['taskNumber']
        parents = self.records(search=number)
        self.assertEqual(parents['total'], 1)
        self.assertEqual(parents['items'][0]['recordId'], 'demo-record-002')
        self.assertEqual(self.tasks('demo-record-007')['total'], 0)

    def test_validation_and_read_only_boundary(self):
        for query in ({'personId': '林悦'}, {'pageSize': 101}, {'status': 'bad'}, {'search': 'a' * 101}):
            with self.subTest(query=query), self.assertRaises(Fault):
                self.records(**query)
        for query in ({'personId': 'invalid'}, {'scope': 'bad'}, {'pageSize': 101}):
            with self.subTest(query=query), self.assertRaises(Fault):
                self.tasks(**query)
        with self.assertRaises(Fault) as caught:
            self.tasks('not-found')
        self.assertEqual(caught.exception.status, 404)
        for path in ('records', 'records/demo-record-001/tasks'):
            with self.assertRaises(Fault):
                self.app.api.handle('GET', '/api/exo/board/' + path + '?personId=member-01&personId=member-02')
            with self.assertRaises(Fault):
                self.app.api.handle('POST', '/api/exo/board/' + path, {})
        self.assertEqual(self.app.store.runs(), [])

    def test_real_mode_never_returns_demo_data(self):
        config = self.app.config.snapshot()
        self.app.config.update('integrations', {**config['integrations'], 'mode': 'unconfigured'}, config['version'])
        for endpoint in ('people', 'records', 'records/demo-record-001/tasks'):
            with self.subTest(endpoint=endpoint), self.assertRaises(Fault) as caught:
                self.app.api.handle('GET', '/api/exo/board/' + endpoint)
            self.assertEqual(caught.exception.code, 'BOARD_NOT_READY')
