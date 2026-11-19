# 年度结算与信息边界

src/data.ts defines regional profiles, birth weights, dated shocks, household assets and education access, and 18 one-use scenes. The rules object describes the supported population and configurable marriage and estate parameters. Historical dates in content use positive BCE labels. State uses astronomical years (1 BCE = 0).

src/engine.ts exposes generate, confirmName, advance, skip and decide. Commands return a new state or the unchanged state when the clock is blocked. A keyed deterministic draw uses the seed, actor or event identifier and year. Adding narrative prose consumes no draws. The annual order is world exposure → household accounts → kin → death → due consequences → eligible choices. A queued choice freezes the clock. Death freezes the life. The scheduler uses ages for personal obligations and years for historical shocks. Subannual effects would require a finer clock and rate conversion.

The household consumes income, pays expenses and repays debt before saving. Personal wages go into the protagonist’s purse. NPC money remains individually held. A living parent’s outlook, trust, liquid resources, obligations and access to learning affect whether a request succeeds. NPCs also age, begin work, retire, contribute to the house, teach and die independently. Partnership can create a child. Kin relations use stable life-local role IDs.

The interface renders filtered observations and chronicle entries. The end screen joins exposure IDs back to canonical facts. Developer mode alone exposes the raw state. The causal ledger retains the initiating scene ID on later settlements; inspect entries tagged turn at 15, 18 or 21, and 40. A qualified character can receive a separate ledger-work offer. No simulation module imports React. All state is volatile.
