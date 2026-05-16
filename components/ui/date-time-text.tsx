'use client';

import { useMemo } from 'react';

import {
  formatKoreanDate,
  formatKoreanDateTime,
  formatKoreanRelativeTime,
  parseDateInput,
  resolveBrowserTimeZone,
  type DateInput,
} from '@/lib/date-time';

type DateTimeTextProps = {
  value: DateInput;
  mode?: 'datetime' | 'date' | 'relative';
  timeZone?: string;
  className?: string;
};

export function DateTimeText({ value, mode = 'datetime', timeZone, className }: DateTimeTextProps) {
  const browserTimeZone = useMemo(
    () => (typeof window === 'undefined' ? null : resolveBrowserTimeZone()),
    [],
  );

  const date = useMemo(() => parseDateInput(value), [value]);

  const effectiveTimeZone = timeZone ?? browserTimeZone ?? 'UTC';

  const text = useMemo(() => {
    if (!date) {
      return '';
    }

    if (mode === 'date') {
      return formatKoreanDate(date, { timeZone: effectiveTimeZone });
    }

    if (mode === 'relative') {
      return formatKoreanRelativeTime(date, { timeZone: effectiveTimeZone });
    }

    return formatKoreanDateTime(date, { timeZone: effectiveTimeZone });
  }, [date, effectiveTimeZone, mode]);

  if (!date) {
    return null;
  }

  return (
    <time className={className} dateTime={date.toISOString()} suppressHydrationWarning>
      {text}
    </time>
  );
}
