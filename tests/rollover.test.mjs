import assert from 'node:assert/strict';
import test from 'node:test';

import {
  calculateRollover,
  DEFAULT_MAX_PREVIEW_ROWS,
  floorToCents,
  formatBRL,
  INSUFFICIENT_LIMIT_MESSAGE,
  INVALID_INPUT_MESSAGE,
  UNSUPPORTED_HORIZON_MESSAGE,
} from '../src/lib/rollover.mjs';

test('matches the supplied 6 percent validation table', () => {
  const result = calculateRollover({
    debt: 1000,
    limit: 1500,
    monthlyCetPercent: 6,
  });

  assert.equal(result.ok, true);
  assert.equal(result.maxSuccessfulMonths, 6);
  assert.equal(result.directFormulaMonths, 6);
  assert.equal(result.finalDebt, 1418.51);
  assert.equal(result.remainingLimit, 81.49);
  assert.equal(result.rows.length, 7);
  assert.equal(formatBRL(result.finalDebt), 'R$ 1.418,51');
  assert.equal(formatBRL(result.remainingLimit), 'R$ 81,49');
  assert.equal(formatBRL(result.rows[1].displayDebt), 'R$ 1.123,60');
  assert.equal(formatBRL(result.rows[6].displayDebt), 'R$ 1.503,63');
  assert.equal(formatBRL(result.rows[6].remainingLimit), '-R$ 3,63');

  assert.deepEqual(
    result.rows.map((row) => [row.month, row.displayDebt, row.status]),
    [
      [1, 1060, 'success'],
      [2, 1123.6, 'success'],
      [3, 1191.01, 'success'],
      [4, 1262.47, 'success'],
      [5, 1338.22, 'success'],
      [6, 1418.51, 'success'],
      [7, 1503.63, 'failed'],
    ],
  );
});

test('blocks when the initial debt exceeds the available limit', () => {
  const result = calculateRollover({
    debt: 2000,
    limit: 1500,
    monthlyCetPercent: 6,
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'insufficient-limit');
  assert.equal(result.message, INSUFFICIENT_LIMIT_MESSAGE);
  assert.deepEqual(result.rows, []);
});

test('allows a rollover that lands exactly on the limit', () => {
  const result = calculateRollover({
    debt: 100,
    limit: 110,
    monthlyCetPercent: 10,
  });

  assert.equal(result.ok, true);
  assert.equal(result.maxSuccessfulMonths, 1);
  assert.equal(result.directFormulaMonths, 1);
  assert.equal(result.finalDebt, 110);
  assert.equal(result.remainingLimit, 0);
  assert.equal(result.nextFailedMonth.month, 2);
  assert.deepEqual(
    result.rows.map((row) => [row.month, row.displayDebt, row.status]),
    [
      [1, 110, 'success'],
      [2, 121, 'failed'],
    ],
  );
});

test('allows multiple rollovers when the last one lands exactly on the limit', () => {
  const result = calculateRollover({
    debt: 100,
    limit: 121,
    monthlyCetPercent: 10,
  });

  assert.equal(result.ok, true);
  assert.equal(result.maxSuccessfulMonths, 2);
  assert.equal(result.directFormulaMonths, 2);
  assert.equal(result.finalDebt, 121);
  assert.equal(result.remainingLimit, 0);
  assert.equal(result.nextFailedMonth.month, 3);
  assert.equal(result.rows.at(-1).status, 'failed');
});

// The logarithmic formula alone is not accurate enough at the boundary: its
// result can miss the correct integer by far more than the integer-snap
// tolerance absorbs. The two cases below fail unless calculateWholeMonths keeps
// reconciling its formula result against the adjacent full-precision
// projections, so they guard that repair in both directions.

test('recovers a whole month the logarithmic formula rounds away', () => {
  // 100 x 1,0002 is exactly 100,02, so month 1 lands on the limit and succeeds.
  // The raw formula returns 0.999999999999801 — off by 2e-13, about 56 times
  // the integer tolerance — so it floors to 0 until the upward reconciliation
  // restores the month that genuinely fits.
  const result = calculateRollover({
    debt: 100,
    limit: 100.02,
    monthlyCetPercent: 0.02,
  });

  assert.equal(result.ok, true);
  assert.equal(result.maxSuccessfulMonths, 1);
  assert.equal(result.finalDebt, 100.02);
  assert.equal(result.remainingLimit, 0);
  assert.equal(result.nextFailedMonth.month, 2);
  assert.equal(result.nextFailedMonth.displayDebt, 100.04);
  assert.deepEqual(
    result.rows.map((row) => [row.month, row.displayDebt, row.status]),
    [
      [1, 100.02, 'success'],
      [2, 100.04, 'failed'],
    ],
  );
});

test('drops a whole month the logarithmic formula rounds up over a long horizon', () => {
  // Month 44 exceeds the limit by a fraction of a cent, so 43 is the answer.
  // The raw formula returns 44; only the downward reconciliation removes the
  // month that does not actually fit.
  const result = calculateRollover({
    debt: 5000,
    limit: 23954704.78,
    monthlyCetPercent: 21.24,
  });

  assert.equal(result.ok, true);
  assert.equal(result.maxSuccessfulMonths, 43);
  assert.equal(result.finalDebt, 19758087.08);
  assert.equal(result.nextFailedMonth.month, 44);
  assert.equal(result.nextFailedMonth.status, 'failed');
  assert.equal(result.rows.at(-1).month, 44);
});

test('calculates the true result beyond the default row preview', () => {
  const result = calculateRollover({
    debt: 1000,
    limit: 1500,
    monthlyCetPercent: 0.01,
  });

  assert.equal(result.ok, true);
  assert.equal(result.maxSuccessfulMonths, 4054);
  assert.equal(result.directFormulaMonths, 4054);
  assert.equal(result.nextFailedMonth.month, 4055);
  assert.equal(result.nextFailedMonth.status, 'failed');
  assert.equal(result.rows.length, DEFAULT_MAX_PREVIEW_ROWS);
  assert.equal(result.rows.at(-1).month, DEFAULT_MAX_PREVIEW_ROWS);
  assert.equal(result.rows.at(-1).status, 'success');
  assert.equal(result.truncated, true);
  assert.deepEqual(result.preview, {
    maxRows: DEFAULT_MAX_PREVIEW_ROWS,
    shownThroughMonth: DEFAULT_MAX_PREVIEW_ROWS,
    includesFirstFailure: false,
    truncated: true,
  });
});

test('rejects zero, negative, non-numeric, and non-finite inputs', () => {
  const valid = { debt: 1000, limit: 1500, monthlyCetPercent: 6 };
  const cases = [
    { ...valid, debt: 0 },
    { ...valid, debt: -1 },
    { ...valid, debt: 'not-a-number' },
    { ...valid, debt: Number.NaN },
    { ...valid, debt: Number.POSITIVE_INFINITY },
    { ...valid, limit: 0 },
    { ...valid, limit: -1 },
    { ...valid, limit: 'not-a-number' },
    { ...valid, limit: Number.NEGATIVE_INFINITY },
    { ...valid, monthlyCetPercent: 0 },
    { ...valid, monthlyCetPercent: -1 },
    { ...valid, monthlyCetPercent: 'not-a-number' },
    { ...valid, monthlyCetPercent: Number.POSITIVE_INFINITY },
  ];

  for (const input of cases) {
    const result = calculateRollover(input);
    assert.equal(result.ok, false, JSON.stringify(input));
    assert.equal(result.reason, 'invalid-input', JSON.stringify(input));
    assert.equal(result.message, INVALID_INPUT_MESSAGE, JSON.stringify(input));
    assert.deepEqual(result.rows, [], JSON.stringify(input));
  }
});

test('reports a valid horizon that exceeds safe integer precision', () => {
  const result = calculateRollover({
    debt: 1,
    limit: 2,
    monthlyCetPercent: 0.000000000000005,
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'unsupported-horizon');
  assert.equal(result.message, UNSUPPORTED_HORIZON_MESSAGE);
  assert.deepEqual(result.rows, []);
});

test('fails in month one when debt starts at the limit', () => {
  const result = calculateRollover({
    debt: 100,
    limit: 100,
    monthlyCetPercent: 10,
  });

  assert.equal(result.ok, true);
  assert.equal(result.maxSuccessfulMonths, 0);
  assert.equal(result.directFormulaMonths, 0);
  assert.equal(result.finalDebt, 100);
  assert.equal(result.remainingLimit, 0);
  assert.equal(result.nextFailedMonth.month, 1);
  assert.equal(result.rows[0].status, 'failed');
  assert.equal(result.truncated, false);
});

test('fails in the first rollover month when the first compounded debt exceeds the limit', () => {
  const result = calculateRollover({
    debt: 100,
    limit: 105,
    monthlyCetPercent: 10,
  });

  assert.equal(result.ok, true);
  assert.equal(result.maxSuccessfulMonths, 0);
  assert.equal(result.nextFailedMonth.month, 1);
  assert.equal(result.rows[0].status, 'failed');
});

test('marks a preview as truncated when successful rows fill its configured cap', () => {
  const result = calculateRollover(
    { debt: 100, limit: 121, monthlyCetPercent: 10 },
    { maxRows: 2 },
  );

  assert.equal(result.maxSuccessfulMonths, 2);
  assert.equal(result.nextFailedMonth.month, 3);
  assert.deepEqual(result.rows.map((row) => row.status), ['success', 'success']);
  assert.equal(result.truncated, true);
  assert.deepEqual(result.preview, {
    maxRows: 2,
    shownThroughMonth: 2,
    includesFirstFailure: false,
    truncated: true,
  });
});

test('includes a failure that falls on the configured final preview row', () => {
  const result = calculateRollover(
    { debt: 100, limit: 110, monthlyCetPercent: 10 },
    { maxRows: 2 },
  );

  assert.equal(result.maxSuccessfulMonths, 1);
  assert.deepEqual(result.rows.map((row) => row.status), ['success', 'failed']);
  assert.equal(result.truncated, false);
  assert.equal(result.preview.includesFirstFailure, true);
});

test('formats BRL values for display', () => {
  assert.equal(formatBRL(1418.519112), 'R$ 1.418,51');
});

test('never produces a negative zero amount', () => {
  // -0 renders as "-R$ 0,00" and reads as false for a `< 0` check.
  assert.equal(Object.is(floorToCents(-0.001), -0), false);
  assert.equal(Object.is(floorToCents(-0), -0), false);
  assert.equal(formatBRL(-0.001).startsWith('-'), false);
});

test('keeps a sub-cent overshoot marked as failed', () => {
  // Month 2 exceeds the limit by less than a cent. Truncating for display makes
  // the row read as if it still fits, so the status is the only signal left: it
  // must stay failed, and the remaining limit must not be a negative zero.
  const result = calculateRollover({
    debt: 100,
    limit: 120.999,
    monthlyCetPercent: 10,
  });

  assert.equal(result.maxSuccessfulMonths, 1);
  assert.equal(result.nextFailedMonth.month, 2);
  assert.equal(result.nextFailedMonth.status, 'failed');
  assert.equal(result.nextFailedMonth.displayDebt, 121);
  assert.equal(result.nextFailedMonth.remainingLimit, 0);
  assert.equal(Object.is(result.nextFailedMonth.remainingLimit, -0), false);
});
