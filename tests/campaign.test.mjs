import test from 'node:test';
import assert from 'node:assert/strict';
import { DARWIN_ARRIVAL_AT, darwinCountdown } from '../src/war/campaign.ts';

test('Darwin arrival uses a fixed Brasília date and counts down without restarting', () => {
  const arrival = Date.parse(DARWIN_ARRIVAL_AT);
  assert.equal(arrival, Date.parse('2026-11-16T13:47:53Z'));
  assert.deepEqual(darwinCountdown(arrival - 48 * 3600000), { days: 2, hours: 0, minutes: 0, seconds: 0, arrived: false });
  assert.deepEqual(darwinCountdown(arrival - 90061000), { days: 1, hours: 1, minutes: 1, seconds: 1, arrived: false });
  assert.deepEqual(darwinCountdown(arrival - 100), { days: 0, hours: 0, minutes: 0, seconds: 1, arrived: false });
});

test('Darwin countdown stops at zero after its announced date', () => {
  const arrived = { days: 0, hours: 0, minutes: 0, seconds: 0, arrived: true };
  assert.deepEqual(darwinCountdown(Date.parse(DARWIN_ARRIVAL_AT)), arrived);
  assert.deepEqual(darwinCountdown(Date.parse(DARWIN_ARRIVAL_AT) + 86400000), arrived);
});
