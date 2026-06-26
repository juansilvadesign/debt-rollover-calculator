import assert from 'node:assert/strict';
import test from 'node:test';

import {
  calculateRollover,
  formatBRL,
  INSUFFICIENT_LIMIT_MESSAGE,
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

test('formats BRL values for display', () => {
  assert.equal(formatBRL(1418.519112), 'R$ 1.418,51');
});
