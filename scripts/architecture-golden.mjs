// Run against the public commands. The fixture records decisions as well as state.
import { advance, confirmName, decide, eligible, generate, random } from '../src/engine.ts'
import { createHash } from 'node:crypto'
for (const [seed, policy] of [['quality7','first'], ['quality3','education'], ['quality31','conservative'], ['quality24','random']]) {
  let state = confirmName(generate(seed), '宁')
  const steps = [], hash = createHash('sha256')
  function checkpoint() {
    hash.update(JSON.stringify(state) + '\n')
  }
  checkpoint()
  while (!state.dead) {
    state = advance(state)
    checkpoint()
    if (!state.pending) continue
    const actions = eligible(state).find(e => e.id === state.pending).choices.map(c => c[1])
    const priority = policy === 'education' ? ['learn','halfDays','trialSkill','career','meet']
      : policy === 'conservative' ? ['save','pass','work','petition','waitPlan','trialSkill'] : []
    const action = policy === 'random' ? actions[Math.floor(random(seed,'policy'+state.age)*actions.length)]
      : priority.find(a => actions.includes(a)) ?? actions[0]
    steps.push([state.age,state.pending,action])
    state = decide(state,action)
    checkpoint()
  }
  console.log(JSON.stringify({seed,policy,steps,death:state.age,unions:state.unions,settled:state.settlements.length,sha256:hash.digest('hex')}))
}
