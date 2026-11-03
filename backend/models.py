"""Shared contracts; integrations implement these protocols, never UI routes."""
from dataclasses import dataclass
from datetime import datetime, timezone, timedelta
from typing import Any, Protocol

SHANGHAI = timezone(timedelta(hours=8))


def utc_now():
    return datetime.now(timezone.utc)


def iso(value=None):
    return (value or utc_now()).astimezone(timezone.utc).isoformat().replace('+00:00', 'Z')


class Fault(Exception):
    def __init__(self, code: str, message: str, status: int = 400):
        super().__init__(message)
        self.code, self.message, self.status = code, message, status


def public_error(error):
    return error if isinstance(error, Fault) else Fault('OPERATION_FAILED', '操作未完成，请检查服务端运行记录。', 500)


def year_range(year: int, now=None):
    now = (now or utc_now()).astimezone(SHANGHAI)
    if isinstance(year, bool) or not isinstance(year, int) or not 1970 <= year <= now.year:
        raise Fault('INVALID_YEAR', f'年份必须在 1970 至 {now.year} 之间。')
    start = datetime(year, 1, 1, tzinfo=SHANGHAI)
    end = datetime(year + 1, 1, 1, tzinfo=SHANGHAI) if year < now.year else now.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
    return {'year': year, 'startInclusive': iso(start), 'endExclusive': iso(end), 'timezone': 'Asia/Shanghai'}


@dataclass(frozen=True)
class SourcePage:
    records: list[dict]
    total: int
    next_cursor: str | None = None
    complete: bool = True


@dataclass(frozen=True)
class NormalizedRecord:
    key: str
    fields: dict[str, Any]
    warning_days: int | None = None


class SourceAdapter(Protocol):
    def fetch_page(self, time_range: dict, cursor: str | None, config: dict) -> SourcePage: ...
    def normalize(self, record: dict, config: dict) -> NormalizedRecord: ...


class WorkflowAdapter(Protocol):
    # Required: unique business-key upsert, operation-key deduplication, authoritative read-back.
    capabilities: set[str]
    def check_access(self, config: dict) -> None: ...
    def read(self, keys: list[str], config: dict) -> dict[str, dict | None]: ...
    def write_batch(self, operations: list[dict], config: dict) -> None: ...
    def notify(self, alerts: list[dict], operation_id: str, config: dict) -> None: ...
