import { settle } from '../src/engine/legal.ts'
import { household } from '../src/engine/economy.ts'
import {
  generate,
  confirmName,
  advance,
  decide,
  eligible,
} from '../src/engine.ts'
const examples = {}
for (let i = 0; i < 512 && Object.keys(examples).length < 4; i++) {
  let s = confirmName(generate('debt' + i), '安')
  while (!s.dead) {
    const before = s,
      e = s.pending && eligible(s).find((e) => e.id === s.pending)
    s = e ? decide(s, e.choices[0][1]) : advance(s)
    const row = { seed: s.seed, age: s.age }
    if (
      !examples.A &&
      e?.id === 'turn' &&
      s.training === '未入学' &&
      s.debt > 0 &&
      s.cash === 0
    )
      examples.A = {
        ...row,
        debt: s.debt,
        cash: s.cash,
        choice: 'learn',
        result: s.chronicle.at(-1).text,
      }
    if (
      !examples.B &&
      before.residence === 'birth' &&
      s.residence !== 'birth' &&
      before.debt > 0
    )
      examples.B = {
        ...row,
        choice: 'marry',
        original: before.debt,
        retained: s.estates.birth.debt,
        destination: s.debt,
      }
    const parent = s.settlements
      .slice(before.settlements.length)
      .find((t) => ['father', 'mother'].includes(t.owner))
    const dependents = s.npcs.filter(
      (n) => n.alive && n.age < 15 && n.house === 'birth',
    )
    if (!examples.C && parent && dependents.length)
      examples.C = {
        ...row,
        parent: parent.owner,
        heirs: parent.shares,
        dependent: dependents[0].id,
        ageOfDependent: dependents[0].age,
        head: s.heads.birth,
        householdDebt: s.residence === 'birth' ? s.debt : s.estates.birth.debt,
      }
    const closed = Object.keys(s.closedHouses).find(
      (id) =>
        before.closedHouses[id] === undefined &&
        s.npcs.some((n) => n.house === id),
    )
    if (closed && !examples.D)
      examples.D = {
        ...row,
        closed,
        membersRetained: s.npcs
          .filter((n) => n.house === closed)
          .map((n) => n.id),
        removedFromEconomy: !s.estates[closed],
      }
  }
}
if (!examples.B) {
  // Controlled event boundary: cash already earmarked for a wedding while an old debt remains.
  for (let i = 0; i < 100; i++) {
    const s = confirmName(generate('separate' + i), '安')
    Object.assign(s, {
      age: 25,
      year: s.birth + 25,
      cash: 200,
      debt: 500,
      pending: 'wedding',
    })
    const moved = decide(s, 'marry')
    if (moved.residence !== 'birth') {
      examples.B = {
        fixture: true,
        seed: s.seed,
        action: 'marry',
        oldCash: moved.estates.birth.cash,
        oldDebt: moved.estates.birth.debt,
        newCash: moved.cash,
        newDebt: moved.debt,
        privateBefore: s.purse,
        privateAfter: moved.purse,
      }
      break
    }
  }
}
if (!examples.D) {
  const s = confirmName(generate('cleared-house'), '安')
  s.residence = 'independent'
  s.estates.birth = { cash: 7, debt: 7, assets: 0 }
  for (const n of s.npcs) {
    n.alive = false
    n.health = 0
    n.money = 0
    settle(s, n.id)
  }
  // The fixture has completed private inheritance, and exactly seven common coins remain due.
  const before = s.npcs.map((n) => n.id)
  household(s)
  const closeYear = s.closedHouses.birth
  s.year++
  household(s)
  examples.D = {
    fixture: true,
    seed: s.seed,
    closeYear,
    stillClosed: s.closedHouses.birth === closeYear,
    bookRemoved: !s.estates.birth,
    kin: before,
    estatesSettled: s.settlements.length,
  }
}
if (
  (!examples.D.bookRemoved && examples.D.fixture) ||
  Object.keys(examples).length !== 4
)
  throw Error('Missing demonstration')
console.log(JSON.stringify(examples, null, 2))
