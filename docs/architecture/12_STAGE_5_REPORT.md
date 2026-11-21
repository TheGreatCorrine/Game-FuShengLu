# Stage 5 · Final architecture and playable release acceptance

**Recommendation: approve the refactor branch for merge.** The implementation and local release checks cover the Western Han slice. The decision to merge remains with the maintainer.

## Revision and scope

| Commit | Scope and exact files |
| --- | --- |
| `1a2e5a23ab0354bcba88868866782b56e3bc0cb6` | Reviewed Stage 4.5 starting point |
| `2d4efb1442b5126db5d39c8e98ab8a622f80293d` | Removed `.github/workflows/ci.yml` |
| `52ab13faf7ae5b534c8597020a2d13b10cc23534` | Updated `src/engine/domain.ts`, `src/engine/family.ts`, `src/content/western-han/authority.ts`. Added `tests/marriage-history.test.ts` |
| `0761fdeb56df3e43eb4ea360eab0238384df1f38` | Updated `scripts/compare-people.mjs` to accept an optional seed prefix. Added `scripts/playable-smoke.mjs` |
| Report commit, identified by the permalink for this document | Updated `README.md`, `fushenglu_gdd/README.md`, `docs/architecture/README.md`. Added `docs/architecture/12_STAGE_5_REPORT.md` |

## Confirmed defect and correction

The synthetic seed `npc-union-history` has a sibling with an ended union with p4 and an active union with p5. Both spouses are eligible adults in household `sibling`; the sibling is ill. Before the correction, `partnerOf` returned p5, but `authority(life, 'sibling')` returned p4 because the succession helper took the first marriage in the archive. The fixture reproduced that failure on the reviewed implementation. Succession now returns p5. The historical contact lookup prefers an active union and otherwise retains the latest recorded union contact for succession. Parenthood uses only the current spouse. An existing child from an earlier union still counts toward the existing single sibling-child storyline. Both closed and active marriage records remain intact. The original formation gate still checks for any previous union.

This changes the result for a supplied multi-union NPC fixture. All comparisons of generated games below matched the frozen oracle. No change was made to content, probabilities, fees, text, annual timing or the player interface.

## Deterministic comparisons

The primary oracle remains Stage 4 commit `ab16f572837429935f22d60a6f3d5c59ca6920d7`. Both engines received the same seed and each chosen command. At generation, naming, each advance, each choice and death, the runner compared the canonical graph, stable identity keys, household accounts, legacy projections and player observations, checked structural invariants and compared pending choices. Snapshot imports were checked at age 40 and at death when applicable.

Each table cell reports the result for **both** engines. Married means ever married by death. Debt is the number of current households with debt at age 25 divided by survivors at that age.

| Seed corpus | Policy | Lives | Checkpoints | Ever married | Debt / alive at 25 |
| --- | --- | ---: | ---: | ---: | ---: |
| quality0–599 | First | 600 | 46,263 | 117 | 315 / 554 |
| quality0–599 | Education | 600 | 46,103 | 0 | 314 / 554 |
| quality0–599 | Conservative | 600 | 46,128 | 0 | 300 / 554 |
| quality0–599 | Random | 600 | 46,285 | 58 | 311 / 554 |
| acceptance0–999 | First | 1,000 | 76,511 | 237 | 497 / 923 |
| acceptance0–999 | Education | 1,000 | 76,318 | 0 | 494 / 923 |
| acceptance0–999 | Conservative | 1,000 | 76,116 | 0 | 475 / 923 |
| acceptance0–999 | Random | 1,000 | 76,414 | 108 | 483 / 923 |

The established 2,400 lives matched at all 184,779 checkpoints. The independent 4,000 lives matched at all 305,359 checkpoints. All 6,400 trajectories reached death, with zero crashes, invalid states or first divergences. The runner checked 11,954 snapshot imports across both corpora. First-choice marriage frequency varied between seed sets (19.5% and 23.7%). Education and conservative policies yielded zero marriages in both sets. Each of these distributions was also present in the old engine on the same seeds.

## Local verification

- Node 24.22.3 and npm 11.19.1. Clean `npm ci`, full `npm test` (61/61 in 12 files), `npm run build` (TypeScript, Vite and offline packager) passed.
- A separate focused run passed all 24 tests in the marriage-history, canonical, accounts, people and observation suites. The complete suite also exercised death, inheritance, contract debt, NPC livelihoods, widowhood, remarriage, residence transfers, event eligibility and the annual scheduler.
- Four stored golden trajectories matched byte-for-byte. All eight simulation outputs matched Stage 4 byte-for-byte: `character-runs`, `cohort`, `debt-runs`, `families`, `household-runs`, `memory-pair`, `pair`, `phase2a1`.
- The canonical command test replaces the three snapshot adapters with throwing functions and completes four named lives through generate, advance, skip, observe and decide. Imports, exports, explicit validation and developer inspection retain their compatibility boundaries.
- The workflow was removed. All acceptance checks ran locally. Hosted CI is outside the release criteria.

## Playable smoke

Playwright drove the actual rendered controls in headless Chromium 153.0.8010.0. The development run used the existing debug seed field. Production and offline runs fixed the single seed draw to 1 at the browser boundary. All subsequent transitions used the displayed controls and first offered choices.

| Surface | Result |
| --- | --- |
| Local Vite development | Debug seed control worked. Closing the panel restored the normal player view. All 17 choices and the ending passed. |
| Built `dist/` via local Vite preview | Same 17 age/choice pairs, household change and ending. No debug control. |
| Generated `PLAY.html` via file URL | Browser network disabled, zero HTTP(S) requests. Same 17 choices and ending. No debug control. |

On all three surfaces the empty name could not be submitted. The player entered 宁, opened finances and kin, advanced a single year, then skipped to decisions. Age 8 offered writing practice; age 15 offered schooling. The age-34 marriage changed the kin panel from the birth household to married and living with in-laws. Later choices included borrowing and repaying personal money. Widowhood was visible at age 67. Death at 74 revealed the ending and historical source text. Restart returned to birth with an empty name. No uncaught page errors occurred. The final offline file was 191,276 bytes, SHA-256 `3c34b356cedb746113104ba64ca30767249099220950cbc127eeacff06b917ed`.

## Architecture, entry points and limitations

The production entry point connects `src/main.tsx` to Life commands and passes `observePlayer` output to `PlayerView`. Stable people, parentage, marriage history, attitudes, current residence and household books each have their existing canonical owner. The flat-client entry point in `src/engine.ts` shares the domain procedures and explicitly projects for flat generation. Developer inspection projects on development renders. Import validation reuses projected household checks. Narrative roles, historic RNG keys and inheritance tie breaks remain compatible. Commands still clone the immutable input. Stage 5 did not modify the dependency manifest or lockfile. The optional smoke harness uses a separately available Playwright installation and browser.

The GDD distinguishes the implemented Western Han four-origin slice from the future nine-system design, annual actions and hidden traits. The game has import APIs and migration tests; the normal UI starts a new life on refresh. README now distinguishes a built playable package from a source checkout. Earlier architecture reports describe their respective revisions.

Acceptance covers the four tested policies and the stated seeds, one desktop Chromium version and one fully exercised browser seed. Safari, Firefox, mobile touch interaction, exhaustive graph coverage and a human assessment of balance are outside this evidence. No hosted QA or external billing steps are required.

## Reproduction

Use the oracle bundling commands in the Stage 4.5 report. With its `out` directory and the current comparison runner bundle, execute:

```sh
npm ci
npm test
npm run build
for policy in first education conservative random; do
  node "$out/pair.mjs" "$out/oracle.mjs" "$policy" 600
  node "$out/pair.mjs" "$out/oracle.mjs" "$policy" 1000 acceptance
done
node scripts/architecture-golden.mjs > "$out/golden.jsonl"
cmp docs/architecture/fixtures/golden.jsonl "$out/golden.jsonl"
```

After building, run `node scripts/playable-smoke.mjs` with Playwright and Chromium available. The harness starts and closes local servers. An existing installation can be selected through `PLAYWRIGHT_MODULE` and `CHROMIUM_PATH`. `CHROMIUM_ARGS` optionally supplies a JSON array of launch flags. Node 22.18+ or 24 supports the direct TypeScript imports used by the game diagnostics.
