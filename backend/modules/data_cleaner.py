"""3. Validate normalized, owned fields. Domain formulas stay in the source adapter."""
import json
import math
from ..models import Fault, NormalizedRecord


class DataCleaner:
    def clean(self, rows, adapter, config):
        records = {}
        fields = set(config['integrations']['managedFields'])
        for row in rows:
            try:
                record = adapter.normalize(row, config)
                valid = (isinstance(record, NormalizedRecord) and isinstance(record.key, str) and
                         0 < len(record.key) <= 500 and isinstance(record.fields, dict) and set(record.fields) == fields)
                if not valid:
                    raise ValueError()
                for value in record.fields.values():
                    if value is not None and type(value) not in (str, int, float, bool):
                        raise ValueError()
                    if isinstance(value, float) and not math.isfinite(value):
                        raise ValueError()
                    if isinstance(value, str) and len(value) > 100_000:
                        raise ValueError()
                if record.warning_days is not None and (type(record.warning_days) is not int or record.warning_days < 0):
                    raise ValueError()
                item = {'key': record.key, 'fields': record.fields, 'warningDays': record.warning_days}
                json.dumps(item, allow_nan=False)
                if record.key in records and records[record.key] != item:
                    raise Fault('DUPLICATE_KEY_CONFLICT', '源数据存在相同业务键的冲突记录，已停止写入。', 422)
                records[record.key] = item
            except Fault:
                raise
            except Exception:
                raise Fault('DATA_INVALID', '数据清洗或有效性校验失败，未执行表格写入。', 422) from None
        return list(records.values())
