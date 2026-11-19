import {
  generate,
  confirmName,
  advance,
  eligible,
  decide,
} from '../src/engine.ts'
import { settle } from '../src/engine/legal.ts'
const born = (seed) => confirmName(generate(seed), '宁')
const totals = {
  lives: 512,
  age5: 0,
  personalBorrowers: 0,
  creditorVisits: 0,
  unsupportedClaims: 0,
  insolventEstates: 0,
}
const examples = {}
for (let i = 0; i < 512; i++) {
  let s = born('debt' + i),
    steps = 0
  while (!s.dead) {
    const before = s,
      e = eligible(s).find((e) => e.id === s.pending)
    s = e ? decide(s, e.choices[0][1]) : advance(s)
    if (++steps > 220) throw Error('stalled')
    if (s.age === 5 && before.age === 4 && !s.dead) totals.age5++
    if (
      e?.id === 'turn' &&
      s.training === '未入学' &&
      s.debt > 0 &&
      before.cash < 5 &&
      !examples.A
    )
      examples.A = {
        seed: s.seed,
        age: s.age,
        householdDebt: s.debt,
        cash: before.cash,
        response: s.chronicle.at(-1).text,
      }
    if (e?.id === 'collect') totals.creditorVisits++
    if (e?.id === 'demand') {
      totals.unsupportedClaims++
      examples.B ??= {
        seed: s.seed,
        age: s.age,
        birthDebt: s.estates.birth.debt,
        newHouseDebt: s.debt,
        purseBefore: before.purse,
        purseAfter: s.purse,
        response: s.chronicle.at(-1).text,
      }
    }
    for (const loan of s.loans) {
      if (
        loan.creditor !== 'local-lender' ||
        (loan.debtor !== 'player' &&
          !s.npcs.some((n) => n.id === loan.debtor)) ||
        ![loan.original, loan.balance, loan.writtenOff].every(
          (x) => Number.isSafeInteger(x) && x >= 0,
        ) ||
        loan.balance + loan.writtenOff > loan.original
      )
        throw Error('invalid loan')
    }
    for (const t of s.settlements) {
      if (
        t.paid + t.writtenOff !== t.liabilities ||
        t.paid > t.assets ||
        t.shares.some((x) => x.net !== x.gross - x.charge) ||
        (t.shares.length &&
          t.shares.reduce((v, x) => v + x.net, 0) !== t.assets - t.paid)
      )
        throw Error('invalid settlement')
    }
  }
  totals.personalBorrowers += Number(s.loans.some((l) => l.debtor === 'player'))
  totals.insolventEstates += s.settlements.filter(
    (t) => t.writtenOff > 0,
  ).length
}
const s = born('three-heirs')
s.npcs[0].alive = false
s.npcs[0].money = 600
s.npcs.push({ ...s.npcs[2], id: 'thirdChild' })
s.loans.push({
  id: 'estate-fixture',
  original: 300,
  balance: 300,
  writtenOff: 0,
  debtor: 'father',
  creditor: 'local-lender',
  year: s.year - 1,
  due: s.year + 2,
})
settle(s, 'father')
examples.C = { fixture: true, settlement: s.settlements[0] }
for (let i = 0; i < 100 && !examples.D; i++) {
  const s = born('credit-parent' + i)
  Object.assign(s, { age: 20, pending: 'relief', debt: 10, cash: 0 })
  s.npcs[0].money = 12
  const a = structuredClone(s),
    b = structuredClone(s)
  Object.assign(a.npcs[0], {
    generosity: 1,
    trust: 0.85,
    closeness: 0.8,
    goal: '积谷',
  })
  Object.assign(b.npcs[0], {
    generosity: 0.1,
    trust: 0.2,
    closeness: 0.3,
    goal: '授业',
  })
  const yes = decide(a, 'petition'),
    no = decide(b, 'petition')
  if (yes.debt !== no.debt)
    examples.D = {
      fixture: true,
      seed: s.seed,
      debtBefore: 10,
      after: [yes.debt, no.debt],
      responses: [yes.chronicle.at(-1).text, no.chronicle.at(-1).text],
    }
}
if (Object.keys(examples).length !== 4) throw Error('missing scenario')
console.log(
  JSON.stringify(
    {
      policy:
        'First listed option, debt0 through debt511. C and D are controlled fixtures.',
      totals,
      examples,
    },
    null,
    2,
  ),
)
