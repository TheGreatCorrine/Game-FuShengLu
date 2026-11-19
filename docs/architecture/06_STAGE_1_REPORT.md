# Phase 2A.2 Stage 1 — Unified households and accounts

Branch `refactor/core-architecture`. Baseline `94e7223f8e0fb5944338db9b2a0c4cf64d8520d7`. Verified implementation `7cec9a8b8a0cdf163568c628cacf84d38445e75a`.

## Ownership and migration

All open economic households, including the current residence, have one writable book in `state.households[id]`. Keys are the existing stable household identifiers. A person's current membership is still recorded by residence (player) or house (NPC); health and settlement continue to exclude external marriage candidates. Private wallets, loan contracts, estate settlements, heads and closure years keep their existing owners. Empty households with outstanding assets or debt continue to exist. Current-year income and expenses remain the prior annual settlement's display totals, including across a midyear move.

The public commands and event IDs remain available. Returned states expose read-only cash, assets, debt and detached frozen estates projections. Serialization, spread and structured cloning carry authoritative accounts only. Use the exported `migrateHouseholds(snapshot)` to import a legacy snapshot or to reattach views after deserialization. Fixtures that used to assign directly to a projected field must now write the owning account. The migrator validates a separate copy and rejects mixed schemas, aliases, duplicate owners, invalid balances and living residents with missing accounts. It does not run an economic tick.

Residence changes only switch membership and maintain the legacy traversal order. Each newly represented spouse household still receives its existing endowment. When a spouse joins the current household without represented elders, the allocated cash and asset are credited there explicitly. Courtship costs, annual wages, consumption, sales, debt service and estate recoveries retain their original rules. Head selection, RNG strings, timestamps, sorted heir IDs and person IDs retain their Stage 0 semantics.

## Verification

- 39 tests passed in seven files, including the 34 prior cases. Type checking, production Vite build and offline HTML packaging succeeded.
- 600 distinct seeds × four policies produced 2,400 paired completed lives. The runner compared every household's cash, assets and debt and the projected legacy state at **184,779 checkpoints**, including generation, naming, advance and choice resolution. It checked eligible options at decisions and validated unique accounts, valid balances and resident references. **Zero differences**.
- **4,636 migration checks**, including generation, all 110 observed changes of player residence, and age-40 annual snapshots. Migrated books were compared by owner and the full legacy projection by field. Synthetic coverage adds repeated moves, missing destinations, all four first-marriage arrangements, mixed/aliased schemas, final empty-house repayment, closure, annual income, expenses and asset disposal.
- Stage 0 golden fixtures were left intact. All four projected playthroughs matched. All eight simulation outputs matched Stage 0 byte for byte (cohort, pair, families, debt-runs, household-runs, character-runs, memory-pair and phase2a1). The separate 1,000-life cohort had a mean death age of 62.225 in both versions.
- First differing seed, age, command, owner, field and values: none. The runner reports this context on a field discrepancy.

|Policy|Age 25 household debt, old → new|Ever married among 565 reaching eligibility, old → new|Age 25 completed education, old → new|
|---|---|---|---|
|First|56.9% → 56.9%|117 → 117|13.9% → 13.9%|
|Conservative|54.2% → 54.2%|0 → 0|0% → 0%|
|Education|56.7% → 56.7%|0 → 0|13.9% → 13.9%|
|Random|56.1% → 56.1%|58 → 58|10.8% → 10.8%|

Age-25 percentages use age-25 survivors. The paired count includes repeated observations of the same seeds across policies. These checks cover the sampled lives and fixtures; they do not prove equivalence for arbitrary externally modified states. The old cohort script's marital-residence counter remains a historical diagnostic limitation. The paired runner counts actual residence changes.

## Reproduce from the Stage 1 checkout

```sh
set -eu
out=$(mktemp -d)
git archive 94e7223 src | tar -x -C "$out"
node_modules/.bin/esbuild "$out/src/engine.ts" --bundle --platform=node --format=esm --outfile="$out/old.mjs"
node_modules/.bin/esbuild scripts/compare-households.mjs --bundle --platform=node --format=esm --outfile="$out/compare.mjs"
node "$out/compare.mjs" "$out/old.mjs"
npm test
npm run build
```

The [baseline instructions](02_BASELINE_BEHAVIOR.md) reproduce all eight simulations and the golden comparison.

## Changed files

- `scripts/architecture-golden.mjs`
- `scripts/character-runs.mjs`
- `scripts/compare-households.mjs`
- `scripts/debt-runs.mjs`
- `scripts/household-runs.mjs`
- `scripts/legacy-household-view.mjs`
- `scripts/relationship-fixture.mjs`
- `src/engine.ts`
- `src/engine/accounts.ts`
- `src/engine/economy.ts`
- `src/engine/encounters.ts`
- `src/engine/family.ts`
- `src/engine/legal.ts`
- `src/engine/livelihood.ts`
- `src/engine/types.ts`
- `tests/accounts.test.ts`
- `tests/characters.test.ts`
- `tests/engine.test.ts`
- `tests/finance.test.ts`
- `tests/household.test.ts`
- `tests/quality.test.ts`
- `docs/architecture/06_STAGE_1_REPORT.md` (this report)

Stage 1 ends here. Person IDs and relationship migration await separate review.
