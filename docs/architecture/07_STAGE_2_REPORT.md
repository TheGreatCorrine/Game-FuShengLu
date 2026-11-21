# Phase 2A.2 Stage 2 — Stable people and relationships

Baseline `31b14c404cc28ac4313f8f5fbf6f7d4a9c361b9e`. Verified implementation `5bc4171f78699c158e94edcae1e8ab1388f1890f`. Branch `refactor/core-architecture`.

## Runtime boundary

The browser holds a canonical Life between commands. Generate, name, advance, decide, skip and restore are in src/engine/life.ts. The existing Stage 1 public API in src/engine.ts still accepts its original state shape. The new command boundary translates stable references to the old execution keys for one command and collects the result. Stage 3's scheduler and domain-operation changes remain pending review. Detached render projections expose frozen accounts. The canonical life retains exactly one writable book per household; relationships contain no account balances.

## Migration mapping

|Stage 1 fact|Stage 2 owner and conversion|
|---|---|
|Player fields, npcs, candidate|One registry keyed by life-local p0, p1, … . The player record owns its identity, health, purse and residence. NPCs keep attributes, personal money, experiential memories and actual household. The allocation cursor persists across serialization; importing a Stage 1 snapshot establishes IDs for that import. Old independent snapshots cannot be assumed to share the same numbering.|
|Former role IDs, roster array order|legacyKeys maps stable IDs to the original person keys for RNG, event/authority lookups and legacy heir sorting. residentOrder preserves NPC traversal and tie breaks and includes deceased roster members. Each person's household field owns their residence.|
|parents and implicit player ancestry|parentIds records canonical child → parent edges. Stage 1 ordinary births explicitly map the original father/mother. The adapter supplies structural player parent keys to the existing inheritance rule.|
|partner, spouse, marriage, unions|Canonical marriage pairs with optional start and end evidence. Current spouse, union count and display status are projections. On import, a confirmed roster spouse or the legacy sibling-union creation convention can establish a former relationship. A recorded successful marriage decision can establish a year. Missing dates remain null. New observed union transitions carry the engine year.|
|trust, closeness, conflict, history|towardPlayer holds the NPC's directed attitude, with original ordering, magnitude and referenced actors. The opposite direction stays unspecified. Textual experiences used by the original career rules remain on the individual.|
|Unmarried candidate|Single stable person referenced by candidateId, with null economic residence. Excluded from resident iteration. Meeting and marriage retain identity and memories. New play keeps a candidate who dies in the registry with the observed condition; the legacy view still removes the candidate.|
|Heads, debtors, estate owners, heirs, promises|Translate each person reference through the explicit map. Contract IDs, external lender, household IDs, amounts and payout order keep their meanings. Unresolved authoritative references abort import.|
|Chronicle, ledger, news, memory actors|Known actors resolve to stable IDs. An old historical-only mention lacking a recoverable person is tagged unresolved with its original key. No person, parent, spouse or date is manufactured. The original key is available on legacy export.|

A canonical save resumes with `migratePeople(JSON.parse(saved))`. Imports of legacy snapshots detached from their source cannot recover previously deleted candidates' unrecorded details. IDs are stable within the life and canonical saves. Current content still has a single designated sibling event slot; multiple siblings and children are representable without expanding event mechanics.

## Tests and paired results

48 tests passed in eight files, including all 39 prior tests and nine new identity tests. TypeScript, Vite production build and offline output succeeded. The four golden games ran through the **new browser command boundary** and matched the original fixtures byte for byte. All eight existing simulation scripts also matched Stage 1 byte for byte through the compatibility API.

The paired runner exercised the new and old engines using identical commands. At each checkpoint it compared owner-indexed accounts, every projected legacy State field and prior stable ID assignments; it validated the graph, active spouses, parent ancestry, candidate/resident separation and household references. At pending decisions it compared the available choices. It also independently re-imported the old engine's snapshots at age 40 and death.

|Policy|Completed pairs|Checkpoints|Independent imports|Ever married, old = new|Age-25 households in debt, old = new|
|---|---:|---:|---:|---:|---:|
|First|600|46,263|1,128|117|315 / 554|
|Conservative|600|46,128|1,131|0|300 / 554|
|Education|600|46,103|1,128|0|314 / 554|
|Random valid choice|600|46,285|1,129|58|311 / 554|
|Total|2,400|184,779|4,516| | |

**First divergence:** none across these paired trajectories. The runner's first-difference output includes policy, seed, age, command, household, field path, old/new values and the NPC when a roster path identifies one. Golden and aggregate checks supplement this comparison. These samples do not establish equivalence for arbitrary hand-built or malformed saves.

Synthetic fixtures cover distinct siblings, two children, in-laws, repeat residence transfers, external candidate survival/acceptance/death, widowhood followed by remarriage, unknown dates, role-independent parent inheritance and remainder order, debt and promise references, pending save restoration, and rejection of duplicate or dangling active references. An unrecoverable historical mention stays explicit. The only intended new observable data is in the canonical storage/debugging API: stable references, structural history and preserved external deaths. Player-facing outcomes showed no divergence in the sample.

## Reproduction

From a checkout containing the baseline commit and installed lockfile dependencies:

```sh
set -eu
out=$(mktemp -d)
git archive 31b14c4 src | tar -x -C "$out"
node_modules/.bin/esbuild "$out/src/engine.ts" --bundle --platform=node --format=esm --outfile="$out/base.mjs"
node_modules/.bin/esbuild scripts/compare-people.mjs --bundle --platform=node --format=esm --outfile="$out/compare.mjs"
for policy in first conservative education random; do
  node "$out/compare.mjs" "$out/base.mjs" "$policy"
done
node_modules/.bin/esbuild scripts/architecture-golden.mjs --platform=node --bundle --outfile="$out/golden.cjs"
node "$out/golden.cjs" > "$out/golden.jsonl"
cmp "$out/golden.jsonl" docs/architecture/fixtures/golden.jsonl
npm test
npm run build
```

## Changed files

- `scripts/architecture-golden.mjs`
- `scripts/compare-people.mjs`
- `src/data.ts`
- `src/engine.ts`
- `src/engine/life.ts`
- `src/engine/people.ts`
- `src/engine/types.ts`
- `src/main.tsx`
- `tests/people.test.ts`
- `docs/architecture/07_STAGE_2_REPORT.md` (this report)

Full-state projection and collection incurs copying per command. This stage measured correctness; browser performance has not been benchmarked. Later domain services may consume stable IDs directly once reviewed.
