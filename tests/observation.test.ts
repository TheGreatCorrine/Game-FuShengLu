import { expect, it } from 'vitest'
import { advance, confirmName, generate, legacyPeopleView, skip } from '../src/engine/life.ts'
import { protagonist } from '../src/engine/people.ts'
import { observePlayer } from '../src/engine/observation.ts'
import { eligible, narrative } from '../src/engine.ts'

const born = () => confirmName(generate('observation-fixture'), '宁')
function named(s: ReturnType<typeof generate>) {
  const view = observePlayer(s)
  if (view.phase !== 'named') throw Error('Expected named life')
  return view
}

it('exposes only birth details until the name is confirmed', () => {
  const view = observePlayer(generate('birth'))
  expect(Object.keys(view).sort()).toEqual(
    ['birth','dynasty','origin','period','phase','region','regionIndex','sex','surname'].sort())
})

it('keeps hidden traits, private accounts and causal metadata out of the player view', () => {
  const s = born()
  s.chronicle.push({age:0,text:'记事',actors:[s.playerId],cause:'internal'})
  const before = named(s)
  protagonist(s).vulnerability += 1
  const relative = s.people[s.residentOrder[0]]
  if (relative.kind !== 'relative') throw Error('Expected resident')
  relative.money += 10
  s.towardPlayer[relative.id].trust += .1
  s.households.unseen = {cash:123,assets:5,debt:4}
  s.queue.push({age:18,cause:'internal'})
  expect(named(s)).toEqual(before)
  expect(before.chronicle.at(-1)).toEqual({age:0,text:'记事'})
  before.chronicle[0].text = 'mutated'
  expect(s.chronicle.at(-1)?.text).toBe('记事')
})

it.each([[0,7,true],[0,6,false],[2,7,false]] as const)(
  'regional history at region %i and age %i honours hearing and end-of-life disclosure', (region,age,heard) => {
    const s = born(), p = protagonist(s)
    s.region = region
    s.year = -121 // Advance into 121 BCE.
    p.age = age-1
    s.mortality.infant = s.mortality.childhood = s.mortality.adolescent = 0
    const next = advance(s)
    const playing = named(next)
    expect(playing.news.length > 0).toBe(heard)
    expect(playing.ending).toBeNull()
    expect(JSON.stringify(playing)).not.toContain('霍去病')
    protagonist(next).dead = true
    const row = named(next).ending?.history[0]
    expect(row).toContain('前121年 · 霍去病出击河西（史记·卫将军骠骑列传）。')
    expect(row).toContain(region === 2 ? '此地未计入直接损失。' : '本户额外支出 ')
    expect(row).toContain(heard ? '当年听见了地方消息。' : '当年未获消息。')
  })

it('offers only the pending scene, with original wording and detached choices', () => {
  const s = skip(confirmName(generate('quality7'), '宁'))
  const input = structuredClone(s)
  const flat = legacyPeopleView(s)
  const old = eligible(flat).find(e => e.id === flat.pending)!
  const scene = named(s).scene!
  expect(scene).toEqual({title:old.title,body:narrative(flat,old.id,old.body),choices:old.choices})
  scene.choices[0][0] = 'changed'
  expect(named(s).scene?.choices[0][0]).toBe(old.choices[0][0])
  expect(s).toEqual(input)
})
