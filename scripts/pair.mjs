import {
  generate,
  confirmName,
  advance,
  decide,
  eligible,
} from '../src/engine.ts'
function run(seed, choice) {
  let s = confirmName(generate(seed), '安')
  while (!s.dead && s.age < 40) {
    if (!s.pending) {
      s = advance(s)
      continue
    }
    const event = eligible(s).find((e) => e.id === s.pending)
    s = decide(s, event.id === 'turn' ? choice : event.choices[0][1])
  }
  return {
    seed,
    age: s.age,
    alive: !s.dead,
    training: s.training,
    skill: s.skill,
    work: s.work,
    cash: s.cash,
    purse: s.purse,
    debt: s.debt,
    ledger: s.ledger.filter((e) => e.cause === 'turn'),
  }
}
// Find an illustrative matched pair, not an estimate of treatment effect.
for (let i = 0; i < 1000; i++) {
  const a = run('pair' + i, 'learn'),
    b = run('pair' + i, 'work')
  if (
    a.alive &&
    b.alive &&
    a.training === '学成' &&
    a.work !== b.work &&
    a.ledger.some((e) => e.text.includes('接账'))
  ) {
    console.log(JSON.stringify([a, b], null, 2))
    break
  }
}
