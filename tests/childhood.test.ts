import { expect, it } from 'vitest'
import { confirmName, generate, advance, decide, legacyPeopleView, migratePeople } from '../src/engine/life.ts'
import { observePlayer } from '../src/engine/observation.ts'
import { player, relative } from '../src/engine/domain.ts'
import { eligible, participant } from '../src/content/western-han/events.ts'
import { preparedChoice } from '../src/content/western-han/childhood.ts'

const born = () => confirmName(generate('lesson-fixture'),'宁')
it('keeps ages one to three observable without requiring decisions', () => {
  let s = born()
  s.mortality.infant = s.mortality.childhood = 0
  for (let age=1; age<=3; age++) {
    s=advance(s)
    expect(s.pending).toBe('')
    expect(s.chronicle.some(e => e.age===age && s.residentOrder.some(id => e.text.includes(s.people[id].name)))).toBe(true)
  }
})
it('gates household lessons by region, resources, background and an available teacher', () => {
  const s=born(), p=player(s)
  p.age=5
  const offers=(id:string)=>eligible(s).some(e=>e.id===id)
  s.region=2
  expect(offers('childReeds')).toBe(true)
  s.region=0
  expect(offers('childReeds')).toBe(false)
  p.age=8; p.home=3
  s.households.birth.cash=5
  for (const id of s.residentOrder) relative(s,id).goal='授业'
  expect(offers('childSlip')).toBe(true)
  s.households.birth.cash=0
  expect(offers('childSlip')).toBe(false)
  s.households.birth.cash=5; p.home=1
  expect(offers('childSlip')).toBe(false)
  p.home=3
  for (const id of s.residentOrder) relative(s,id).acute='病中'
  expect(offers('childSlip')).toBe(false)
})
it('binds a childhood memory to its participant across import, later absence and the age-fifteen fork', () => {
  const s=born(), p=player(s)
  p.age=8; p.home=3; s.year=p.birth+8; s.pending='childSlip'
  const mother=s.parentIds[s.playerId][1]
  for (const id of s.residentOrder) relative(s,id).goal=id===mother?'授业':'积谷'
  const before=structuredClone(s.households)
  expect(participant(s,s.pending)?.id).toBe(mother)
  const a=decide(s,'childFirst'), b=decide(s,'childSecond')
  expect(a.households).toEqual(before)
  expect(player(a).skill).toBe(player(b).skill+1)
  expect(b.towardPlayer[mother].trust).toBeGreaterThan(a.towardPlayer[mother].trust)
  expect(a.ledger.at(-1)?.actors).toEqual([s.playerId,mother])
  const restored=migratePeople(legacyPeopleView(a))
  expect(legacyPeopleView(restored).ledger).toEqual(legacyPeopleView(a).ledger)
  for(const t of [a,b,restored]) { player(t).age=15;t.year=p.birth+15;t.pending='turn' }
  expect(preparedChoice(restored)).toEqual(preparedChoice(a))
  expect(preparedChoice(b)).toEqual([])
  const chosen=decide(a,'childStudy')
  expect(chosen.ledger.at(-1)?.text).toContain('8岁')
  player(chosen).age=39
  chosen.year=p.birth+39
  chosen.mortality.adult=0
  const older=advance(chosen), view=observePlayer(older)
  if(view.phase!=='named') throw Error('Expected named life')
  expect(view.chronicle.at(-1)?.text).toContain('十五岁那次商量')
  relative(a,mother).alive=false
  expect(preparedChoice(a)).toEqual([])
  expect(a.ledger[0].actors).toContain(mother)
})

it('changes the visible age-15 opportunity and age-40 occupation after one childhood fork', () => {
  function play(askAboutName: boolean) {
    let s = confirmName(generate('childhood-118'),'宁')
    let studyOffered = false
    while (player(s).age < 40 && !player(s).dead) {
      s = advance(s)
      const view = observePlayer(s)
      if (view.phase !== 'named' || !view.scene) continue
      const actions = view.scene.choices.map(c => c[1])
      if (view.age === 15) studyOffered = actions.includes('childStudy')
      const usual = actions.find(a => a === 'childStudy') ?? actions.find(a => a === 'childCraft') ?? actions[0]
      s = decide(s, askAboutName && view.age === 8 && s.pending === 'childSlip' ? 'childSecond' : usual)
    }
    return {studyOffered,work:player(s).work,age:player(s).age}
  }
  expect(play(false)).toEqual({studyOffered:true,work:'代人理账',age:40})
  expect(play(true)).toEqual({studyOffered:false,work:'随家行商',age:40})
})
