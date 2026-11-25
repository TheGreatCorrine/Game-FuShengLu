import { expect, it, vi } from 'vitest'
import { advance, confirmName, decide, generate, skip } from '../src/engine/life.ts'
import { observePlayer } from '../src/engine/observation.ts'
import { bindCandidate, participant } from '../src/content/western-han/events.ts'
import { joinFamily } from '../src/engine/family.ts'
import { currentCandidate, player, partnerOf } from '../src/engine/domain.ts'

vi.mock('../src/engine/people.ts', async importOriginal => {
  const actual = await importOriginal<typeof import('../src/engine/people.ts')>()
  const forbidden = () => { throw Error('Snapshot adapter called during gameplay') }
  return {...actual, collectPeople: forbidden, legacyPeopleView: forbidden, migratePeople: forbidden}
})

it('generates, advances, skips, observes and resolves complete lives with snapshot adapters disabled', () => {
  let decisions = 0
  for (const seed of ['quality7','quality3','quality31','quality24']) {
    const birth = generate(seed)
    expect(observePlayer(birth).phase).toBe('birth')
    let life = advance(confirmName(birth,'宁'))
    do {
      life = skip(life)
      const view = observePlayer(life)
      if (view.phase !== 'named') throw Error('Expected named life')
      if (view.dead) break
      const scene = view.scene!
      const input = life
      const original = structuredClone(input)
      life = decide(life,scene.choices[0][1])
      expect(input).toEqual(original)
      expect(['','arrangements']).toContain(life.pending)
      decisions++
    } while (!player(life).dead)
  }
  expect(decisions).toBeGreaterThan(10)
})

it('admits only the registered candidate and preserves their identity and account ownership', () => {
  const s = confirmName(generate('quality7'),'宁')
  player(s).age = 25
  bindCandidate(s)
  const n = currentCandidate(s)!
  expect(s.residentOrder).not.toContain(n.id)
  const before = structuredClone(s)
  expect(() => joinFamily(s, structuredClone(n))).toThrow()
  expect(s).toEqual(before)
  joinFamily(s,n)
  expect(partnerOf(s,s.playerId)).toBe(n.id)
  expect(s.residentOrder.filter(id => id === n.id)).toHaveLength(1)
  expect(s.people[n.id]).toBe(n)
  expect(s.households[player(s).residence]).toBeDefined()
})

it('resolves the feast elder by parentage even when the display label changes', () => {
  const s = generate('quality7')
  const id = s.parentIds[s.playerId][0]
  const father = s.people[id]
  if (father.kind !== 'relative') throw Error('Expected parent')
  father.role = '家人'
  expect(participant(s,'feast')?.id).toBe(id)
})
