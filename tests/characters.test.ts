import { it, expect } from 'vitest'
import {
  confirmName,
  generate,
  decide,
  advance,
  eligible,
  participant,
} from '../src/engine.ts'
import { authority } from '../src/engine/legal.ts'
import { candidate, fulfill } from '../src/engine/encounters.ts'
const born = () => confirmName(generate('characters'), '安')
it('requires an actual sick resident and charges the correct person for care', () => {
  const s = born()
  Object.assign(s, { age: 25, purse: 5, pending: 'medicine' })
  expect(eligible(s).some((e) => e.id === 'medicine')).toBe(false)
  const n = s.npcs[1]
  n.acute = '病中'
  n.health = 40
  const treated = decide(s, 'medicineFee'),
    nursed = decide(s, 'nurse')
  expect(treated.purse).toBe(0)
  expect(treated.npcs[1].health).toBeGreaterThan(40)
  expect(nursed.careYear).toBe(s.year + 1)
  expect(nursed.purse).toBe(5)
  n.alive = false
  expect(() => decide(s, 'nurse')).toThrow()
})
it('retains the existing in-law household head while an adult player resides there', () => {
  const s = born()
  s.age = 30
  s.residence = 'kin1'
  const elder = { ...s.npcs[0], id: 'kin1elder0', house: 'kin1' }
  s.npcs.push(elder)
  expect(authority(s, 'kin1')).toBe(elder.id)
  elder.acute = '病中'
  expect(authority(s, 'kin1')).toBe('player')
})
it('keeps courtship identity, profession and memory across negotiations', () => {
  const s = born()
  Object.assign(s, { age: 22, year: s.birth + 22, pending: 'wedding' })
  const n = candidate(s)
  const later = decide(s, 'meet')
  expect(later.spouse).toBeNull()
  expect(later.candidate?.id).toBe(n.id)
  later.age += 3
  later.year += 3
  later.pending = 'wedding'
  expect(participant(later, 'wedding')).toMatchObject({
    id: n.id,
    work: n.work,
    background: n.background,
  })
  expect(later.candidate?.history.some((m) => m.id === 'meeting')).toBe(true)
})
it('funds a sibling only with real private resources and requires initiative', () => {
  const s = born()
  s.age = 20
  s.pending = 'siblingPlan'
  s.purse = 5
  const sib = s.npcs[2]
  Object.assign(sib, { age: 23, money: 6, goal: '积谷', ambition: 0.1 })
  const moved = decide(s, 'split')
  expect([
    moved.purse,
    moved.npcs[2].money,
    moved.estates.sibling.cash,
  ]).toEqual([1, 2, 8])
  expect(moved.npcs[2].house).toBe('sibling')
  expect(moved.debt).toBe(s.debt)
  sib.goal = '授业'
  expect(() => decide(s, 'split')).toThrow()
})
it('settles an explicit future promise once against the original named household', () => {
  const s = born()
  Object.assign(s, {
    age: 28,
    residence: 'independent',
    purse: 5,
    pending: 'letterHome',
  })
  s.estates.birth = { cash: 0, assets: 1, debt: 12 }
  const p = decide(s, 'pledge')
  expect(p.purse).toBe(5)
  expect(p.promise?.id).toBe('father')
  p.year++
  fulfill(p)
  expect(p.estates.birth.debt).toBe(7)
  expect(p.purse).toBe(0)
  fulfill(p)
  expect(p.estates.birth.debt).toBe(7)
})
it('retains a spouse livelihood after a funded proposal, with a genuine alternative', () => {
  const s = born()
  s.age = 30
  s.purse = 8
  s.pending = 'spousePlan'
  const p = candidate(s)
  Object.assign(p, {
    age: 30,
    work: '耕作',
    goal: '积谷',
    ambition: 0.8,
    house: s.residence,
  })
  s.npcs.push(p)
  s.spouse = p.id
  s.debt = 10
  const next = decide(s, 'stake')
  expect(next.purse).toBe(5)
  expect(next.npcs.at(-1)?.work).toBe('织作')
  expect(advance(next).npcs.find((n) => n.id === p.id)?.work).toBe('织作')
  expect(decide(s, 'object').purse).toBe(8)
})

it('a feast only offers elder companionship when a living elder is present', () => {
  const s = born()
  Object.assign(s, { age: 40, pending: 'feast' })
  s.npcs[0].alive = false
  s.npcs[1].house = 'elsewhere'
  const options = () => eligible(s).find(e => e.id === 'feast')?.choices.map(c => c[1])
  expect(options()).toEqual(['work'])
  s.npcs[1].house = s.residence
  expect(options()).toContain('bond')
  expect(decide(s,'bond').ledger.at(-1)?.actors).toContain('mother')
})

it('deferring a proposal leaves all four accounts unchanged', () => {
  const s = born()
  Object.assign(s,{age:24,pending:'wedding'})
  const after = decide(s,'pass')
  for(const key of ['purse','cash','debt','loans'] as const) expect(after[key]).toEqual(s[key])
})

it('keeps household work and declining a job off the personal payroll', () => {
  for (let i = 0; i < 12; i++) {
    const s = confirmName(generate('payroll' + i), '安')
    Object.assign(s, { age: 15, pending: 'turn' })
    expect(decide(s, 'work').purse).toBe(s.purse)
    Object.assign(s, { age: 28, training: '学成', pending: 'offer' })
    expect(decide(s, 'work').purse).toBe(s.purse)
  }
})
