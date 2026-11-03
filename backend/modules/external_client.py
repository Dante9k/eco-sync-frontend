"""2. Bounded, complete pagination; adapters own protocol-specific timeout/decoding."""
from ..models import Fault, SourcePage


class ExternalClient:
    def fetch(self, adapter, time_range, config):
        records, seen, cursor, total = [], set(), None, None
        for _ in range(1000):
            page = adapter.fetch_page(time_range, cursor, config)
            if (not isinstance(page, SourcePage) or page.complete is not True or
                    type(page.total) is not int or not 0 <= page.total <= 100_000 or
                    not isinstance(page.records, list) or any(not isinstance(r, dict) for r in page.records)):
                raise Fault('SOURCE_INCOMPLETE', '源数据不完整或格式异常，已停止写入。', 502)
            if total is not None and total != page.total:
                raise Fault('SOURCE_CHANGED', '拉取期间源端总量发生变化，已停止写入。', 502)
            total = page.total
            records.extend(page.records)
            if len(records) > total:
                raise Fault('SOURCE_INCOMPLETE', '源端数量校验失败，已停止写入。', 502)
            if page.next_cursor is None:
                if len(records) != total:
                    raise Fault('SOURCE_INCOMPLETE', '源数据缺页，已停止写入。', 502)
                return records
            if not isinstance(page.next_cursor, str) or not page.next_cursor or page.next_cursor in seen:
                raise Fault('SOURCE_CURSOR_INVALID', '源端分页无效，已停止写入。', 502)
            seen.add(page.next_cursor)
            cursor = page.next_cursor
        raise Fault('SOURCE_LIMIT', '源端分页超出安全上限，已停止写入。', 502)
