// Natural runs. Use option zero whenever a decision interrupts the clock.
import {
  generate,
  confirmName,
  advance,
  decide,
  eligible,
} from '../src/engine.ts'
const examples = {},
  stats = {
    lives: 512,
    age5: 0,
    married: 0,
    widowed: 0,
    remarried: 0,
    severalChildren: 0,
    letters: 0,
    maxKin: 0,
  }
const trajectories = []
for (let i = 0; i < stats.lives; i++) {
  const seed = 'family' + i
  let s = confirmName(generate(seed), '宁')
  while (!s.dead) {
    const old = s,
      action = s.pending
        ? eligible(s).find((e) => e.id === s.pending).choices[0][1]
        : null
    s = action ? decide(s, action) : advance(s)
    const snapshot = { seed, age: s.age, action: action || 'advance' }
    const newNotes = s.chronicle.slice(old.chronicle.length).map((e) => e.text)
    if (s.age === 5 && old.age === 4 && !s.dead) stats.age5++
    for (const n of s.npcs) {
      const oldKin = old.npcs.find((o) => o.id === n.id)
      if (
        !oldKin ||
        n.work === '家中休养' ||
        n.age < 16 ||
        oldKin.work === n.work ||
        !newNotes.some((t) => t.includes(n.name))
      )
        continue
      if (
        trajectories.length < 3 &&
        !trajectories.some((t) => t.role === n.role)
      )
        trajectories.push({
          ...snapshot,
          role: n.role,
          person: n.name,
          goal: n.goal,
          ambition: n.ambition,
          from: oldKin.work,
          to: n.work,
          notes: newNotes,
        })
    }
    if (
      !examples.B &&
      s.unions > old.unions &&
      s.residence !== 'birth' &&
      s.npcs.some((n) => n.tier === 2 && n.house === s.residence)
    ) {
      examples.B = {
        ...snapshot,
        spouse: s.spouse,
        residence: s.residence,
        kin: s.npcs
          .filter((n) => n.house === s.residence)
          .map((n) => [n.id, n.role]),
        notes: newNotes,
      }
    }
    if (
      !examples.C &&
      old.estates.birth &&
      s.estates.birth &&
      s.estates.birth.debt !== old.estates.birth.debt &&
      s.age > old.age
    ) {
      examples.C = {
        ...snapshot,
        oldDebt: old.estates.birth.debt,
        newDebt: s.estates.birth.debt,
        homeMembers: s.npcs
          .filter((n) => n.alive && n.house === 'birth')
          .map((n) => n.name),
      }
    }
    if (s.pending === 'letterHome' && old.pending !== s.pending) stats.letters++
    if (
      !examples.E &&
      action === 'aid' &&
      old.chronicle.some((e) => e.text.includes('还债'))
    ) {
      examples.E = {
        ...snapshot,
        earlier: old.chronicle.filter((e) => e.text.includes('还债')).slice(-3),
        debt: [old.estates.birth.debt, s.estates.birth.debt],
        purse: [old.purse, s.purse],
        response: newNotes,
      }
    }
    if (!examples.F && s.unions === 2 && old.unions === 1) {
      examples.F = {
        ...snapshot,
        first: s.npcs
          .filter((n) => n.role === '伴侣')
          .map((n) => [n.id, n.alive, n.partner]),
        history: s.chronicle.filter(
          (e) => e.text.includes('成家') || e.text.includes('伴侣离世'),
        ),
      }
    }
  }
  stats.married += Number(s.unions > 0)
  stats.widowed += Number(s.chronicle.some((e) => e.text.includes('伴侣离世')))
  stats.remarried += Number(s.unions > 1)
  stats.severalChildren += Number(
    s.npcs.filter((n) => n.role === '孩子').length > 1,
  )
  stats.maxKin = Math.max(stats.maxKin, s.npcs.length)
}
console.log(
  JSON.stringify(
    {
      policy: 'first eligible option; annual steps',
      stats,
      A: trajectories,
      ...examples,
    },
    null,
    2,
  ),
)
