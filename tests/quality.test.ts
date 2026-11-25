import { expect, it } from 'vitest'
import {
  generate,
  confirmName,
  decide,
  eligible,
  advance,
} from '../src/engine.ts'
import { annualHealth, configure } from '../src/engine/mortality.ts'
it('tunes one life stage independently, rejects invalid knobs', () => {
  const draw = (k: string) => (k === 'death' ? 0.1 : 0.8)
  const check = (age: number, infant: number) =>
    annualHealth(age, 80, 0.2, 0.2, false, draw, configure({ infant }))
  expect(check(1, 0).dead).toBe(false)
  expect(check(1, 0.5).dead).toBe(true)
  expect(check(15, 0)).toEqual(check(15, 0.5))
  expect(() => configure({ adult: NaN })).toThrow()
  expect(() => configure({ doublingYears: 0 })).toThrow()
})
it('reopens negotiations after cooldown and prevents duplicate partners', () => {
  const s = {
    ...confirmName(generate('match'), '安'),
    age: 21,
    pending: 'wedding',
  }
  s.households.birth.cash = 0
  const next = decide(s, 'marry')
  expect(next.wedding.state).toBe('deferred')
  expect(eligible(next).some((e) => e.id === 'wedding')).toBe(false)
  let retry = { ...next, age: 24, pending: next.pending || 'wedding' }
  retry.households.birth.cash = 100
  for (let i = 0; i < 20; i++) {
    const result = decide(retry, 'marry')
    if (result.wedding.state === 'resolved') {
      expect(result.npcs.filter((n) => n.role === '伴侣')).toHaveLength(1)
      expect(eligible(result).some((e) => e.id === 'wedding')).toBe(false)
      return
    }
    retry = { ...retry, seed: 'retry' + i }
  }
  throw Error('No accepted request')
})
it('keeps an age-15 fork mechanically distinct at 40 under identical later policy', () => {
  function run(action: 'learn' | 'work') {
    let s = confirmName(generate('pair24'), '安')
    while (!s.dead && s.age < 40) {
      if (!s.pending) {
        s = advance(s)
        continue
      }
      const e = eligible(s).find((e) => e.id === s.pending)!
      s = decide(s, e.id === 'turn' ? action : e.choices[0][1])
    }
    return s
  }
  const a = run('learn'),
    b = run('work')
  expect([a.age, b.age]).toEqual([40, 40])
  expect(a.work).not.toBe(b.work)
  expect(a.skill).toBeGreaterThan(b.skill)
  expect(a.ledger.some((e) => e.cause === 'turn' && e.age > 18)).toBe(true)
})
