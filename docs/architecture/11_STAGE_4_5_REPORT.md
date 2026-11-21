# Stage 4.5 review · Canonical engine consolidation

The production UI now generates a Life directly. Annual advancement and choice resolution each take one private structured clone before running the shared domain operations. Skip advances through the same scheduler. Player observations read the canonical records directly. The oracle is the separately bundled Stage 4 revision `ab16f572837429935f22d60a6f3d5c59ca6920d7`.

## Commit ledger

| Commit | Change |
| --- | --- |
| `0c14095df0bacf4c321ae03d2e6111ac6da7934b` | Migration sequence and dependency boundaries |
| `c0fc0c292f1dcc452a5788866f807f7b76df4524` | Direct canonical birth and stable identity allocation |
| `116f5a5c1de68b8b0e549a5962d5249ec209b929` | Death consequences, widowhood and personal estate settlement |
| `a4d25b0f2b3b0bfb10282ce1865f68585696d114` | Household accounts, annual settlement and closure |
| `ce135c4acdf5fd457d5340fe222ba15986672c6c` | Autonomous family development and structural kinship |
| `a2ebbe5fa82dcc326162bb7051522ead2c48f57a` | Candidate lifecycle, unions and deferred consequences |
| `8dc6d95218ff39777ba3d23dd828056173287e2e` | Event gates, participants and observations |
| `fa5bd09d80563a1c89e08fabfb897e69c958e1e6` | Native choices, shared negotiations and adapter-disabled regression |
| `b67c732d9c3b91164074cb6ca61d6d82ca22632a` | Paired benchmark and larger populations |
| `1a7f932ce492b9c20368c1d514b90310c6e7a074` | Resolve feast elders by parentage and verify command immutability |

## State ownership and compatibility

| Data or operation | Owner and boundary |
| --- | --- |
| People and relationships | Life owns one person registry. Parent edges, marriage records and attitudes use stable IDs. Resident order retains deterministic traversal. A living external candidate has no household membership. A deceased candidate stays in the registry. |
| Money | Each household owns a single book. People own their personal savings. Contracts and estate settlements refer to the parties by stable ID. Residence changes move membership. Explicit allocations and transfers run at their original points. |
| Random streams and ordering | Legacy keys supply historical draws and tie breaks, including the remainder order for inheritance. The scheduler preserves resident death order and the original sequence of economic settlement, family development, promises, learning and event selection. |
| Observation | The player receives disclosed facts and narrative. Debug inspection can explicitly export a flat view. Narrative roles are still displayed, while canonical participants resolve through IDs and relationships. |
| Old snapshots and public flat clients | `migratePeople` imports a snapshot and validates its references. `legacyPeopleView` exports the legacy shape. Flat-client generation exports a newly born canonical life. Clients already holding flat state can call the shared scheduler and choice procedures directly. The flat client retains its historical conventions for incomplete role-keyed fixtures. |
| Verification | Explicit validation of imported snapshots still projects for household checks. Only test and benchmark processes load the frozen old revision. Unknown historical dates remain unknown. |

## Regression evidence

Each of the six development checkpoints from birth through event selection passed the then-existing 57-test suite and four 12-seed complete-life comparisons. Each checkpoint covered 2,788 transitions across 48 policy/seed combinations. The final runner also compares complete player observations after generation, naming, annual advancement and decisions.

The final run used seeds `quality0` through `quality599` for each policy. Every checkpoint compared full canonical state, identity mappings, financial accounts and meaningful flat fields, and validated structural invariants. Pending events were checked for exact choice order. The figures below are identical for the oracle and candidate. Debt at age 25 counts the current household among survivors.

| Policy | Completed lives | Checkpoints | Snapshot import checks | Ever married | Household in debt / alive at 25 |
| --- | ---: | ---: | ---: | ---: | ---: |
| First offered | 600 | 46,263 | 1,128 | 117 | 315 / 554 |
| Education | 600 | 46,103 | 1,128 | 0 | 314 / 554 |
| Conservative | 600 | 46,128 | 1,131 | 0 | 300 / 554 |
| Random | 600 | 46,285 | 1,129 | 58 | 311 / 554 |
| Total | 2,400 | 184,779 | 4,516 | 175 | 1,240 / 2,216 |

No first differing command occurred in the deterministic corpus. A development unit fixture did expose a compatibility regression. Seed `characters`, age 30, command `authority(s, 'kin1')`, household `kin1`, field returned household head. The expected legacy ID was `kin1elder0`. The first implementation returned `player` because the synthetic flat household omitted marriage edges. The flat selector again recognizes the original elder key. Canonical households use spouse parentage. The regression fixture passes.

- Clean local lockfile install, 60 tests in 11 files, TypeScript checking, Vite production build and offline HTML generation passed.
- All four stored golden trajectories matched byte-for-byte. Output from `character-runs`, `cohort`, `debt-runs`, `families`, `household-runs`, `memory-pair`, `pair` and `phase2a1` matched Stage 4 byte-for-byte.
- The independent Stage 0 household comparator passed 184,779 transitions, 4,636 migrations and 110 residence moves.
- New tests disable the three snapshot adapters for complete canonical lives, exercise choice immutability and candidate admission, and change an elder's display label to verify structural participant selection.
- Hosted CI remains unverified following the previously reported billing restriction. The workflow remains available.

## Reproduce the comparisons

From a checkout containing the oracle revision, run the following in Bash. The benchmark accepts a Chromium executable in place of the final `node` argument.

```bash
set -eu
out=$(mktemp -d)
git archive ab16f572837429935f22d60a6f3d5c59ca6920d7 src | tar -x -C "$out"
cat > "$out/oracle.ts" <<'ORACLE'
export * from './src/engine/life.ts'
export {eligible,random} from './src/engine.ts'
export {observePlayer} from './src/engine/observation.ts'
ORACLE
npm ci
npm test
npm run build
node_modules/.bin/esbuild "$out/oracle.ts" --bundle --platform=node --format=esm --outfile="$out/oracle.mjs"
node_modules/.bin/esbuild scripts/compare-people.mjs --bundle --platform=node --format=esm --outfile="$out/pair.mjs"
for policy in first education conservative random; do
  node "$out/pair.mjs" "$out/oracle.mjs" "$policy" 600
done
node scripts/browser-baseline.mjs "$out" node
```

## Performance

Node 24.22.3, same inputs and runtime for both engines. All five fixtures passed canonical command-result equality before timing. The 64- and 256-person cases extend the age-65 life with valid working-age residents using independent IDs and memories. Three warm-up batches precede 21 measured batches. Columns give median / 95th percentile of batch means in milliseconds per command. Batches use 32 calls for ordinary fixtures, eight for 64 people and two for 256. Runtime and host load affect absolute timings.

| Fixture | Age / people | Stage 4 | Stage 4.5 | Export alone | Collect alone | Clone Life alone |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| annual (quality1) | 10 / 4 | 0.321 / 0.616 | 0.175 / 0.256 | 0.050 / 0.134 | 0.063 / 0.176 | 0.031 / 0.171 |
| choice (quality1) | 15 / 4 | 0.223 / 0.483 | 0.063 / 0.084 | 0.062 / 0.136 | 0.068 / 0.162 | 0.033 / 0.049 |
| late (quality3) | 65 / 5 | 0.394 / 0.927 | 0.122 / 0.258 | 0.115 / 0.259 | 0.118 / 0.287 | 0.082 / 0.192 |
| population64 (quality3) | 65 / 64 | 2.948 / 3.258 | 2.107 / 2.303 | 0.345 / 0.431 | 0.398 / 0.492 | 0.275 / 0.381 |
| population256 (quality3) | 65 / 256 | 10.862 / 12.180 | 9.519 / 9.803 | 1.186 / 1.459 | 1.321 / 2.551 | 0.869 / 0.992 |

Export and collection include copying. Their timings overlap the clone control and should not be summed with it. Production commands still copy the immutable input once. Large households also increase the cost of resident scans and relationship lookups. These measurements cover engine execution. The local Chromium process failed to open its singleton socket, so browser rendering latency and browser-specific speedups remain unmeasured in this stage.

## Changed files

- `docs/architecture/10_STAGE_4_5_SEQUENCE.md`
- `docs/architecture/11_STAGE_4_5_REPORT.md`
- `docs/architecture/README.md`
- `scripts/browser-baseline.mjs`
- `scripts/compare-people.mjs`
- `src/content/western-han/authority.ts`
- `src/content/western-han/catalog.ts`
- `src/content/western-han/date.ts`
- `src/content/western-han/events.ts`
- `src/content/western-han/livelihood.ts`
- `src/engine.ts`
- `src/engine/accounts.ts`
- `src/engine/birth.ts`
- `src/engine/choices.ts`
- `src/engine/domain.ts`
- `src/engine/economy.ts`
- `src/engine/encounters.ts`
- `src/engine/family.ts`
- `src/engine/legal.ts`
- `src/engine/life.ts`
- `src/engine/observation.ts`
- `src/engine/people.ts`
- `src/engine/scheduler.ts`
- `tests/canonical.test.ts`
