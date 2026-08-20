import assert from 'node:assert/strict';
import test from 'node:test';

import {
  calculateRollover,
  DEFAULT_MAX_PREVIEW_ROWS,
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
