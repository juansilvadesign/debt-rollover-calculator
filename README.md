# Debt Rollover Calculator Site

Static Astro calculator for estimating how many full months a debt rollover can stay below an available credit-card limit.

Project tracking: [`ROADMAP.md`](ROADMAP.md) · [`TASKS.md`](TASKS.md)

## Commands

```bash
npm install
npm run test
npm run build
npm run dev
```

## Reference Case

- Debt: `R$ 1.000,00`
- Limit: `R$ 1.500,00`
- CET: `6%` monthly
- Expected result: `6` successful months, final debt `R$ 1.418,51`, remaining limit `R$ 81,49`, and the failed month `7` shown as `R$ 1.503,63`.

## Calculation Contract

- Debt, limit, and monthly CET must be positive, finite numbers. Debt may equal
  the limit, but cannot start above it.
- Each month compounds the original debt at the fixed monthly CET using full
  internal floating-point precision. A tolerance of 16 times
  `Number.EPSILON`, scaled to the compared amounts, absorbs machine-rounding
  noise when a projected debt lands on the limit.
- Precision is reduced only for display: projected BRL values are truncated
  toward zero to two decimal places. The displayed remaining limit is the
  available limit minus that displayed debt. This preserves the supplied
  reference table; cent-truncated values are not fed into the next month.
- The true whole-month horizon comes from the logarithmic formula and is checked
  against the adjacent full-precision projected debts. The detailed timeline
  and table are a separate preview capped at 360 rows. A horizon beyond
  JavaScript's safe-integer range returns an explicit unsupported-horizon state
  instead of an approximate month count.
- When the first failed month falls beyond that preview, the cards still show
  the true maximum and true first failure, while both detailed views state the
  preview boundary. A 360-row preview is never presented as a 360-month maximum.

For example, debt `R$ 1.000,00`, limit `R$ 1.500,00`, and CET `0,01%`
produce `4.054` successful months and failure in month `4.055`; the detailed
views show only months 1–360 and label that range as a preview.

## Verification

Milestone C was verified on 2026-08-20 with:

- the expanded Node unit suite, covering the reference case, one- and two-month
  exact boundaries, invalid inputs, first-month failure, equal starting values,
  and bounded previews;
- a successful static production build;
- Chrome 149 browser smoke tests for reference, exact-boundary,
  insufficient-limit, invalid-input, and long-horizon scenarios;
- responsive DOM and overflow checks at `320 × 800` and `1280 × 900`, including
  agreement among result cards, timeline, and table.
