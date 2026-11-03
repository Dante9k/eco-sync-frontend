"""Adapter registry and persistent simulation. Real protocols are supplied by deployment."""
import json
from .models import Fault, NormalizedRecord, SourcePage


class SimulationSource:
    def fetch_page(self, time_range, cursor, config):
        start = int(cursor or '0')
        rows = [{'id': f"EXO-{time_range['year']}-{i:03}", 'title': f'模拟变更单 {i:03}',
                 'status': '处理中' if i % 3 else '待确认', 'ageDays': i * 3} for i in range(1, 13)]
        end = min(start + 5, len(rows))
        return SourcePage(rows[start:end], len(rows), str(end) if end < len(rows) else None)

    def normalize(self, record, config):
        settings = config['integrations']
        return NormalizedRecord(str(record[settings['uniqueKey']]),
                                {name: record[name] for name in settings['managedFields']}, record['ageDays'])


class SimulationWorkflow:
    capabilities = {'business_key_upsert', 'idempotent_operations', 'authoritative_read', 'conditional_write', 'idempotent_notifications'}

    def __init__(self, store):
        self.store = store

    def check_access(self, config):
        if not config['integrations']['tableId']:
            raise Fault('TARGET_REQUIRED', '请配置目标表格。')

    def read(self, keys, config):
        target = config['integrations']['tableId']
        result = {}
        for key in keys:
            rows = self.store.rows('SELECT fields FROM simulation_records WHERE target=? AND key=?', (target, key))
            result[key] = json.loads(rows[0]['fields']) if rows else None
        return result

    def write_batch(self, operations, config):
        target = config['integrations']['tableId']
        # Each item commits independently to exercise the same recovery model as a remote workflow.
        for op in operations:
            with self.store.transaction() as db:
                if db.execute('SELECT 1 FROM simulation_operations WHERE id=?', (op['operationId'],)).fetchone():
                    continue
                row = db.execute('SELECT fields FROM simulation_records WHERE target=? AND key=?', (target, op['key'])).fetchone()
                current = json.loads(row['fields']) if row else None
                projection = None if current is None else {key: current.get(key) for key in op['after']}
                if projection != op['before']:
                    raise Fault('TARGET_CONFLICT', '目标受管字段已变化，请核对后重新同步。', 409)
                merged = {**(current or {}), **op['after']}
                db.execute('INSERT OR REPLACE INTO simulation_records VALUES (?,?,?)', (target, op['key'], json.dumps(merged, ensure_ascii=False)))
                db.execute('INSERT INTO simulation_operations VALUES (?)', (op['operationId'],))

    def notify(self, alerts, operation_id, config):
        with self.store.transaction() as db:
            db.execute('INSERT OR IGNORE INTO simulation_messages VALUES (?,?)', (operation_id, json.dumps(alerts, ensure_ascii=False)))


class AdapterRegistry:
    def __init__(self, store, custom=None):
        self.simulation = (SimulationSource(), SimulationWorkflow(store))
        self.custom = custom

    def ready(self, config):
        mode = config['integrations']['mode']
        return mode == 'simulation' or (mode == 'custom' and self.custom is not None)

    def resolve(self, config):
        mode = config['integrations']['mode']
        if mode == 'simulation':
            return self.simulation
        if mode == 'custom' and self.custom is not None:
            return self.custom
        raise Fault('INTEGRATION_NOT_READY', '真实集成适配器尚未安装；请先完成集成配置，或使用模拟模式验证。', 409)
