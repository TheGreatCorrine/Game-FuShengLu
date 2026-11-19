import { it, expect } from 'vitest'
import { generate, confirmName } from '../src/engine.ts'
import { household, inactiveHouse } from '../src/engine/economy.ts'
import { settle, authority } from '../src/engine/legal.ts'
const born = () => confirmName(generate('house-amendment'), '安')
it('charges dependents and credits only present productive members', () => {
  const s = born()
  s.home = 0
  s.assets = 0
  for (const n of s.npcs) {
    n.work = '耕作'
    n.acute = ''
    n.health = 80
  }
  s.npcs[2].age = 8
  s.age = 8
  s.work = '管田'
  s.env.harvest = 1
  const purse = s.purse
  household(s)
  expect([s.income, s.expenses, s.purse]).toEqual([16, 24, purse])
  s.npcs[0].house = 'elsewhere'
  s.estates.elsewhere = { cash: 0, assets: 0, debt: 0 }
  household(s)
  expect([s.income, s.expenses]).toEqual([8, 18])
  expect(s.estates.elsewhere.cash).toBe(2)
})
it('keeps a minor in the birth household and chooses a capable named successor', () => {
  const s = born()
  s.residence = 'independent'
  s.age = 22
  s.estates.birth = { cash: 4, debt: 16, assets: 0 }
  for (const n of s.npcs.slice(0, 2)) {
    n.alive = false
    n.money = 6
    settle(s, n.id)
  }
  const child = s.npcs[2]
  child.age = 10
  const privateMoney = child.money
  household(s)
  expect(s.estates.birth.debt).toBe(18)
  expect(child.money).toBe(privateMoney)
  expect(s.heads.birth).toBeNull()
  child.age = 18
  expect(authority(s, 'birth')).toBe(child.id)
  expect(s.settlements).toHaveLength(2)
  expect(s.closedHouses.birth).toBeUndefined()
})
it('holds empty-house obligations dormant and closes cleared funds once, retaining kin history', () => {
  const s = born()
  s.residence = 'independent'
  s.estates.birth = { cash: 2, debt: 9, assets: 1 }
  for (const n of s.npcs) {
    n.alive = false
    n.money = 0
    settle(s, n.id)
  }
  const kin = structuredClone(s.npcs)
  household(s)
  const frozen = { cash: 0, debt: 7, assets: 1 }
  expect(s.estates.birth).toEqual(frozen)
  for (let i = 0; i < 8; i++) {
    s.year++
    household(s)
  }
  expect(s.estates.birth).toEqual(frozen)
  // Controlled final disposition of residual property, prior to closure.
  s.estates.birth = { cash: 7, debt: 7, assets: 0 }
  household(s)
  expect(s.closedHouses.birth).toBe(s.year)
  expect(s.estates.birth).toBeUndefined()
  const count = s.chronicle.length
  inactiveHouse(s, 'birth')
  household(s)
  expect(s.chronicle.length).toBe(count)
  expect(s.npcs).toEqual(kin)
})
