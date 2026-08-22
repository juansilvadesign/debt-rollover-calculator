# Roadmap

Where the debt rollover calculator is now, what must become trustworthy next,
and which later work is worth considering.

**Direction:** turn three values—initial debt, available limit, and monthly
CET—into one understandable answer: how many complete rollover months fit, what
the debt looks like at the last successful month, and where the next operation
fails.

The runnable commands and supplied reference case live in
**[`README.md`](README.md)**. This file holds milestone status and decisions; the
actionable checklist is **[`TASKS.md`](TASKS.md)**.

---

## Frame: fix trust first, flex everything else

The MVP and its boundary-safety increment are built. The next increment remains
limited to **one focused release decision** with **one maintainer and the
existing static Astro stack**. Milestone D starts by choosing a public or
local/private home; its release scope and time-box follow that choice. Later
work receives a fixed time-box only after the preceding retrospective.

| Fixed for the next increment | Open to change |
| --- | --- |
| Outcome: one declared, reliably reachable home | Public web or local/private utility |
| Capacity: one maintainer; no backend or operations layer | Number of extra edge cases and UI refinements |
| Architecture: static page plus locally testable calculation module | Whether the project is eventually public or local-only |
| Release gate: no placeholder identity + repeatable access path | Every feature beyond the three-input fixed-CET model |

There is no external calendar launch commitment. D and E therefore remain
coarse rather than pretending to predict dates that have not been chosen.

---

## Stance: this is a projection, not a debt product

The calculator earns its keep by making compounding and the hard stop visible.
It does not need accounts, integrations, recommendations, or a broader financial
model to do that.

The model has four load-bearing rules:

1. Initial debt greater than available limit cannot start.
2. Each successful whole month compounds the previous projected debt by the
   monthly CET.
3. The answer includes both the last successful month and the first failed one.
4. Currency precision and the rendered table limit must never silently change
   the answer.

All four are now implemented with an explicit contract: calculations retain
full internal precision, the exact-limit comparison uses a magnitude-scaled
rounding tolerance, displayed currency is truncated to cents, and the true
horizon is independent of the 360-row detailed preview.

---

## Milestones

`✅ shipped` · `⬜ open`

| | Benefit-delivering milestone | State | Evidence / assumption retired |
| --- | --- | --- | --- |
| **A** | Turn the supplied rollover rule into a testable answer | ✅ | `9028f32`; supplied 6% case passes |
| **B** | Make the stopping point understandable on one static page | ✅ | `9028f32`; local test + production build re-verified 2026-07-30 |
| **C** | Make boundary and long-horizon answers trustworthy | ✅ | Expanded regressions, static build, and responsive Chrome checks passed 2026-08-20 |
| **D** | Make the verified tool reachable in its intended context | ⬜ | Next: choose public web or local/private utility |
| **E** | Validate the model and interface through real use | ⬜ | Evidence decides whether another increment exists |

The critical path is **A → B → C → D**. E supplies learning after the calculator
has a declared home. No enhancement belongs on the critical path.

### A — Turn the rule into a testable answer ✅

The calculation module accepts debt, limit, and monthly CET; rejects invalid
starting conditions; compounds month by month; and returns the final successful
state plus the next failed row. A logarithmic calculation supplies the
whole-month count.

> **Superseded by C (2026-08-21).** A ships with the logarithmic count as a
> second, independent view beside an iterative one. C replaced both with a
> single reconciled calculation, so no independent cross-check survives. The
> `directFormulaMonths` field is now an alias of `maxSuccessfulMonths` and the
> two can never disagree; the interface no longer labels it a direct formula.

The supplied scenario is the contract currently backed by evidence:

| Debt | Limit | Monthly CET | Successful months | Final debt | First failure |
| --- | --- | --- | --- | --- | --- |
| `R$ 1.000,00` | `R$ 1.500,00` | `6%` | `6` | `R$ 1.418,51` | Month 7 at `R$ 1.503,63` |

This retired the core hypothesis: the stopping point can be computed locally and
explained with a short sequence rather than a financial-service integration.

### B — Make the stopping point understandable ✅

The Astro page turns the result into four complementary views: a prominent
whole-month answer, summary cards, a visual timeline, and a detailed table that
includes the first failure. Inputs recalculate locally; the default example can
be restored in one click; error states, responsive layouts, dark mode, reduced
motion, semantic labels, and a non-advice disclaimer are present.

The page is static and the calculation has no runtime API dependency. The only
runtime third-party request is the imported Google font, a distribution choice
to revisit only if the intended home requires privacy or offline behavior.

### C — Make boundary and long-horizon answers trustworthy ✅

This increment shipped because a calculator is useful only when “fits” and
“does not fit” remain correct at the boundary.

Two direct probes during the 2026-07-30 audit exposed the risk:

| Probe | Correct interpretation | Pre-C behavior found by the audit |
| --- | --- | --- |
| Debt `100`, limit `110`, CET `10%` | Month 1 lands on the limit and succeeds | Iteration returns `0`; formula returns `1` |
| Debt `1,000`, limit `1,500`, CET `0.01%` | Failure occurs after the table preview | Iteration stops at `360`; formula returns `4,054`; UI can call `360` the maximum |

The shipped release sequence was:

1. Capture exact-boundary, invalid-input, and long-horizon cases as regressions.
2. Define the cent/precision rule, using the supplied table as the default source
   of truth until stronger requirements exist.
3. Repair boundary arithmetic and reconcile the iterative and formula results.
4. Separate the true answer from the bounded table preview and give truncation
   an honest UI state.
5. Re-run the supplied case, expanded tests, production build, and browser
   checks at phone and desktop widths.

**Value shipped:** a user can trust “last successful month” even when the debt
lands exactly on the limit or the projection is longer than the rendered table.

**Assumption retired:** ordinary JavaScript number comparison and a 360-row
guard are sufficient without an explicit numeric contract.

**Acceptance evidence:** the supplied six-month case is unchanged; exact-limit
regressions pass; the logarithmic count is reconciled against the adjacent raw
debt projections; truncated previews never claim to be maxima; and every
visible result view agrees. The unit suite and production build passed on
2026-08-20. Chrome 149 smoke checks covered the reference, exact-boundary,
insufficient-limit, invalid-input, and long-horizon cases at 320 × 800 and
1280 × 900 with no horizontal overflow.

**Independent re-verification, 2026-08-21.** The arithmetic holds: 4,160 cases
were replayed against an exact BigInt-rational model of the documented rule,
with no disagreement on either the month count or the cent-truncated amounts,
and the 4,054-month long-horizon answer is exact rather than approximate.

Two gaps in the evidence above were real and are now closed:

- The reconciliation repair was **not covered by the suite that certified it**.
  Deleting both loops left all 12 tests green, yet the loops change the answer
  on inputs a user can type — and without them the count is wrong in both
  directions, including reporting a month of headroom that does not exist. Two
  regressions now pin each direction, and removing either loop fails the suite.
- The `directFormulaMonths` assertions were tautologies: the field is an alias,
  so they restated `maxSuccessfulMonths` rather than corroborating it.

One limitation is now documented rather than fixed: when a month exceeds the
limit by less than a cent, display truncation makes the failed row show a debt
equal to the limit and `R$ 0,00` remaining. The status stays correct and the
interface now says the overshoot is "menos de R$ 0,01" instead of `R$ 0,00`.
Measured at roughly 0.008% of realistic inputs (24 of 300,000). Removing it
entirely would mean changing the money rule, which would break the supplied
reference table — a deliberate decision left to a future increment.

### D — Make the verified tool reachable in its intended context ⬜

This milestone starts with one explicit home decision. It delivers one benefit:
the intended user can reliably reach the verified calculator where it is meant
to live.

There are two legitimate releases:

- **Public web:** configure the real canonical URL, keep the deploy static,
  resolve the runtime-font privacy choice, publish, and verify on phone and
  desktop.
- **Local/private utility:** remove or document the placeholder production URL,
  document the supported local start path, and verify it on the actual device.

The current `https://example.com` Astro `site` value is a placeholder, not
evidence of deployment. A host, analytics, SEO expansion, or continuous delivery
pipeline is not required merely because the build is static.

**Assumption retired:** public deployment is necessary—or harmless—for a
personal life-admin tool.

### E — Validate through real use, then choose whether to continue ⬜

Compare several realistic inputs with an independent calculation, use the tool
on its intended device, and capture where the model or interface actually causes
confusion. That evidence may justify one small follow-up release; it may also
show that the project is complete.

Candidate ideas such as localized currency masks, shareable scenarios,
comparison mode, or variable CET stay outside the committed roadmap until an
observed use case pulls one in.

**Value shipped:** confidence that the calculator helps with the real decision,
not only its supplied test fixture.

**Assumption retired:** the reference scenario alone represents real usage.

---

## Anti-scope

Unless real validation changes the product direction, do not add:

- financial advice, lender recommendations, payoff planning, or debt
  negotiation;
- bank or card-provider integrations, account login, saved financial profiles,
  or remote storage;
- ads, affiliate links, provider comparisons, or lead capture;
- variable-rate, multi-card, installment, or refinancing models presented as if
  the current fixed-CET contract already supports them;
- a backend for work that a static page can complete locally.

The safest product promise is deliberately narrow: **show the result of one
documented fixed-monthly-CET projection clearly and correctly.**

---

## Retrospective and update cadence

Review the roadmap immediately after each milestone:

1. Record the evidence and any surprising result in the
   [`TASKS.md` log](TASKS.md#log).
2. Mark the milestone shipped only when its acceptance evidence exists.
3. Re-cut the next milestone to its fixed time-box and current capacity.
4. Keep later milestones coarse; promote no candidate feature without observed
   value or risk.
5. Stop when the narrow direction is served. “No next release” is a valid
   retrospective decision.

Deadline and capacity stay fixed inside an active increment; **scope is the
variable**. When learning conflicts with this document, update the roadmap
instead of defending the prediction.
