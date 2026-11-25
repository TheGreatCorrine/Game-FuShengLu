import { expect, it } from 'vitest'
import { generate } from '../src/engine.ts'
import { account, migrateHouseholds, moveResidence, openHouse } from '../src/engine/accounts.ts'
import { household, inactiveHouse } from '../src/engine/economy.ts'
import { joinFamily } from '../src/engine/family.ts'
import { candidate } from '../src/engine/encounters.ts'

function legacyFixture() {
  const { households, ...state } = structuredClone(generate('archive'))
  return { ...state, residence: 'independent', cash: 21, debt: 1, assets: 3,
    estates: { birth: { cash: 4, assets: 2, debt: 9 } }, closedHouses: { former: -4 },
    purse: 8, loans: [{ id: 'loan0', debtor: 'player', creditor: 'local-lender' as const,
      original: 8, balance: 6, writtenOff: 0, year: -12, due: -9 }] }
}

it('converts each owner exactly once, preserves private claims and round-trips a normalized snapshot', () => {
  const input = legacyFixture()
  const s = migrateHouseholds(input)
  expect(s.households).toEqual({ birth: input.estates.birth, independent: { cash: 21, debt: 1, assets: 3 } })
  expect([s.purse,s.loans,s.closedHouses]).toEqual([input.purse,input.loans,input.closedHouses])
  expect(migrateHouseholds(JSON.parse(JSON.stringify(s)))).toEqual(s)
  expect(() => Object.assign(s, { cash: 100 })).toThrow()
  expect(() => Object.assign(s.estates.birth, { cash: 100 })).toThrow()
  account(s,'birth').cash++
  expect(input.estates.birth.cash).toBe(4)
  expect(s.estates.birth.cash).toBe(5)
})

it('rejects duplicate owners, mixed schemas, aliased books, and reopening a closed ID', () => {
  const input = legacyFixture()
  expect(() => migrateHouseholds({ ...input, estates: { ...input.estates, independent: input.estates.birth } })).toThrow()
  const s = migrateHouseholds(input)
  expect(() => openHouse(s,'birth',input.estates.birth)).toThrow()
  expect(() => openHouse(s,'former',input.estates.birth)).toThrow()
  expect(() => migrateHouseholds({...s,cash:30})).toThrow()
  s.households.independent = s.households.birth
  expect(() => migrateHouseholds(s)).toThrow()
})

it('keeps every owner and private balance intact across repeated moves and a missing destination', () => {
  const s = migrateHouseholds(legacyFixture())
  openHouse(s,'kin1',{cash:3,assets:8,debt:12})
  const before = structuredClone(s.households)
  for (const destination of ['birth','kin1','independent','kin1','birth']) {
    moveResidence(s,destination)
    expect(s.residence).toBe(destination)
    expect(s.households).toEqual(before)
    expect(s.cash).toBe(before[destination].cash)
    expect([s.purse,s.loans[0].balance]).toEqual([8,6])
  }
  expect(() => moveResidence(s,'absent')).toThrow()
  expect(s.residence).toBe('birth')
  expect(s.households).toEqual(before)
})

it('preserves existing property without granting a new endowment for all four first-union arrangements', () => {
  const arrangements = new Set<string>()
  for (let i=0; i<500 && arrangements.size<4; i++) {
    const s = generate('ownership'+i)
    const original = { cash: 21, debt: 9, assets: 2 }
    Object.assign(account(s),original)
    const spouse = candidate(s)
    const grant = { cash: 0, assets: 0, debt: 0 }
    joinFamily(s,spouse)
    const elders = s.npcs.some(n=>n.id.startsWith('kin1elder'))
    arrangements.add(s.residence + String(elders))
    const expected = s.residence === 'birth' && !elders
      ? { birth: original }
      : { birth:original, [elders?'kin1':'independent']:grant }
    expect(s.households).toEqual(expected)
    expect(s.purse).toBe(0)
    expect(spouse.house).toBe(s.residence)
  }
  expect(arrangements.size).toBe(4)
})

it('distinguishes empty-house repayment and closure from annual costs and asset disposal', () => {
  const s = generate('disposal')
  openHouse(s,'old',{cash:3,assets:1,debt:7})
  inactiveHouse(s,'old')
  expect(account(s,'old')).toEqual({cash:0,assets:1,debt:4})
  Object.assign(account(s,'old'),{cash:4,assets:0})
  inactiveHouse(s,'old')
  expect(s.closedHouses.old).toBe(s.year)
  expect(s.households.old).toBeUndefined()
  const length = s.chronicle.length
  inactiveHouse(s,'old')
  expect(s.chronicle).toHaveLength(length)
  s.npcs = []
  s.env.harvest = 1
  Object.assign(account(s),{cash:2,assets:1,debt:30})
  household(s)
  // 2 opening cash + 2 production - 7 expenses - 30 old debt + 15 sale = -18.
  expect([s.income,s.expenses,s.purse]).toEqual([2,7,0])
  expect(account(s)).toEqual({cash:0,assets:0,debt:18})
})
