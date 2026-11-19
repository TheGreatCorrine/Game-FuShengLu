import { it, expect } from 'vitest'
import { generate, confirmName, decide, eligible } from '../src/engine.ts'
import {
  authority,
  borrow,
  credit,
  outstanding,
  settle,
  spendable,
} from '../src/engine/legal.ts'
import { rules, scenes } from '../src/data.ts'
const birth = (seed = 'audit') => confirmName(generate(seed), '宁')
it('assigns capable father, mother and independent heads without reassigning liability', () => {
  const s = birth()
  s.age = 20
  expect(authority(s, 'birth')).toBe('father')
  s.npcs[0].acute = '受伤'
  expect(authority(s, 'birth')).toBe('mother')
  s.households.birth = { cash: 0, debt: 45, assets: 1 }
  s.households.independent = { cash: 0, assets: 0, debt: 0 }
  s.residence = 'independent'
  expect(authority(s, s.residence)).toBe('player')
  expect(outstanding(s, 'player')).toBe(0)
})
it('settles private property once, equal shares and integer residuals; excludes deceased and unrelated kin', () => {
  const s = birth(),
    p = s.npcs[0]
  p.alive = false
  p.money = 600
  s.npcs.push(
    { ...s.npcs[2], id: 'another', parents: ['father'] },
    { ...s.npcs[2], id: 'deadHeir', alive: false },
  )
  s.loans.push({
    id: 'test',
    debtor: p.id,
    creditor: 'local-lender',
    balance: 300,
    original: 300,
    year: s.year - 2,
    due: s.year + 1,
    writtenOff: 0,
  })
  const cash = s.cash
  settle(s, p.id)
  expect(
    s.settlements[0].shares.map((x) => [x.gross, x.charge, x.net]),
  ).toEqual(Array(3).fill([200, 100, 100]))
  expect(s.cash).toBe(cash)
  const paid = s.purse
  settle(s, p.id)
  expect(s.purse).toBe(paid)
  expect(s.settlements).toHaveLength(1)
  expect(rules.legalRules.divide(7, ['a', 'b'])).toEqual([4, 3])
})
it('caps insolvency at estate assets and keeps old household debt separate', () => {
  const s = birth(),
    n = s.npcs[0]
  n.money = 2
  n.alive = false
  s.households[s.residence].debt = 40
  s.loans = [
    {
      id: 'x',
      debtor: n.id,
      creditor: 'local-lender',
      original: 9,
      balance: 9,
      year: s.year,
      due: s.year + 3,
      writtenOff: 0,
    },
  ]
  settle(s, n.id)
  expect(s.settlements[0]).toMatchObject({ paid: 2, writtenOff: 7 })
  expect(s.debt).toBe(40)
  expect(outstanding(s, 'player')).toBe(0)
})
it('permits both sexes to borrow with resources and restricts discretionary spending until repayment', () => {
  for (const sex of ['女', '男']) {
    let s = birth()
    s.age = 20
    s.sex = sex
    s.purse = 8
    expect(borrow(s, 'player')).toBe(true)
    expect(credit(s)).toContain('旧借')
    s.purse = 6
    expect(spendable(s)).toBe(0)
    s.pending = 'equip'
    s = decide(s, 'buyTool')
    expect(s.purse).toBe(6)
    s.year += 4
    s.pending = 'collect'
    s = decide(s, 'payLoan')
    expect(outstanding(s, 'player')).toBe(2)
    expect(s.purse).toBe(0)
  }
})
it('rejects an unsupported demand without charging either wallet; voluntary gift reduces only the specified balance', () => {
  const s = birth()
  s.households.independent = { cash: 11, assets: 0, debt: 0 }
  Object.assign(s, {
    age: 30,
    residence: 'independent',
    purse: 9,
    pending: 'demand',
  })
  s.households.birth = { cash: 0, assets: 1, debt: 22 }
  const refused = decide(s, 'pass'),
    gift = decide(s, 'gift')
  expect([refused.purse, refused.debt, refused.estates.birth.debt]).toEqual([
    9, 0, 22,
  ])
  expect([gift.purse, gift.debt, gift.estates.birth.debt]).toEqual([3, 0, 16])
  expect(outstanding(gift, 'player')).toBe(0)
})
it('retains education as an attempted choice; a sponsor can pay the uncovered cost', () => {
  let found = false
  for (let i = 0; i < 80 && !found; i++) {
    const s = birth(String(i))
    Object.assign(s, { age: 15, pending: 'turn' })
    Object.assign(s.households.birth, { cash: 1, debt: 10 })
    const father = s.npcs[0]
    father.generosity = 0.9
    father.money = 0
    expect(eligible(s).some((e) => e.id === 'turn')).toBe(true)
    expect(decide(s, 'learn').training).toBe('未入学')
    father.money = 10
    const sponsored = decide(s, 'learn')
    if (sponsored.training === '习读') {
      expect(sponsored.npcs[0].money).toBe(6)
      found = true
    }
  }
  expect(found).toBe(true)
})
it('keeps collection outcomes confined to repayment, requests and voluntary gifts', () => {
  expect(
    scenes.find((e) => e.id === 'demand')?.choices.map((x) => x[1]),
  ).toEqual(['pass', 'gift'])
  expect(
    scenes.find((e) => e.id === 'collect')?.choices.map((x) => x[1]),
  ).toEqual(['payLoan', 'extend'])
})
