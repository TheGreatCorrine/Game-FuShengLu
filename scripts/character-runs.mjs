import {
  generate,
  confirmName,
  decide,
  advance,
  eligible,
  participant,
  narrative,
} from '../src/engine.ts'
import { memoryPair } from './relationship-fixture.mjs'
const born = (seed) => confirmName(generate(seed), '宁')
const demos = {},
  counts = {},
  totals = { lives: 256, quietYears: 0, decisions: 0 }
for (let i = 0; i < 256; i++) {
  let s = born('character' + i),
    firstCandidate = null
  while (!s.dead) {
    if (!s.pending) {
      s = advance(s)
      if (!s.pending && !s.dead) totals.quietYears++
      continue
    }
    const e = eligible(s).find((e) => e.id === s.pending),
      n = participant(s, e.id)
    totals.decisions++
    counts[e.id] = (counts[e.id] || 0) + 1
    let action = e.choices[0][1]
    if (e.id === 'wedding' && !firstCandidate) {
      firstCandidate = {
        id: n.id,
        name: n.name,
        age: s.age,
        work: n.work,
        goal: n.goal,
      }
      action = 'meet'
    } else if (e.id === 'wedding' && firstCandidate?.id === n.id && !demos.B)
      demos.B = {
        seed: s.seed,
        first: firstCandidate,
        again: {
          age: s.age,
          name: n.name,
          remembered: n.history.some((m) => m.id === 'meeting'),
        },
        action,
      }
    const old = s
    s = decide(s, action)
    if (
      e.id === 'spousePlan' &&
      !demos.C &&
      s.npcs.find((k) => k.id === n.id)?.work !== n.work
    ) {
      const objected = decide(old, 'object')
      demos.C = {
        seed: s.seed,
        age: s.age,
        initiator: n.name,
        goal: n.goal,
        before: n.work,
        proposal: narrative(old, e.id, e.body),
        action,
        response: s.chronicle.at(-1).text,
        ifObject: objected.chronicle.at(-1).text,
      }
    }
  }
}
for (let i = 0; i < 100 && !demos.A; i++) {
  const s = born('fathers' + i)
  Object.assign(s.households[s.residence], { cash: 25, debt: 3 })
  Object.assign(s, {
    age: 15,
    year: s.birth + 15,
    pending: 'turn',
  })
  const a = structuredClone(s),
    b = structuredClone(s)
  Object.assign(a.npcs[0], { generosity: 0.95, goal: '授业' })
  Object.assign(b.npcs[0], { generosity: 0.05, goal: '积谷' })
  const outcomes = [a, b].map((x) => decide(x, 'learn'))
  if (outcomes[0].training !== outcomes[1].training)
    demos.A = {
      fixture: true,
      seed: s.seed,
      age: 15,
      cash: 25,
      debt: 3,
      choices: ['learn', 'learn'],
      results: outcomes.map((x) => [x.training, x.chronicle.at(-1).text]),
    }
}
demos.D = memoryPair('memory12')
if (Object.keys(demos).length !== 4) throw Error('Missing scenario')
console.log(
  JSON.stringify(
    {
      policy:
        'meet first candidate, otherwise first eligible option; C also forks on objection',
      totals,
      counts,
      demos,
    },
    null,
    2,
  ),
)
