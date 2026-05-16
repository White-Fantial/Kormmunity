import test from 'node:test';
import assert from 'node:assert/strict';

import { formatKoreanDateTime } from '../lib/date-time.ts';

test('UTC timestamp formats correctly for a viewer timezone', () => {
  const utcTimestamp = '2026-05-16T14:59:00.000Z';
  const formatted = formatKoreanDateTime(utcTimestamp, { timeZone: 'Asia/Seoul' });

  assert.match(formatted, /2026\.\s*5\.\s*16\./);
  assert.ok(formatted.includes('오후 11:59'));
});

test('PM display uses 오후 and not 오전', () => {
  const utcTimestamp = '2026-05-16T14:00:00.000Z';
  const formatted = formatKoreanDateTime(utcTimestamp, { timeZone: 'Asia/Seoul' });

  assert.ok(formatted.includes('오후'));
  assert.ok(!formatted.includes('오전'));
});
