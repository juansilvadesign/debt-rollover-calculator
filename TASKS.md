# Tasks

The living checklist. Milestone definitions and the reasoning live in
**[`ROADMAP.md`](ROADMAP.md)**; the current product description and reference
case live in **[`README.md`](README.md)**.

_Last reviewed: 2026-07-30_

> Milestones **A–B** are shipped. The reference case passes and the static site
> builds. **C is next** because the roadmap audit found two cases the current UI
> can describe incorrectly: an amount that lands exactly on the limit, and a
> projection that outlives the 360-row display cap. Publishing and feature work
> wait until those answers are trustworthy.

---

## Completed — A: lock the useful calculation ✅

- [x] Accept initial debt, available limit, and monthly CET as the complete input
      to the first model.
- [x] Reject non-positive values and block the operation when the initial debt is
      greater than the available limit.
- [x] Calculate the debt month by month and keep the first failed month so the
      stopping point is visible rather than implied.
- [x] Return the maximum successful whole months, final displayed debt, and
      remaining limit.
- [x] Keep the logarithmic formula as a cross-check beside the iterative model.
- [x] Reproduce the supplied reference case: `R$ 1.000,00` debt,
      `R$ 1.500,00` limit, and `6%` monthly CET produce six successful months,
      `R$ 1.418,51` final debt, `R$ 81,49` remaining, and failure in month 7 at
      `R$ 1.503,63`.
- [x] Cover the reference case, insufficient initial limit, and BRL formatting
      in [`tests/rollover.test.mjs`](tests/rollover.test.mjs).

## Completed — B: make the stopping point understandable ✅

- [x] Ship a single-page static Astro calculator with no account, server, bank
      connection, or external data dependency.
- [x] Recalculate as the three inputs change and provide a one-click reset to the
      reference example.
- [x] Show the answer as summary cards plus the first month that fails.
- [x] Show the same projection as a visual timeline and a month-by-month table.
- [x] Provide invalid-input and insufficient-limit empty states.
- [x] Add responsive layouts for phone and desktop, light/dark themes, visible
      focus treatment, reduced-motion support, labels, and live-result regions.
- [x] State that the calculator is educational and not financial advice.
- [x] Verify `npm run test` and `npm run build` locally on 2026-07-30.

---

## C — Make boundary math trustworthy ⬜

This is the next increment. Fix the result contract before expanding or
publishing the calculator.

### C1 — Turn the known failures into tests

- [ ] Add an exact-boundary regression: `100` debt, `110` limit, and `10%` CET
      must allow month 1 and fail in month 2. The current iterative result says
      zero months while the direct formula says one.
- [ ] Add a multi-month boundary regression: `100` debt, `121` limit, and `10%`
      CET must allow two whole months.
- [ ] Add a long-horizon regression: `1,000` debt, `1,500` limit, and `0.01%`
      CET must not present the 360-row rendering cap as the true maximum. The
      current direct formula returns 4,054 months.
- [ ] Cover zero, negative, non-numeric, and non-finite inputs explicitly.
- [ ] Cover `debt === limit`, failure in the first rollover month, and a
      successful projection that reaches the configured row cap.

### C2 — Define and repair the calculation contract

- [ ] Decide and document the money rule: carry full internal precision and
      truncate only for display, or apply a cent-level rule after every month.
      Preserve the supplied reference table unless a better source of truth
      deliberately replaces it.
- [ ] Replace the absolute `Number.EPSILON` comparison with arithmetic that
      handles cent-scale exact boundaries consistently.
- [ ] Make the iterative result and logarithmic cross-check agree on boundary
      cases, or surface a deliberate, documented reason when they cannot.
- [ ] Separate the answer from the table cap: either calculate the true maximum
      while rendering a bounded preview, or label a capped result as “at least
      N months.” Never call a truncated preview the maximum.
- [ ] Make the no-failure message distinguish “no failure exists” from “no
      failure was rendered inside the preview.”

### C3 — Verify the repaired release

- [ ] Keep the original six-month reference case unchanged.
- [ ] Run the expanded unit suite and a production build.
- [ ] Smoke-test the reference, exact-boundary, insufficient-limit, invalid, and
      long-horizon cases in the browser.
- [ ] Check the result cards, timeline, and table at 320 px and desktop widths;
      all three views must tell the same story.
- [ ] Record the chosen money rule and the verification evidence in
      [`README.md`](README.md).

**C ships when:** a value exactly equal to the limit is treated consistently,
long projections cannot masquerade as a shorter maximum, every displayed answer
uses the documented money rule, and the reference case still passes.

---

## D — Put the verified calculator in its intended place ⬜

Choose one branch after the C retrospective. A personal local utility and a
public shareable tool have different completion criteria; the roadmap should not
pretend both are required.

- [ ] Decide whether the intended home is **public web** or **local/private
      utility**, and record the reason.

**Branch 1 — public web:**

- [ ] Choose the static host and fixed release time-box; keep the implementation
      serverless.
- [ ] Replace `https://example.com` in [`astro.config.mjs`](astro.config.mjs)
      with the canonical production URL.
- [ ] Decide whether the Google Fonts request is acceptable for the intended
      privacy/offline behavior; self-host or remove it if not.
- [ ] Deploy the production build and verify the canonical URL on a phone and a
      desktop.
- [ ] Add the live URL and repeatable deployment command to
      [`README.md`](README.md).

**Branch 2 — local/private utility:**

- [ ] Remove or clearly document the placeholder `site` URL so generated output
      cannot imply a deployment that does not exist.
- [ ] Document the shortest supported local start path and the supported Node
      version.
- [ ] Verify the calculator is usable from the device where the real scenarios
      will be entered.

**D ships when:** the calculator has one declared home, no placeholder production
identity, and a repeatable way to reach it there.

---

## E — Validate with real use, then re-plan ⬜

This milestone stays coarse until D is reviewed.

- [ ] Compare at least three realistic scenarios against an independent
      calculation or source statement, including one near the available limit.
- [ ] Use the calculator on the intended device and record observed friction;
      do not turn imagined friction into scope.
- [ ] Confirm the explanation and disclaimer make the model's limitations clear
      to someone who did not build it.
- [ ] Promote at most one observed need into the next increment, or close the
      project if the current utility is sufficient.

Possible observations may justify localized currency entry, a shareable
scenario, comparison mode, or variable-rate modeling. They are **not committed
features** until real use makes one of them more valuable than keeping the tool
small.

---

## Housekeeping — safe to do alongside the active milestone ⬜

- [ ] Link [`TASKS.md`](TASKS.md) and [`ROADMAP.md`](ROADMAP.md) from
      [`README.md`](README.md).
- [ ] Keep the reference case in the README, tests, and UI synchronized if its
      source of truth changes.
- [ ] Update the review date, milestone table, and log together whenever a
      milestone changes state.

---

### Log

- **2026-06-25** — Static Astro implementation committed in `9028f32`: model,
  reference tests, responsive calculator, table, timeline, theme, and disclaimer.
- **2026-06-26** — Project recorded as built in the idea index.
- **2026-07-30** — Roadmap audit: current tests and production build pass.
  Milestone C opened after direct probes exposed the exact-limit floating-point
  mismatch and the misleading 360-row truncation state.
