# Stage 3 — Domain operations and annual scheduling

Branch `refactor/core-architecture`. Stage 2 baseline `048fdb7a40e9c2772f5bec96c216decaa325fd81`. Stage 3 implementation `756c5c5ee9dd9490a01155c3e2f84dabe7552c03`. The following report-only commit contains this file.

## Runtime and ownership

Both public advance commands enter `scheduleYear`. Both skip commands repeatedly call their own public advance. An unnamed, deceased or paused life returns immediately. Existing decisions still require the action to appear among the pending event’s eligible choices.

| Order | Operation and state owner |
|---|---|
| 1 | Increment age and year, compute environment, then apply protagonist mortality using the pre-settlement household debt. The browser writes to a private draft of the canonical protagonist. |
| 2 | Age living residents in persisted roster order. Look up each stable ID’s original RNG key and its own household. The browser writes health, acute condition and survival to the canonical resident draft. External candidates and previously deceased residents are excluded. |
| 3 | Project to the detached working state. Process resident death notices and marriage endings in roster order. Settle resident estates in that order, then the protagonist’s estate. End a surviving spouse’s union on protagonist death. |
| 4 | Settle the current household first, then remaining accounts in original insertion order. Develop family, work and births only for a surviving protagonist. On death, record the closing entry and return. |
| 5 | Fulfil due promises, then age the external candidate and record a candidate death if drawn. Complete due education, accrue practice, update occupation, release marriage cooldown. |
| 6 | Select the forced turning point or use the original pause and weighted scene keys. Attach a wedding candidate only when required. Collect the result into canonical Life, preserving historical people and marriage edges. |

Naming now writes directly to the canonical protagonist. The canonical annual prefix and flat API share environment and mortality calculations. The flat scheduler’s death processing receives the ordered legacy keys, preserving heir sorting and final-year settlement. Stage 2’s read-only projection and frozen household account views are intact. Temporary detached command data is discarded when the command returns.

| Domain | Operation or constraint |
|---|---|
| Membership and marriage | Existing moveResidence verifies the destination and moves membership without transferring property. joinFamily rejects a dead participant, existing spouse, self admission or duplicate roster identity before creating the union. Endowments and the wedding fee retain their existing separate effects. |
| Resources | transferSavings conserves household cash plus personal money. payHouseDebt debits the person’s available money and reduces common debt equally. Contractual repayment, household production, expenditure and estate disposal retain separate paths. |
| Occupation and health | changeOccupation checks the participant is alive and the new occupation is populated. It serves annual career progression and event-driven job changes. NPC birthday assignments remain in family development. The annual health phases require a resident household and an explicit RNG key. |
| Inheritance | settle retains its dead-owner and idempotency checks. Before mutating loans or money, it validates recoverable amount, distinct living recipients, allocation totals and each net share. The dynasty ruleset supplies eligibility, recovery and division. |
| Relationships | remember validates the living participant against the roster or current candidate before updating trust, conflict and bounded memory. Structural marriage and parentage remain separate from subjective attitudes on collection. |

Structural checks concern identity, membership, account ownership and conservation. Western Han eligibility, marriage timing, authority, loan assent and inheritance policy remain in their existing rules. No gameplay correction was approved or observed. Malformed domain input can now fail earlier, including an invalid inheritance allocation before loan balances change.

## Verification

`npm test` passed all 51 tests across nine suites, including all 48 Stage 2 tests. The three added fixtures cover stable-ID renumbering and command input immutability, cash transfer versus debt service, and rejection of invalid heir/division rules before mutation. Existing fixtures cover repeated residence changes, dormant and closed accounts, marriage admission, widowhood and remarriage, estate ordering, candidate exclusion and archival, and unresolved references. `npm run build` passed TypeScript, Vite production bundling and offline HTML packaging.

The paired runner executed the independently bundled Stage 2 public Life API against the Stage 3 Life API using quality0–quality599 for each policy. It compared the complete canonical state and legacy projections after generation, naming, every advance and every choice, checked the offered actions and stable keys, validated people and household invariants, and independently imported 4,516 age-40 or terminal snapshots. All rows give the same result for both versions.

| Policy | Completed lives | Checkpoints | Ever married | Current household in debt at 25 / survivors |
|---|---:|---:|---:|---:|
| First option | 600 | 46,263 | 117 | 315 / 554 |
| Education | 600 | 46,103 | 0 | 314 / 554 |
| Conservative | 600 | 46,128 | 0 | 300 / 554 |
| Random | 600 | 46,285 | 58 | 311 / 554 |

**First divergence:** none in 184,779 checkpoints. The runner stops on the first field difference in each policy and prints the policy, seed, age, command, household, path and old/new values. All four golden trajectories reproduced the checked-in fixture byte-for-byte. Independent old/new runs of character-runs, cohort, debt-runs, families, household-runs, memory-pair, pair and phase2a1 produced identical output.

## Browser baseline

Linux x86-64, Chrome 156. Each engine received the same Stage 2 input snapshot for each command. Timings are milliseconds per call, measured with performance.now in the browser. The benchmark rotated method order, warmed up three batches, and measured 21 batches of 32 calls. The table gives median / 95th-percentile **batch means**. Fixture construction and rendering were outside the timed sections.

| Fixture | Stage 2 command | Stage 3 command | Project Life → flat | Collect flat → Life | Clone Life | Clone flat |
|---|---:|---:|---:|---:|---:|---:|
| quality1, age 10, advance, 4 people | .234 / .369 | .241 / .409 | .056 / .100 | .069 / .128 | .041 / .069 | .034 / .059 |
| quality1, age 15, learn, 4 people | .272 / .438 | .253 / .444 | .078 / .119 | .078 / .134 | .056 / .075 | .056 / .081 |
| quality3, age 65, advance, 5 people | .478 / .634 | .484 / .863 | .150 / .284 | .147 / .191 | .138 / .169 | .112 / .184 |

At age 65, the isolated median costs of projection and collection total about 0.297 ms, compared with 0.484 ms for an entire Stage 3 advance. Each conversion includes its own copying. The separate clone measurements overlap those costs and cannot be added to them. The late-life p95 batch mean rose in this run. Three snapshots in a single browser session establish a baseline only. Input-to-paint latency, mobile browsers and very large family graphs remain unmeasured.

## Reproduction

From the Stage 3 repository with dependencies installed, extract the pinned baseline and bundle its API independently.

```sh
prior=$(mktemp -d)
git archive 048fdb7a40e9c2772f5bec96c216decaa325fd81 src | tar -x -C "$prior"
cat > "$prior/oracle.ts" <<'ORACLE'
export * from './src/engine/life.ts'
export {eligible, random} from './src/engine.ts'
ORACLE
node_modules/.bin/esbuild "$prior/oracle.ts" --bundle --platform=node --format=esm --outfile="$prior/oracle.mjs"
node_modules/.bin/esbuild scripts/compare-people.mjs --bundle --platform=node --format=esm --outfile="$prior/run.mjs"
for policy in first education conservative random
do
  node "$prior/run.mjs" "$prior/oracle.mjs" "$policy" 600 || exit 1
done
node scripts/browser-baseline.mjs "$prior"
```

Setting BENCHMARK_HTML_DIR to a scratch directory writes the same browser benchmark as a static page for an interactive browser.

## Changed files and remaining work

| Files | Change |
|---|---|
| src/engine.ts, src/engine/life.ts, src/engine/scheduler.ts | Public command entry points, canonical annual prefix and shared annual sequence |
| src/engine/operations.ts, src/engine/economy.ts | Guarded naming, money and occupation operations and shared environment calculation |
| src/engine/family.ts, src/engine/encounters.ts, src/engine/legal.ts | Residence and marriage admission checks, resident mortality, family memories, payments and estate validation |
| scripts/compare-people.mjs, scripts/browser-baseline.mjs, tests/scheduler.test.ts | Independent canonical comparison, browser benchmark and regression fixtures |
| docs/architecture/08_STAGE_3_REPORT.md | Stage 3 review record |

Remaining flat execution includes generation, resident death consequences, historical legality, household settlement, family development, external candidate health, promises, event gates and choice resolution. The observation layer still projects for browser reads. These paths and the copy costs above are the carry-forward boundary for Stage 4 review. The published game contains one scheduler and the existing compatibility adapter. Only the test and benchmark harnesses load the frozen Stage 2 engine.
