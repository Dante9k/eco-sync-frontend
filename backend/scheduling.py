"""Calendar rules shared by configuration validation and the durable scheduler."""
import calendar
import re
from datetime import date, datetime, timedelta
from .models import Fault, SHANGHAI


def validate_schedule(value):
    if not isinstance(value, dict):
        raise Fault('INVALID_CONFIG', '自动同步配置无效。')
    kind = value.get('kind')
    extra = {'daily': set(), 'weekly': {'weekday'}, 'monthly': {'monthDay'},
             'interval': {'intervalDays', 'startDate'}}
    if (kind not in extra or set(value) != {'enabled', 'kind', 'time', 'timezone'} | extra[kind]
            or type(value['enabled']) is not bool or value['timezone'] != 'Asia/Shanghai'
            or not isinstance(value['time'], str) or not re.fullmatch(r'(?:[01]\d|2[0-3]):[0-5]\d', value['time'])):
        raise Fault('INVALID_CONFIG', '请选择按天的同步周期和有效执行时间（北京时间）。')
    def integer(name, low, high):
        if type(value[name]) is not int or not low <= value[name] <= high:
            raise Fault('INVALID_CONFIG', '自动同步的日期或天数无效。')
    if kind == 'weekly':
        integer('weekday', 1, 7)
    if kind == 'monthly':
        integer('monthDay', 1, 31)
    if kind == 'interval':
        integer('intervalDays', 1, 365)
        try:
            start = date.fromisoformat(value['startDate'])
            if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', value['startDate']) or not 1970 <= start.year <= 9998:
                raise ValueError()
        except (ValueError, TypeError):
            raise Fault('INVALID_CONFIG', '请选择有效的首次执行日期。') from None


def next_occurrence(schedule, after):
    """First slot strictly after after, using fixed Shanghai civil dates; never drifts."""
    validate_schedule(schedule)
    local = after.astimezone(SHANGHAI)
    hour, minute = map(int, schedule['time'].split(':'))
    candidate = local.replace(hour=hour, minute=minute, second=0, microsecond=0)
    kind = schedule['kind']
    if kind == 'daily':
        return candidate if candidate > local else candidate + timedelta(days=1)
    if kind == 'weekly':
        candidate += timedelta(days=(schedule['weekday'] - local.isoweekday()) % 7)
        return candidate if candidate > local else candidate + timedelta(days=7)
    if kind == 'monthly':
        def in_month(year, month):
            return datetime(year, month, min(schedule['monthDay'], calendar.monthrange(year, month)[1]),
                            hour, minute, tzinfo=SHANGHAI)
        candidate = in_month(local.year, local.month)
        if candidate > local:
            return candidate
        return in_month(local.year + (local.month == 12), local.month % 12 + 1)
    anchor = date.fromisoformat(schedule['startDate'])
    days = max(0, (local.date() - anchor).days)
    periods = days // schedule['intervalDays']
    day = anchor + timedelta(days=periods * schedule['intervalDays'])
    candidate = datetime.combine(day, datetime.min.time(), SHANGHAI).replace(hour=hour, minute=minute)
    return candidate if candidate > local else candidate + timedelta(days=schedule['intervalDays'])
