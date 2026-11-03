"""Warning days are integers; equal endpoints represent exactly one day."""
def exclusive_end(interval):
    return interval['maxDays'] if interval['maxDays'] > interval['minDays'] else interval['minDays'] + 1


def matches_day(day, interval):
    return interval['minDays'] <= day < exclusive_end(interval)
