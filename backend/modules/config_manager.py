"""9. Sole writer of the versioned business configuration file."""
import copy
import json
import os
import re
import tempfile
import threading
from pathlib import Path
from urllib.parse import urlsplit
from ..models import Fault, iso
from ..scheduling import validate_schedule
from ..intervals import exclusive_end

SENSITIVE = re.compile(r'secret|token|password|internal.?path|authorization|credential', re.I)


def defaults(demo=False):
    return {
        'schemaVersion': 2, 'version': 1, 'updatedAt': iso(),
        'schedule': {'enabled': False, 'kind': 'daily', 'time': '09:00', 'timezone': 'Asia/Shanghai'},
        'warnings': {'intervals': []},
        'notifications': {'enabled': False},
        'integrations': {'mode': 'simulation' if demo else 'unconfigured', 'sourceUrl': '', 'workflowUrl': '', 'tableId': 'demo-table' if demo else '', 'uniqueKey': 'id', 'managedFields': ['title', 'status', 'ageDays']},
        'logging': {'level': 'INFO'},
    }


def validate(config):
    def require(condition, message):
        if not condition:
            raise Fault('INVALID_CONFIG', message)
    try:
        require(set(config) == {'schemaVersion', 'version', 'updatedAt', 'schedule', 'warnings', 'notifications', 'integrations', 'logging'}, '配置结构无效。')
        require(type(config['version']) is int and config['version'] > 0, '配置版本无效。')
        require(type(config['schemaVersion']) is int and config['schemaVersion'] == 2, '配置格式版本无效。')
        validate_schedule(config['schedule'])
        require(set(config['notifications']) == {'enabled'} and type(config['notifications']['enabled']) is bool, '推送开关无效。')
        require(set(config['warnings']) == {'intervals'}, '预警配置无效。')
        intervals = config['warnings']['intervals']
        require(isinstance(intervals, list) and len(intervals) <= 50, '预警区间最多 50 个。')
        previous = -1
        for interval in sorted(intervals, key=lambda item: item['minDays']):
            require(set(interval) == {'minDays', 'maxDays'}, '预警区间结构无效。')
            low, high = interval['minDays'], interval['maxDays']
            require(type(low) is int and type(high) is int and 0 <= low <= high <= 365000, '区间需为非负整数，起点不得大于终点。')
            require(low >= previous, '预警范围重叠；区间左闭右开，相同起止天数表示单独一天。')
            previous = exclusive_end(interval)
        integration = config['integrations']
        require(set(integration) == {'mode', 'sourceUrl', 'workflowUrl', 'tableId', 'uniqueKey', 'managedFields'}, '集成配置结构无效。')
        require(integration['mode'] in ('unconfigured', 'simulation', 'custom'), '集成模式无效。')
        for name in ('sourceUrl', 'workflowUrl', 'tableId', 'uniqueKey'):
            require(isinstance(integration[name], str) and len(integration[name]) <= 1000, '集成参数格式无效。')
        for name in ('sourceUrl', 'workflowUrl'):
            if integration[name]:
                url = urlsplit(integration[name])
                require(url.scheme in ('http', 'https') and bool(url.hostname) and not url.username and not url.password and not url.query and not url.fragment, '连接地址只允许无凭据、无查询参数的 HTTP(S) 地址。')
        require(bool(integration['uniqueKey'].strip()) and not SENSITIVE.search(integration['uniqueKey']), '业务唯一键无效或属于敏感字段。')
        fields = integration['managedFields']
        require(isinstance(fields, list) and 1 <= len(fields) <= 100, '请配置 1 至 100 个系统负责的字段。')
        require(all(isinstance(field, str) and 0 < len(field.strip()) <= 100 and not SENSITIVE.search(field) for field in fields), '字段名无效或包含敏感字段。')
        require(len(fields) == len(set(fields)) and integration['uniqueKey'] not in fields, '负责字段不能重复，也不能包含业务唯一键。')
        require(integration['mode'] == 'unconfigured' or bool(integration['tableId'].strip()), '请填写目标表格标识。')
        require(set(config['logging']) == {'level'} and config['logging']['level'] in ('INFO', 'DEBUG'), '日志级别只能为 INFO 或 DEBUG。')
    except (KeyError, TypeError, ValueError, AttributeError):
        raise Fault('INVALID_CONFIG', '配置结构或字段类型无效。')


class ConfigManager:
    def __init__(self, path, demo=False):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.lock = threading.RLock()
        self.migrated = False
        if self.path.exists():
            try:
                config = json.loads(self.path.read_text(encoding='utf-8'))
                if 'schemaVersion' not in config:
                    old = copy.deepcopy(config)
                    schedule = config['schedule']
                    if (set(schedule) != {'enabled', 'intervalMinutes'} or type(schedule['enabled']) is not bool
                            or type(schedule['intervalMinutes']) is not int or not 1 <= schedule['intervalMinutes'] <= 525600
                            or type(config['version']) is not int or config['version'] < 1):
                        raise ValueError()
                    config.update(schemaVersion=2, version=config['version'] + 1, updatedAt=iso(),
                                  schedule=defaults()['schedule'])
                    validate(config)
                    # Reject corrupt legacy ranges rather than treating them as valid under new semantics.
                    previous = -1
                    for interval in sorted(config['warnings']['intervals'], key=lambda item: item['minDays']):
                        if interval['minDays'] <= previous:
                            raise ValueError()
                        previous = interval['maxDays']
                    self._atomic(self.path.with_suffix('.json.pre-v2.bak'), old)
                    self._atomic(self.path, config)
                    self.migrated = True
                validate(config)
            except Exception:
                raise Fault('CONFIG_CORRUPT', '配置文件无效；服务已停止启动，请检查配置及备份。', 500)
            self.current = config
        else:
            self.current = defaults(demo)
            self._atomic(self.path, self.current)

    @staticmethod
    def _atomic(path, value):
        temporary = None
        try:
            with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', dir=path.parent, delete=False) as stream:
                temporary = stream.name
                json.dump(value, stream, ensure_ascii=False, indent=2, allow_nan=False)
                stream.flush()
                os.fsync(stream.fileno())
            os.replace(temporary, path)
        finally:
            if temporary and os.path.exists(temporary):
                os.unlink(temporary)

    def snapshot(self):
        with self.lock:
            return copy.deepcopy(self.current)

    def update(self, section, value, expected_version):
        with self.lock:
            if section not in ('schedule', 'warnings', 'notifications', 'integrations', 'logging'):
                raise Fault('INVALID_CONFIG', '不支持的配置分区。')
            if type(expected_version) is not int or expected_version != self.current['version']:
                raise Fault('CONFIG_CONFLICT', '配置已被更新，请刷新后重新修改。', 409)
            candidate = copy.deepcopy(self.current)
            candidate[section] = copy.deepcopy(value)
            candidate['version'] += 1
            candidate['updatedAt'] = iso()
            validate(candidate)
            candidate['warnings']['intervals'].sort(key=lambda item: item['minDays'])
            try:
                self._atomic(self.path.with_suffix('.json.bak'), self.current)
                self._atomic(self.path, candidate)
            except OSError:
                raise Fault('CONFIG_SAVE_FAILED', '配置保存失败，原配置保持不变。', 500)
            self.current = candidate
            return copy.deepcopy(candidate)
