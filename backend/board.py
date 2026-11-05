"""Read-only board queries. Parent records and task pages have separate payloads."""
from collections import Counter
from .demo_board import build_demo_board
from .models import Fault


def task_participant_ids(task):
    return {p['id'] for p in [task['taskPrimaryOwner'], *task['taskSecondaryOwners']] if p}


class BoardReader:
    def __init__(self, config):
        self.config = config
        self.people, self.records, self.tasks_by_record, self.updated_at = build_demo_board()
        self.by_id = {record['recordId']: record for record in self.records}
        self.person_ids = {p['id'] for p in self.people}
        self.participants = {}
        self.summaries = {}
        self.search_text = {}
        counts = Counter()
        for record in self.records:
            key = record['recordId']
            tasks = self.tasks_by_record[key]
            ids = {record['creator']['id']} if record['creator'] else set()
            for task in tasks:
                ids.update(task_participant_ids(task))
            self.participants[key] = ids
            counts.update(ids)
            self.summaries[key] = {
                'total': len(tasks), 'completed': sum(t['taskStatus'] == '已完成' for t in tasks),
                'latestUpdatedAt': max((t['taskUpdatedAt'] for t in tasks if t['taskUpdatedAt']), default=None),
            }
            self.search_text[key] = ' '.join([record['number'], record['content'], record['reason'],
                *record['relatedFileNumbers'], *(t['taskNumber'] for t in tasks)]).casefold()
        self.directory_items = [{**p, 'recordCount': counts[p['id']]} for p in self.people]

    def require_ready(self):
        if self.config.snapshot()['integrations']['mode'] != 'simulation':
            raise Fault('BOARD_NOT_READY', '业务看板尚未接入真实数据，请联系管理员完成看板数据接口配置。', 409)

    def validate_person(self, person_id):
        if len(person_id) > 128 or (person_id and person_id not in self.person_ids):
            raise Fault('INVALID_PERSON', '该人员不在当前名单中，请刷新后重新选择。')

    def directory(self):
        self.require_ready()
        return {'items': self.directory_items, 'mode': 'simulation', 'updatedAt': self.updated_at}

    def public_record(self, record, person_id):
        tasks = self.tasks_by_record[record['recordId']]
        roles = []
        if person_id:
            if record['creator'] and record['creator']['id'] == person_id:
                roles.append('creator')
            if any(t['taskPrimaryOwner'] and t['taskPrimaryOwner']['id'] == person_id for t in tasks):
                roles.append('primary')
            if any(any(p['id'] == person_id for p in t['taskSecondaryOwners']) for t in tasks):
                roles.append('secondary')
        matched = sum(person_id in task_participant_ids(t) for t in tasks) if person_id else 0
        return {**record, 'matchedRoles': roles,
                'taskSummary': {**self.summaries[record['recordId']], 'matched': matched}}

    def page(self, page, page_size, person_id='', search='', status='all'):
        self.require_ready()
        self.validate_person(person_id)
        if len(search) > 100 or status not in ('all', 'open', 'closed'):
            raise Fault('INVALID_FILTER', '筛选条件无效。')
        needle = search.strip().casefold()
        records = [r for r in self.records
                   if (not person_id or person_id in self.participants[r['recordId']])
                   and (not needle or needle in self.search_text[r['recordId']])]
        closed = sum(r['status'] == '已关闭' for r in records)
        stats = {'total': len(records), 'open': len(records) - closed, 'closed': closed}
        if status != 'all':
            records = [r for r in records if (r['status'] == '已关闭') == (status == 'closed')]
        start = (page - 1) * page_size
        return {'items': [self.public_record(r, person_id) for r in records[start:start + page_size]],
                'page': page, 'pageSize': page_size, 'total': len(records), 'stats': stats,
                'mode': 'simulation', 'updatedAt': self.updated_at}

    def tasks(self, record_id, page, page_size, person_id='', scope='related'):
        self.require_ready()
        self.validate_person(person_id)
        if scope not in ('related', 'all'):
            raise Fault('INVALID_FILTER', '任务筛选条件无效。')
        record = self.by_id.get(record_id)
        if not record:
            raise Fault('RECORD_NOT_FOUND', '该业务记录不存在，请刷新后重试。', 404)
        items = self.tasks_by_record[record_id]
        creator = record['creator'] and record['creator']['id'] == person_id
        if person_id and scope == 'related' and not creator:
            items = [t for t in items if person_id in task_participant_ids(t)]
        start = (page - 1) * page_size
        return {'recordId': record_id, 'items': items[start:start + page_size], 'page': page,
                'pageSize': page_size, 'total': len(items), 'mode': 'simulation', 'updatedAt': self.updated_at}
