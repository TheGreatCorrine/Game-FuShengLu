import {
  generate,
  confirmName,
  advance,
  decide,
  eligible,
  random,
} from '../src/engine.ts'
const deaths = [],
  ages = {},
  hist = {},
  events = {}
let weddings = 0,
  changed = 0,
  kinAlive = 0,
  transitions = 0,
  delayed = 0
const quant = (a, q) => a.sort((a, b) => a - b)[Math.floor((a.length - 1) * q)]
for (let i = 0; i < 1000; i++) {
  let s = confirmName(generate('quality' + i), '宁')
  const jobs = new Map(s.npcs.map((n) => [n.id, n.work]))
  while (!s.dead) {
    if (s.pending) {
      const e = eligible(s).find((e) => e.id === s.pending)
      events[e.id] = (events[e.id] || 0) + 1
      s = decide(
        s,
        e.choices[
          Math.floor(random(s.seed, 'policy' + s.age) * e.choices.length)
        ][1],
      )
    } else {
      s = advance(s)
      if (!s.dead && [5, 15, 25, 40, 60].includes(s.age)) {
        const a = (ages[s.age] ??= {
          alive: 0,
          jobs: {},
          coins: [],
          indebted: 0,
        })
        a.alive++
        a.jobs[s.work] = (a.jobs[s.work] || 0) + 1
        a.coins.push(s.cash)
        a.indebted += Number(s.debt > 0)
      }
    }
  }
  deaths.push(s.age)
  weddings += Number(s.npcs.some((n) => n.role === '伴侣'))
  transitions += Number(s.residence === 'marital')
  changed += s.npcs.filter(
    (n) => jobs.has(n.id) && jobs.get(n.id) !== n.work,
  ).length
  kinAlive += s.npcs.filter((n) => n.alive).length
  delayed += s.ledger.filter((e) => e.cause === 'turn' && e.age > 15).length
  for (const h of s.exposure) {
    const k = s.region + ' ' + h.id
    const a = (hist[k] ??= { encountered: 0, local: 0 })
    a.encountered++
    a.local += Number(h.load > 0)
  }
}
for (const a of Object.values(ages)) {
  a.cashQuartiles = [0.25, 0.5, 0.75].map((q) => quant(a.coins, q))
  delete a.coins
}
console.log(
  JSON.stringify(
    {
      n: deaths.length,
      meanDeath: deaths.reduce((a, b) => a + b) / deaths.length,
      deathQuantiles: [0, 0.1, 0.5, 0.9, 1].map((q) => quant(deaths, q)),
      ages,
      weddings,
      transitions,
      changed,
      kinAlive,
      delayed,
      events,
      hist,
    },
    null,
    2,
  ),
)
