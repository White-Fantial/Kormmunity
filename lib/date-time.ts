export type DateInput = Date | string | number;

const DEFAULT_LOCALE = 'ko-KR';
const FALLBACK_TIME_ZONE = 'UTC';
const DAY_PERIOD_LABELS: Record<string, string> = {
  AM: '오전',
  PM: '오후',
  am: '오전',
  pm: '오후',
};

type FormatterOptions = {
  locale?: string;
  timeZone?: string;
};

type RelativeFormatterOptions = FormatterOptions & {
  now?: DateInput;
};

export function resolveBrowserTimeZone(): string {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return timeZone || FALLBACK_TIME_ZONE;
}

export function parseDateInput(value: DateInput): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatKoreanDateTime(value: DateInput, options: FormatterOptions = {}): string {
  const date = parseDateInput(value);
  if (!date) return '';

  const formatter = new Intl.DateTimeFormat(options.locale ?? DEFAULT_LOCALE, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: options.timeZone,
  });

  return formatter
    .formatToParts(date)
    .map((part) => (part.type === 'dayPeriod' ? (DAY_PERIOD_LABELS[part.value] ?? part.value) : part.value))
    .join('');
}

export function formatKoreanDate(value: DateInput, options: FormatterOptions = {}): string {
  const date = parseDateInput(value);
  if (!date) return '';

  return new Intl.DateTimeFormat(options.locale ?? DEFAULT_LOCALE, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    timeZone: options.timeZone,
  }).format(date);
}

export function formatKoreanRelativeTime(value: DateInput, options: RelativeFormatterOptions = {}): string {
  const date = parseDateInput(value);
  if (!date) return '';

  const now = parseDateInput(options.now ?? new Date());
  if (!now) return '';

  const diffMs = date.getTime() - now.getTime();
  const absMs = Math.abs(diffMs);

  if (absMs < 60_000) {
    return '방금 전';
  }

  const units: Array<{ unit: Intl.RelativeTimeFormatUnit; ms: number }> = [
    { unit: 'minute', ms: 60_000 },
    { unit: 'hour', ms: 3_600_000 },
    { unit: 'day', ms: 86_400_000 },
  ];

  const relative = new Intl.RelativeTimeFormat(options.locale ?? DEFAULT_LOCALE, {
    numeric: 'auto',
    style: 'short',
  });

  for (let index = 0; index < units.length; index += 1) {
    const current = units[index];
    const next = units[index + 1];
    if (!next || absMs < next.ms) {
      const valueByUnit = Math.round(diffMs / current.ms);
      return relative.format(valueByUnit, current.unit);
    }
  }

  return formatKoreanDateTime(date, options);
}
