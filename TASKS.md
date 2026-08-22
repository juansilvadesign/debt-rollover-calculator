# Tasks

The living checklist. Milestone definitions and the reasoning live in
**[`ROADMAP.md`](ROADMAP.md)**; the current product description and reference
case live in **[`README.md`](README.md)**.

_Last reviewed: 2026-08-21_

> Milestones **A–C** are shipped, with C independently re-verified on
> 2026-08-21 (see [C4](#c4--re-verification-and-repair-2026-08-21)). The
> reference case passes, exact-limit arithmetic is boundary-safe and now
> matches an exact-rational oracle, the true horizon is independent of the
> 360-row preview, and all detailed views label truncation. **D is next** and
> begins with choosing whether this is a public web tool or a local/private
> utility.

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
      **Superseded by C:** the iterative model is gone and the formula is now
      reconciled against full-precision projections inside one calculation. No
      independent second count remains, and `directFormulaMonths` is an alias.
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

## Completed — C: make boundary math trustworthy ✅

The result contract is fixed. Publishing and feature work can now wait on the
Milestone D home decision rather than arithmetic risk.

### C1 — Turn the known failures into tests

- [x] Add an exact-boundary regression: `100` debt, `110` limit, and `10%` CET
      must allow month 1 and fail in month 2. Before C, the iterative result
      said zero months while the direct formula said one.
- [x] Add a multi-month boundary regression: `100` debt, `121` limit, and `10%`
      CET must allow two whole months.
- [x] Add a long-horizon regression: `1,000` debt, `1,500` limit, and `0.01%`
      CET must not present the 360-row rendering cap as the true maximum. The
      direct formula returns 4,054 months.
- [x] Cover zero, negative, non-numeric, and non-finite inputs explicitly.
- [x] Cover `debt === limit`, failure in the first rollover month, and a
      successful projection that reaches the configured row cap.

### C2 — Define and repair the calculation contract

- [x] Decide and document the money rule: carry full internal precision and
      truncate only for display, or apply a cent-level rule after every month.
      Preserve the supplied reference table unless a better source of truth
      deliberately replaces it.
- [x] Replace the absolute `Number.EPSILON` comparison with arithmetic that
      handles cent-scale exact boundaries consistently.
- [x] Reconcile the logarithmic horizon against its adjacent full-precision
      debt projections so boundary cases use one consistent answer.
- [x] Separate the answer from the table cap: either calculate the true maximum
      while rendering a bounded preview, or label a capped result as “at least
      N months.” Never call a truncated preview the maximum.
- [x] Make the no-failure message distinguish “no failure exists” from “no
      failure was rendered inside the preview.”

### C3 — Verify the repaired release

- [x] Keep the original six-month reference case unchanged.
- [x] Run the expanded unit suite and a production build.
- [x] Smoke-test the reference, exact-boundary, insufficient-limit, invalid, and
      long-horizon cases in the browser.
- [x] Check the result cards, timeline, and table at 320 px and desktop widths;
      all three views must tell the same story.
- [x] Record the chosen money rule and the verification evidence in
      [`README.md`](README.md).

**C ships when:** a value exactly equal to the limit is treated consistently,
long projections cannot masquerade as a shorter maximum, every displayed answer
uses the documented money rule, and the reference case still passes.

### C4 — Re-verification and repair, 2026-08-21

C shipped correct arithmetic on top of an incomplete gate. The answers were
right; the evidence that they were right did not cover the repair that made
them right.

- [x] Replay the model against an exact BigInt-rational oracle instead of
      trusting the suite. 4,160 cases, no disagreement on month counts or
      cent-truncated amounts; the 4,054-month horizon is exact.
- [x] Mutation-test the C repairs. The boundary tolerance was already covered
      (removing it fails 2 tests). **Removing both reconciliation loops left
      the whole suite green** — the repair C exists for was untested.
- [x] Prove the loops are load-bearing before pinning them: they change the
      answer on user-typeable inputs, and in every checked case the shipped
      answer matches exact arithmetic while the unreconciled one is off by one.
- [x] Add a regression for each direction — `100 / 100,02 / 0,02%` must give 1
      month (the formula alone floors to 0) and `5.000 / 23.954.704,78 /
      21,24%` must give 43 (the formula alone rounds up to 44). Removing either
      loop now fails the suite.
- [x] Stop `floorToCents` returning `-0`, which rendered as `-R$ 0,00` and read
      as false for a `< 0` check.
- [x] Say "menos de R$ 0,01" instead of `R$ 0,00` when the overshoot is smaller
      than a cent, so the failure message stops contradicting itself.
- [x] Relabel the table heading: it showed "Fórmula direta", which is false at
      exactly the boundary cases C was built to handle.
- [ ] Decide whether a sub-cent overshoot should stay invisible in the table.
      The row displays a debt equal to the limit with `R$ 0,00` remaining while
      marked as failed (~0.008% of realistic inputs). Fixing it means changing
      the money rule and breaking the supplied reference table — a D or E
      decision, not a C repair.

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

- [x] Link [`TASKS.md`](TASKS.md) and [`ROADMAP.md`](ROADMAP.md) from
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
- **2026-08-20** — Milestone C shipped. The calculator now uses a scaled
  floating-point boundary tolerance, calculates the full logarithmic horizon
  independently of its 360-row preview, and exposes the true failed month even
  when it is not rendered. Expanded unit tests and the static build pass. Chrome
  149 smoke tests passed all required scenarios at 320 × 800 and 1280 × 900
  without horizontal overflow or disagreement between result views.
- **2026-08-21** — C re-verified independently, and the surprise was in the
  gate, not the math. An exact BigInt-rational oracle agreed with the shipped
  model on all 4,160 replayed cases, so C's answers are sound. But deleting
  C's reconciliation loops — the repair C was opened for — left all 12 tests
  passing, so the milestone's own acceptance evidence never touched it. The
  loops are load-bearing: without them the count is off by one on inputs a user
  can type, sometimes claiming a month of headroom that does not exist. Two
  regressions now pin both directions; each loop's removal fails the suite.
  Also fixed a `-0` leak in `floorToCents`, an overshoot message that read
  "estoura o limite em R$ 0,00", and a table heading that claimed "Fórmula
  direta" for a number the direct formula does not produce at the boundary.
  Suite 12 → 16 tests, all passing, production build clean.
