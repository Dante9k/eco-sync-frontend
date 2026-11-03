"""4. Durable plans; conditional owned-field upserts; authoritative per-item verification."""
import uuid
from ..models import Fault


def project(value, names):
    if value is None:
        return None
    if not isinstance(value, dict):
        raise Fault('VERIFY_INVALID', '目标数据格式异常，无法核验写入。', 502)
    return {name: value.get(name) for name in names}


def read_checked(workflow, keys, config):
    current = workflow.read(keys, config)
    if not isinstance(current, dict) or set(current) != set(keys):
        raise Fault('VERIFY_INCOMPLETE', '目标读取不完整，已停止写入。', 502)
    return current


class BitableWriter:
    BATCH_SIZE = 20

    def plan(self, records, workflow, config):
        operations, unchanged = [], 0
        for start in range(0, len(records), self.BATCH_SIZE):
            batch = records[start:start + self.BATCH_SIZE]
            current = read_checked(workflow, [r['key'] for r in batch], config)
            for record in batch:
                before = project(current[record['key']], record['fields'])
                if before == record['fields']:
                    unchanged += 1
                    continue
                operations.append({'operationId': uuid.uuid4().hex, 'key': record['key'],
                                   'kind': 'added' if before is None else 'updated', 'before': before,
                                   'after': record['fields'], 'state': 'pending'})
        return operations, unchanged

    def execute(self, run, workflow, checkpoint):
        config = run['config']
        pending = [op for op in run['operations'] if op['state'] != 'confirmed']
        for start in range(0, len(pending), self.BATCH_SIZE):
            batch = pending[start:start + self.BATCH_SIZE]
            current = read_checked(workflow, [op['key'] for op in batch], config)
            to_write = []
            for op in batch:
                actual = project(current[op['key']], op['after'])
                if actual == op['after']:
                    op['state'] = 'confirmed'
                elif actual == op['before']:
                    to_write.append(op)
                else:
                    checkpoint(run)
                    raise Fault('TARGET_CONFLICT', '目标受管字段已变化，已停止覆盖；请核对后发起新任务。', 409)
            checkpoint(run)
            if not to_write:
                continue
            # A transport failure may happen after the remote side committed. Always reconcile.
            write_error = None
            try:
                workflow.write_batch(to_write, config)
            except Exception as error:
                write_error = error
            actual = read_checked(workflow, [op['key'] for op in to_write], config)
            conflicted = False
            for op in to_write:
                value = project(actual[op['key']], op['after'])
                if value == op['after']:
                    op['state'] = 'confirmed'
                elif value != op['before']:
                    conflicted = True
            checkpoint(run)
            if any(op['state'] != 'confirmed' for op in to_write):
                if conflicted or isinstance(write_error, Fault) and write_error.code == 'TARGET_CONFLICT':
                    raise Fault('TARGET_CONFLICT', '目标内容已被其他操作修改，已停止覆盖；请核对后发起新同步。', 409)
                raise Fault('WRITE_PARTIAL', '部分写入尚未确认；可恢复任务，仅处理未完成项。', 502)
