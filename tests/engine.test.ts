import { describe, it, expect } from 'vitest'
import {
  generate,
  confirmName,
  advance,
  decide,
  eligible,
  support,
  yearImpact,
  skip,
  random,
  date,
} from '../src/engine.ts'
import type { State } from '../src/engine.ts'
import { scenes, history } from '../src/data.ts'
const born = (seed = '1') => confirmName(generate(seed), '安')
function step(s: State) {
  if (!s.pending) return advance(s)
  const e = eligible(s).find((e) => e.id === s.pending)!
  return decide(
    s,
    e.choices[
      Math.floor(random(s.seed, 'policy' + s.age) * e.choices.length)
    ][1],
  )
}
const life = (seed: string) => {
  let s = born(seed)
  while (!s.dead) s = step(s)
  return s
}
describe('Western Han slice', () => {
  it('replays a full life exactly', () =>
    expect(life('abc')).toEqual(life('abc')))
  it('separates region, exposure, knowledge and consequences', () => {
    const x = { ...born(), region: 1, age: 20, year: 1 - 120, home: 2 }
    const near = advance(x),
      far = advance({ ...x, region: 2 })
    expect(near.cash).toBeLessThan(far.cash)
    expect(near.env.disease).toBeGreaterThan(far.env.disease)
    expect(near.news.length).toBe(1)
    expect(far.news).toHaveLength(0)
    expect(yearImpact({ ...near, age: 2 })[0].heard).toBe(false)
    expect(yearImpact({ ...near, home: 3 })[0].message).not.toBe(
      near.news[0].text,
    )
    expect(yearImpact({ ...near, year: near.year - 1 })).toEqual([])
  })
  it('respects household access and NPC circumstances', () => {
    const s = { ...born(), age: 10, home: 3 },
      n = s.npcs[0]
    expect(eligible(s).some((e) => e.id === 'letters')).toBe(true)
    expect(eligible({ ...s, home: 1 }).some((e) => e.id === 'letters')).toBe(
      false,
    )
    expect(
      support({ ...s, cash: 80 }, { ...n, goal: '授业', generosity: 1 }),
    ).toBeGreaterThan(
      support(
        { ...s, cash: 1, debt: 20 },
        { ...n, goal: '积谷', generosity: 0 },
      ),
    )
  })
  it('resolves the same request differently and carries training to forty', () => {
    let paired = false
    for (let i = 0; i < 100 && !paired; i++) {
      const s = {
        ...born(String(i)),
        age: 15,
        year: generate(String(i)).birth + 15,
        pending: 'turn',
        cash: 80,
        home: 3,
      }
      const generous = structuredClone(s),
        frugal = structuredClone(s)
      Object.assign(generous.npcs[0], { goal: '授业', generosity: 1 })
      Object.assign(frugal.npcs[0], { goal: '积谷', generosity: 0 })
      frugal.cash = 8
      frugal.debt = 5
      let a = decide(generous, 'learn')
      const b = decide(frugal, 'learn')
      if (a.training !== '习读' || b.training === '习读') continue
      while (a.age < 40 && !a.dead) a = step(a)
      expect([
        ...new Set(
          a.ledger.filter((e) => e.cause === 'turn').map((e) => e.age),
        ),
      ]).toEqual(expect.arrayContaining([15, 18]))
      paired = true
    }
    expect(paired).toBe(true)
  })
  it('locks names, prevents invalid choices and blocks a pending clock', () => {
    const s = born()
    expect(() => confirmName(s, '别')).toThrow()
    expect(() => decide(s, 'marry')).toThrow()
    const waiting = skip(s)
    expect(advance(waiting)).toBe(waiting)
    expect(date(0)).toBe('前1年')
    expect(date(1)).toBe('公元1年')
  })
  it('keeps personal earnings separate from household assets', () => {
    const s = { ...born(), age: 15, pending: 'turn' },
      next = decide(s, 'work')
    expect(next.cash).toBe(s.cash)
    expect(next.purse).toBeGreaterThanOrEqual(s.purse)
  })
  it('leaves deceased relatives frozen', () => {
    const s = born()
    s.npcs[0].alive = false
    expect(advance(s).npcs[0]).toEqual(s.npcs[0])
    expect(support(s, s.npcs[0])).toBe(0)
  })
  it('audits 512 complete lives after every transition', () => {
    for (let i = 0; i < 512; i++) {
      let s = born('batch' + i),
        turns = 0
      while (!s.dead) {
        const old = s
        s = step(s)
        turns++
        if (
          turns > 160 ||
          s.year !== s.birth + s.age ||
          s.age < old.age ||
          s.age - old.age > 1
        )
          throw Error('clock ' + i)
        if (
          ![
            s.health,
            s.cash,
            s.purse,
            s.debt,
            s.skill,
            ...s.npcs.flatMap((n) => [n.age, n.health, n.money]),
          ].every((x) => Number.isFinite(x) && x >= 0)
        )
          throw Error('range ' + i)
        if (
          new Set(s.seen).size !== s.seen.length ||
          new Set(s.npcs.map((n) => n.id)).size !== s.npcs.length
        )
          throw Error('duplicate ' + i)
        if (
          !Number.isFinite(s.risk) ||
          s.risk < 0 ||
          s.risk > 1 ||
          s.assets < 0 ||
          s.dead !== (s.health === 0) ||
          s.npcs.some(
            (n) =>
              n.alive !== Boolean(n.health) ||
              (n.house !== s.residence &&
                !s.estates[n.house] &&
                (n.alive || s.closedHouses[n.house] === undefined)),
          )
        )
          throw Error('health or ownership ' + i)
        if (
          (s.residence !== 'birth') !==
            Boolean(s.estates.birth || s.closedHouses.birth !== undefined) ||
          s.npcs.filter((n) => n.role === '伴侣' && n.alive).length > 1
        )
          throw Error('marital estate ' + i)
        for (const n of s.npcs) {
          if ((n.alive && n.age !== s.year - n.born) || n.history.length > 8)
            throw Error('age/memory ' + i)
          for (const parent of n.parents) {
            const born =
              parent === 'player'
                ? s.birth
                : s.npcs.find((x) => x.id === parent)?.born
            if (born === undefined || n.born - born < 15)
              throw Error('ancestry ' + i)
          }
          if (
            n.partner &&
            n.partner !== 'player' &&
            !s.npcs.some(
              (k) => k.id === n.partner && k.partner === n.id && k.alive,
            )
          )
            throw Error('union ' + i)
        }
        if (
          s.spouse &&
          !s.npcs.some(
            (n) => n.id === s.spouse && n.alive && n.partner === 'player',
          )
        )
          throw Error('spouse ' + i)
        for (const estate of Object.values(s.estates))
          if (Object.values(estate).some((v) => !Number.isFinite(v) || v < 0))
            throw Error('household account ' + i)
        if (s.pending && !eligible(s).some((e) => e.id === s.pending))
          throw Error('ineligible ' + i)
        if (
          s.npcs.some(
            (n) => n.role === '孩子' && !s.npcs.some((p) => p.role === '伴侣'),
          )
        )
          throw Error('orphan reference ' + i)
        if (
          s.queue.some((q) => !s.seen.includes(q.cause)) ||
          s.ledger.some((e) => !scenes.some((v) => v.id === e.cause))
        )
          throw Error('bad cause ' + i)
      }
      expect(s.exposure.map((x) => x.id)).toEqual(
        history.filter((h) => 1 - h.from <= s.year).map((h) => h.id),
      )
      expect(advance(s)).toBe(s)
    }
  }, 60000)
})
