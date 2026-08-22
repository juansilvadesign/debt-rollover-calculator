# Debt Rollover Calculator

Local/private Astro utility for estimating how many full months a debt rollover can stay below an available credit-card limit. It has no public deployment or canonical production URL.

Project tracking: [`ROADMAP.md`](ROADMAP.md) · [`TASKS.md`](TASKS.md)

## Local use

This calculator is meant to run on the same device where its scenarios are entered. Its supported start command binds only to `127.0.0.1`, so it is not exposed to the local network or the public internet.

**Supported Node.js:** `>=22.12.0` (tested with `v22.23.2`).

For the first run, from this project directory:

```bash
npm ci
npm start
```

Then open [http://127.0.0.1:4321/](http://127.0.0.1:4321/) on that same device. Keep the terminal process running while using the calculator; press `Ctrl+C` to stop it.

The calculation has no server or API call: entered values stay in the browser. The stylesheet currently requests the IBM Plex Sans font from Google Fonts when a network is available; it falls back to installed system fonts when it is not.

## Development and verification

```bash
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
- The logarithmic result is **not** an independent second opinion. On its own it
  is wrong at the boundary in both directions, so it is always reconciled
  against the adjacent full-precision projections before it is reported.
  `directFormulaMonths` is an alias of `maxSuccessfulMonths`; the two cannot
  disagree and must not be presented as corroborating each other.

### Known limitation: sub-cent overshoot

When a month exceeds the limit by less than a cent, truncating for display makes
that row show a debt equal to the limit and `R$ 0,00` remaining while it is
correctly marked as failed. The status is then the only signal that it did not
fit, and the summary says the overshoot is "menos de R$ 0,01" rather than
`R$ 0,00`. This affects roughly 0.008% of realistic inputs (24 of 300,000
measured). Removing it means changing the money rule, which would break the
supplied reference table, so it is left as a documented decision for a later
increment rather than a silent repair.

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

Re-verified independently on 2026-08-21:

- 4,160 cases replayed against an exact BigInt-rational model of the documented
  rule, with no disagreement on month counts or cent-truncated amounts. The
  4,054-month long-horizon answer is exact, not approximate.
- Mutation-tested: removing the boundary tolerance fails the suite, and — after
  this pass — so does removing either reconciliation loop. Before this pass,
  deleting both loops left every test green, so the repair Milestone C exists
  for was shipped untested. Two regressions now pin each direction.
- 16 unit tests and a production build pass on Node 22.
