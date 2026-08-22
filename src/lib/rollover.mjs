export const INSUFFICIENT_LIMIT_MESSAGE = 'Limite insuficiente para realizar a primeira operação';
export const INVALID_INPUT_MESSAGE = 'Preencha dívida, limite e CET com valores maiores que zero.';
export const UNSUPPORTED_HORIZON_MESSAGE = 'O horizonte calculado é longo demais para ser representado com segurança.';
export const DEFAULT_MAX_PREVIEW_ROWS = 360;

const BOUNDARY_TOLERANCE_FACTOR = 16;
const MAX_SUPPORTED_MONTHS = Number.MAX_SAFE_INTEGER - 1;

const MONEY_FORMATTER = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const NUMBER_FORMATTER = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function floorToCents(value) {
  if (!Number.isFinite(value)) return 0;
  const scaled = value * 100;
  const cents = scaled >= 0 ? Math.floor(scaled + 1e-6) : Math.ceil(scaled - 1e-6);
  // Truncating a small negative amount yields -0, which renders as "-R$ 0,00"
  // and reads as false for a `< 0` check. Collapse both zeroes to one.
  return cents === 0 ? 0 : cents / 100;
}

export function formatBRL(value) {
  return MONEY_FORMATTER.format(floorToCents(value));
}

export function formatPercent(value) {
  return `${NUMBER_FORMATTER.format(Number.isFinite(value) ? value : 0)}%`;
}

function toPositiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function normalizeMaxRows(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return DEFAULT_MAX_PREVIEW_ROWS;
  return Math.max(1, Math.floor(number));
}

function isWithinLimit(projectedDebt, limit) {
  if (!Number.isFinite(projectedDebt)) return false;
  if (projectedDebt <= limit) return true;

  const scale = Math.max(1, Math.abs(projectedDebt), Math.abs(limit));
  const tolerance = Number.EPSILON * scale * BOUNDARY_TOLERANCE_FACTOR;
  return projectedDebt - limit <= tolerance;
}

function projectDebt(debt, logGrowth, month) {
  if (month === 0) return debt;
  return debt * Math.exp(logGrowth * month);
}

function makeRow({ debt, limit, logGrowth, month, maxSuccessfulMonths }) {
  const rawDebt = projectDebt(debt, logGrowth, month);
  const displayDebt = floorToCents(rawDebt);

  return {
    month,
    rawDebt,
    displayDebt,
    remainingLimit: floorToCents(limit - displayDebt),
    status: month <= maxSuccessfulMonths ? 'success' : 'failed',
  };
}

function calculateWholeMonths(debt, limit, logGrowth) {
  if (debt === limit) return 0;

  const headroomRatio = (limit - debt) / debt;
  const formulaResult = Math.log1p(headroomRatio) / logGrowth;

  if (!Number.isFinite(formulaResult) || formulaResult > MAX_SUPPORTED_MONTHS) {
    return null;
  }

  const nearestInteger = Math.round(formulaResult);
  const integerTolerance = Number.EPSILON
    * Math.max(1, Math.abs(formulaResult))
    * BOUNDARY_TOLERANCE_FACTOR;
  let wholeMonths = Math.abs(formulaResult - nearestInteger) <= integerTolerance
    ? nearestInteger
    : Math.floor(formulaResult);

  // The logarithmic formula supplies the efficient long-horizon answer. These
  // adjacent checks reconcile its rounding with the same full-precision debt
  // projection used for rows, especially when a month lands on the limit.
  while (wholeMonths > 0 && !isWithinLimit(projectDebt(debt, logGrowth, wholeMonths), limit)) {
    wholeMonths -= 1;
  }

  while (
    wholeMonths < MAX_SUPPORTED_MONTHS
    && isWithinLimit(projectDebt(debt, logGrowth, wholeMonths + 1), limit)
  ) {
    wholeMonths += 1;
  }

  return wholeMonths;
}

export function calculateRollover(input, options = {}) {
  const debt = toPositiveNumber(input?.debt);
  const limit = toPositiveNumber(input?.limit);
  const monthlyCetPercent = toPositiveNumber(input?.monthlyCetPercent);
  const maxRows = normalizeMaxRows(options.maxRows ?? DEFAULT_MAX_PREVIEW_ROWS);

  if (debt <= 0 || limit <= 0 || monthlyCetPercent <= 0) {
    return {
      ok: false,
      reason: 'invalid-input',
      message: INVALID_INPUT_MESSAGE,
      rows: [],
      input: { debt, limit, monthlyCetPercent },
    };
  }

  if (debt > limit) {
    return {
      ok: false,
      reason: 'insufficient-limit',
      message: INSUFFICIENT_LIMIT_MESSAGE,
      rows: [],
      input: { debt, limit, monthlyCetPercent },
    };
  }

  const monthlyRate = monthlyCetPercent / 100;
  const logGrowth = Math.log1p(monthlyRate);

  if (!Number.isFinite(logGrowth) || logGrowth <= 0) {
    return {
      ok: false,
      reason: 'invalid-input',
      message: INVALID_INPUT_MESSAGE,
      rows: [],
      input: { debt, limit, monthlyCetPercent },
    };
  }

  const maxSuccessfulMonths = calculateWholeMonths(debt, limit, logGrowth);

  if (maxSuccessfulMonths === null) {
    return {
      ok: false,
      reason: 'unsupported-horizon',
      message: UNSUPPORTED_HORIZON_MESSAGE,
      rows: [],
      input: { debt, limit, monthlyCetPercent },
    };
  }

  const firstFailedMonthNumber = maxSuccessfulMonths + 1;
  const previewEndMonth = Math.min(maxRows, firstFailedMonthNumber);
  const rows = Array.from({ length: previewEndMonth }, (_, index) => makeRow({
    debt,
    limit,
    logGrowth,
    month: index + 1,
    maxSuccessfulMonths,
  }));
  const nextFailedMonth = makeRow({
    debt,
    limit,
    logGrowth,
    month: firstFailedMonthNumber,
    maxSuccessfulMonths,
  });
  const includesFirstFailure = previewEndMonth === firstFailedMonthNumber;
  const truncated = !includesFirstFailure;
  const finalDebt = floorToCents(projectDebt(debt, logGrowth, maxSuccessfulMonths));

  return {
    ok: true,
    input: { debt, limit, monthlyCetPercent },
    monthlyRate,
    rows,
    maxSuccessfulMonths,
    // Alias kept for the detailed-table heading. It is the same reconciled
    // horizon, not an independent second opinion: since Milestone C there is
    // one calculation, and the raw formula result on its own is wrong at the
    // boundary. Do not present these two fields as corroborating each other.
    directFormulaMonths: maxSuccessfulMonths,
    finalDebt,
    remainingLimit: floorToCents(limit - finalDebt),
    nextFailedMonth,
    truncated,
    preview: {
      maxRows,
      shownThroughMonth: previewEndMonth,
      includesFirstFailure,
      truncated,
    },
  };
}
