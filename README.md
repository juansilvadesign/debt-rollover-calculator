# Debt Rollover Calculator Site

Static Astro calculator for estimating how many full months a debt rollover can stay below an available credit-card limit.

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
