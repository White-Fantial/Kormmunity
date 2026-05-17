'use client';

import { useEffect, useMemo, useState } from 'react';

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
  const [localTimeZone, setLocalTimeZone] = useState<string | null>(null);

  useEffect(() => {
    setLocalTimeZone(timeZone ?? resolveBrowserTimeZone());
  }, [timeZone]);

  const date = useMemo(() => parseDateInput(value), [value]);

  const text = useMemo(() => {
    if (!date || !localTimeZone) {
      return '';
    }

    if (mode === 'date') {
      return formatKoreanDate(date, { timeZone: localTimeZone });
    }

    if (mode === 'relative') {
      return formatKoreanRelativeTime(date, { timeZone: localTimeZone });
    }

    return formatKoreanDateTime(date, { timeZone: localTimeZone });
  }, [date, localTimeZone, mode]);

  if (!date) {
    return null;
  }

  return (
    <time className={className} dateTime={date.toISOString()}>
      {text}
    </time>
  );
}
