export const INSUFFICIENT_LIMIT_MESSAGE = 'Limite insuficiente para realizar a primeira operação';
export const INVALID_INPUT_MESSAGE = 'Preencha dívida, limite e CET com valores maiores que zero.';

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
  if (scaled >= 0) return Math.floor(scaled + 1e-6) / 100;
  return Math.ceil(scaled - 1e-6) / 100;
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

export function calculateRollover(input, options = {}) {
  const debt = toPositiveNumber(input.debt);
  const limit = toPositiveNumber(input.limit);
  const monthlyCetPercent = toPositiveNumber(input.monthlyCetPercent);
  const maxRows = Math.max(1, Math.round(options.maxRows ?? 360));

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
  let projectedDebt = debt;
  const rows = [];
  let maxSuccessfulMonths = 0;
  let lastSuccessfulDisplayDebt = floorToCents(debt);

  for (let month = 1; month <= maxRows; month += 1) {
    const rawDebt = projectedDebt * (1 + monthlyRate);
    const displayDebt = floorToCents(rawDebt);
    const isSuccessful = rawDebt <= limit + Number.EPSILON;

    rows.push({
      month,
      rawDebt,
      displayDebt,
      remainingLimit: floorToCents(limit - displayDebt),
      status: isSuccessful ? 'success' : 'failed',
    });

    if (!isSuccessful) break;

    maxSuccessfulMonths = month;
    lastSuccessfulDisplayDebt = displayDebt;
    projectedDebt = rawDebt;
  }

  const directFormulaMonths = Math.max(
    0,
    Math.floor(Math.log(limit / debt) / Math.log(1 + monthlyRate)),
  );

  return {
    ok: true,
    input: { debt, limit, monthlyCetPercent },
    monthlyRate,
    rows,
    maxSuccessfulMonths,
    directFormulaMonths,
    finalDebt: lastSuccessfulDisplayDebt,
    remainingLimit: floorToCents(limit - lastSuccessfulDisplayDebt),
    nextFailedMonth: rows.find((row) => row.status === 'failed') ?? null,
    truncated: rows.length === maxRows && rows.at(-1)?.status === 'success',
  };
}
