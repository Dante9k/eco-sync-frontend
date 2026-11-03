import type { BusinessConfig, ConfigSection } from '../api/types';
import { intervalEnd, scheduleValidation } from './schedule';
export function validateConfigDraft(draft: BusinessConfig | null, section: ConfigSection | null): string | null {
  if (!draft || !section) return null;
  if (section === 'schedule') return scheduleValidation(draft.schedule);
  if (section === 'warnings') {
    const intervals = draft.warnings.intervals;
    if (intervals.length > 50) return '最多可以设置 50 个提醒区间。';
    for (let index = 0; index < intervals.length; index++) {
      const range = intervals[index];
      if (![range.minDays, range.maxDays].every(value => Number.isInteger(value) && value >= 0 && value <= 365000)) return '区间 ' + (index + 1) + '：请填写 0 至 365000 之间的整数天数。';
      if (range.minDays > range.maxDays) return '区间 ' + (index + 1) + '：结束天数不能小于起始天数。';
      const overlap = intervals.findIndex((other, otherIndex) => otherIndex < index && range.minDays < intervalEnd(other) && intervalEnd(range) > other.minDays);
      if (overlap >= 0) return '区间 ' + (index + 1) + ' 与区间 ' + (overlap + 1) + ' 包含了相同天数，请调整范围。';
    }
  }
  return null;
}
