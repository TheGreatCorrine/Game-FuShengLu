import { expect, it } from 'vitest'
import { advance, confirmName, decide, generate, legacyPeopleView, migratePeople, validatePeople } from '../src/engine/life.ts'
import { protagonist } from '../src/engine/people.ts'
import { bindCandidate, eligible } from '../src/content/western-han/events.ts'
import { observePlayer } from '../src/engine/observation.ts'
import { currentCandidate } from '../src/engine/domain.ts'
import { sourceNotes } from '../src/content/western-han/source-notes.ts'

function offered(i=0,age=22) {
  const s=confirmName(generate('agency-fixture-'+i),'宁')
  const p=protagonist(s)
  p.age=age
  s.year=p.birth+age
  s.pending='wedding'
  s.households.birth.cash=100
  bindCandidate(s)
  return s
}
it('keeps the same external person, household books and agreed date across commands and save/load',()=>{
  const s=offered(), id=s.candidateId!
  for(const action of ['meet','terms'] as const) {
    const next=decide(s,action)
    expect(next.negotiations).toEqual([{person:id,contact:action,opened:s.year,due:s.year+(action==='meet'?1:2)}])
    expect(next.candidateId).toBe(id)
    expect(next.people[id]).toMatchObject({house:null})
    expect(next.residentOrder).not.toContain(id)
    expect(next.households).toEqual(s.households)
    expect(migratePeople(JSON.parse(JSON.stringify(next)))).toEqual(next)
    expect(eligible(next).some(e=>e.id==='wedding')).toBe(false)
  }
  expect(decide(s,'pass').negotiations).toBeUndefined()
})
it('releases only the declined candidate and preserves their external identity on export',()=>{
  const s=offered(), id=s.candidateId!, next=decide(s,'declineMatch')
  expect(next.candidateId).toBeNull()
  validatePeople(next)
  const restored=migratePeople(legacyPeopleView(next))
  const archived=restored.negotiations![0].person
  expect(restored.legacyKeys[archived]).toBe(s.legacyKeys[id])
  expect(restored.residentOrder).not.toContain(archived)
  protagonist(next).age+=3
  expect(eligible(next).some(e=>e.id==='wedding')).toBe(true)
  bindCandidate(next)
  expect(next.candidateId).not.toBe(id)
  const imported=migratePeople(legacyPeopleView(next))
  expect(imported.candidateId).toBe(next.candidateId)
  expect(imported.people[id]).toEqual(next.people[id])
})
it('delivers an autonomous answer, then requires fresh player consent and six household coins',()=>{
  const reasons=new Set()
  for(let i=0;i<200;i++) {
    const s=offered(i), id=s.candidateId!, due=advance(decide(s,'meet'))
    const outcome=due.negotiations![0].result!.outcome
    reasons.add(outcome)
    expect(due.negotiations![0].result!.year).toBe(s.year+1)
    expect(due.marriages.some(u=>u.pair.includes(due.playerId))).toBe(false)
    if(outcome==='willing') {
      expect(due.pending).toBe('weddingReply')
      expect(currentCandidate(due)?.id).toBe(id)
      expect(observePlayer(due)).toMatchObject({scene:{body:expect.stringContaining(currentCandidate(due)!.name)}})
      expect(decide(due,'declineMatch').candidateId).toBeNull()
      expect(decide(due,'pass').marriages).toEqual(due.marriages)
      due.households.birth.cash=6
      expect(decide(due,'marry').marriages.at(-1)?.pair).toContain(id)
      due.households.birth.cash=5
      const poor=decide(due,'marry')
      expect(poor.marriages).toEqual(due.marriages)
      expect(poor.households).toEqual(due.households)
      expect(poor.chronicle.at(-1)?.text).toContain('六钱')
    } else {
      expect(due.candidateId).toBeNull()
      expect(due.residentOrder).not.toContain(id)
    }
  }
  for(const outcome of ['willing','refused','illness','changedPlans','withdrawn']) expect(reasons.has(outcome)).toBe(true)
})
it('explicitly closes on expiry and either death, including before a two-year appointment',()=>{
  expect(advance(decide(offered(0,34),'terms')).negotiations![0].result?.outcome).toBe('ineligible')
  const found=new Set<string>()
  for(let i=0;i<80;i++) {
    const s=offered(i)
    s.mortality.adult=1
    const n=advance(decide(s,'terms'))
    const outcome=n.negotiations![0].result?.outcome
    if(outcome) {found.add(outcome);validatePeople(n)}
  }
  expect(found.has('playerDeath')).toBe(true)
  expect(found.has('candidateDeath')).toBe(true)
})
it('keeps a contextual source outside player knowledge and event gates',()=>{
  const s=offered()
  expect(sourceNotes[0].classification).toBe('contextual historical evidence')
  expect(JSON.stringify(observePlayer(s))).not.toContain(sourceNotes[0].source)
})
it('settles the same resident accounts with or without a visiting candidate during the waiting year',()=>{
  const withGuest=decide(offered(1),'terms'), withoutGuest=structuredClone(withGuest)
  const guest=withGuest.candidateId!
  withoutGuest.candidateId=null
  delete withoutGuest.negotiations
  delete withoutGuest.people[guest]
  delete withoutGuest.parentIds[guest]
  delete withoutGuest.legacyKeys[guest]
  delete withoutGuest.towardPlayer[guest]
  currentCandidate(withGuest)!.money=999
  const a=advance(withGuest), b=advance(withoutGuest)
  expect(a.households).toEqual(b.households)
  expect([a.income,a.expenses]).toEqual([b.income,b.expenses])
})
