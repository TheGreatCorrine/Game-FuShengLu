import { expect, it } from 'vitest'
import {
  advance,
  confirmName,
  decide,
  eligible,
  generate,
} from '../src/engine.ts'
import { environment, household } from '../src/engine/economy.ts'
import {
  resolveKinHealth,
  remember,
  helpChance,
  developFamily,
} from '../src/engine/family.ts'
const birth = (seed: string) => confirmName(generate(seed), '宁')
it('excludes a worker dying this year and an acutely ill worker from this settlement', () => {
  for (const target of ['death', 'ill']) {
    let found = false
    for (let i = 0; i < 200 && !found; i++) {
      const s = birth('order' + i)
      s.npcs = s.npcs.slice(0, 1)
      s.npcs[0].age = 40
      s.mortality.adult = target === 'death' ? 0.99 : 0.001
      s.mortality.illness = target === 'ill' ? 1 : 0
      const after = advance(s)
      const n = after.npcs[0]
      if (target === 'death' ? n.alive : !n.alive || !n.acute) continue
      const healthy = structuredClone(s)
      healthy.age = after.age
      healthy.year = after.year
      environment(healthy)
      household(healthy)
      expect(after.income).toBeLessThan(healthy.income)
      found = true
    }
    expect(found).toBe(true)
  }
})
it('retains help in memory and makes a later request more likely', () => {
  const s = birth('memory'),
    n = s.npcs[0],
    before = helpChance(s, n)
  remember(s, n, 'care', 0.12)
  s.year += 5
  expect(helpChance(s, n)).toBeGreaterThan(before)
  expect(n.history[0].year).toBe(s.year - 5)
})
it('replays family networks, separate estates, widowhood and spaced births', () => {
  let deaths = 0,
    births = 0,
    away = 0,
    widows = 0,
    reunions = 0
  for (let i = 0; i < 65; i++) {
    let s = birth('family' + i)
    while (!s.dead) {
      const old = s
      s = s.pending
        ? decide(s, eligible(s).find((e) => e.id === s.pending)!.choices[0][1])
        : advance(s)
      if (s.marriage === 'widowed' && old.spouse) {
        widows++
        expect(s.spouse).toBeNull()
        expect(eligible(s).some((e) => e.id === 'wedding')).toBe(false)
      }
      if (s.unions > 1) reunions++
      if (
        s.estates.birth &&
        old.estates.birth &&
        s.estates.birth.debt !== old.estates.birth.debt
      )
        away++
    }
    const children = s.npcs.filter((n) => n.role === '孩子')
    for (const [j, n] of children.entries()) {
      expect(n.parents[0]).toBe('player')
      if (j) {
        expect(n.born - children[j - 1].born).toBeGreaterThanOrEqual(3)
        births++
      }
    }
    deaths += s.npcs.filter((n) => !n.alive).length
  }
  for (const count of [deaths, births, away, widows, reunions])
    expect(count).toBeGreaterThan(0)
})
it('delivers aid across accounts, preserves the sender, and retains in-laws as people', () => {
  let linked = false,
    transferred = false
  for (const seed of ['family12', 'family18']) {
    let s = birth(seed)
    while (!s.dead) {
      const old = s,
        e = eligible(s).find((e) => e.id === s.pending)
      s = e ? decide(s, e.choices[0][1]) : advance(s)
      if (s.unions > old.unions && s.spouse) {
        const spouse = s.npcs.find((n) => n.id === s.spouse)!
        if (spouse.parents.length) {
          linked = true
          for (const id of spouse.parents)
            expect(s.npcs.find((n) => n.id === id)?.tier).toBe(2)
        }
      }
      if (old.pending === 'letterHome') {
        const sent = old.purse - s.purse
        expect(sent).toBeGreaterThan(0)
        expect(old.estates.birth.debt - s.estates.birth.debt).toBe(sent)
        expect(
          s.npcs.some(
            (n) => n.house === 'birth' && n.history.some((m) => m.id === 'aid'),
          ),
        ).toBe(true)
        transferred = true
      }
    }
  }
  expect(linked && transferred).toBe(true)
})
