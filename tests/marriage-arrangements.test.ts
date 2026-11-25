import {expect,it} from 'vitest'
import { advance, confirmName, decide, generate, legacyPeopleView, migratePeople, validatePeople } from '../src/engine/life.ts'
import { bindCandidate, eligible } from '../src/content/western-han/events.ts'
import { acceptMarriage, agreement } from '../src/engine/marriage-arrangements.ts'
import { schedule } from '../src/engine/negotiations.ts'
import { currentCandidate, player, parentsOf } from '../src/engine/domain.ts'

function agreed(i=0,cash=0) {
  const s=confirmName(generate('wedding-fixture-'+i),'安'), p=player(s)
  p.age=34
  s.year=p.birth+34
  s.households.birth.cash=cash
  bindCandidate(s)
  s.negotiations=[{person:s.candidateId!,opened:s.year-1,due:s.year,contact:'meet',result:{year:s.year,outcome:'willing'}}]
  s.pending='weddingReply'
  return decide(s,'planWedding')
}
it('preserves bilateral consent across a delay, migration and the last introduction birthday',()=>{
  const before=agreed(), id=before.candidateId!
  const delayed=decide(before,'waitWedding')
  expect(delayed.residentOrder).not.toContain(id)
  expect(delayed.households).toEqual(before.households)
  const round=migratePeople(legacyPeopleView(delayed))
  expect(round.candidateId).toBe(id)
  expect(round.negotiations).toEqual(delayed.negotiations)
  const reply=advance(round)
  expect(player(reply).age).toBe(35)
  expect(reply.pending).toBe('arrangements')
  expect(reply.candidateId).toBe(id)
  expect(eligible(reply).some(e=>e.id==='wedding')).toBe(false)
  const released=decide(reply,'declineMatch')
  expect(released.candidateId).toBeNull()
  expect(released.negotiations).toHaveLength(1)
  expect(migratePeople(legacyPeopleView(released)).negotiations).toEqual(released.negotiations)
  expect(released.negotiations![0].agreement!.closed).toBe('declined')
})
it('uses only the named donor’s willing gift for the gap and admits the candidate once',()=>{
  let funded=false, refused=false
  for(let i=0;i<60;i++){
    const s=agreed(i,1), id=s.candidateId!
    const next=decide(s,'familyGift'), receipt=next.negotiations![0].agreement!.receipt
    if(!receipt){
      refused=true
      expect(next.households).toEqual(s.households)
      expect(next.people).toEqual(s.people)
      expect(()=>decide(next,'familyGift')).toThrow()
    }else{
      funded=true
      expect(receipt).toMatchObject({house:'birth',cash:1,gift:1})
      const donor=s.people[receipt.donor!], paid=next.people[receipt.donor!]
      if(donor.kind!=='relative'||paid.kind!=='relative')throw Error('Invalid donor')
      expect(paid.money).toBe(donor.money-1)
      expect(next.households.birth.cash).toBe(0)
      expect(next.residentOrder.filter(k=>k===id)).toHaveLength(1)
      expect(()=>decide(next,'familyGift')).toThrow()
      expect(migratePeople(legacyPeopleView(next)).negotiations).toEqual(next.negotiations)
    }
    if(funded&&refused)break
  }
  expect(funded&&refused).toBe(true)
})
it('never spends someone else’s private wealth or builds a debt to fund a ceremony',()=>{
  const s=agreed()
  player(s).purse=100
  for(const n of Object.values(s.people))if(n.kind==='relative')n.money=n.id===s.candidateId?99:0
  expect(()=>decide(s,'plainWedding')).toThrow()
  const next=decide(s,'familyGift')
  expect(agreement(next)).toBeDefined()
  expect(next.people).toEqual(s.people)
  expect(next.households).toEqual(s.households)
  expect(next.loans).toEqual(s.loans)
})
it('applies agreed residence and records the named parent’s care once',()=>{
  for(let i=0;i<100;i++){
    const s=agreed(i,2), terms=decide(s,'stayCare'), id=agreement(terms)!.careFor
    if(!id)continue
    expect(parentsOf(s,s.playerId)).toContain(id)
    const married=decide(terms,'plainWedding')
    if(agreement(married)?.simpleTerms==='declined')continue
    expect(player(married).residence).toBe('birth')
    const later=advance(married)
    if(later.negotiations![0].agreement?.careResult!=='visited')continue
    expect(later.towardPlayer[id].history.filter(m=>m.id==='weddingCare')).toHaveLength(1)
    validatePeople(later)
    return
  }
  throw Error('Missing fulfilled care fixture')
})
it('closes on either death and permits voluntary withdrawal even with a funded wedding',()=>{
  const reasons=new Set()
  for(let i=0;i<150;i++){
    const s=decide(agreed(i,6),'waitWedding')
    s.mortality.adult=0.4
    agreement(s)!.since-=2
    const next=advance(s), reason=next.negotiations![0].agreement?.closed
    if(reason){reasons.add(reason);expect(next.candidateId).toBeNull();validatePeople(next)}
  }
  for(const reason of ['withdrawn','candidateDeath','playerDeath'])expect(reasons.has(reason)).toBe(true)
})

it('enforces consent and appointment boundaries when called outside the event menu',()=>{
  const s=agreed(), n=currentCandidate(s)!
  const existing=structuredClone(s)
  expect(()=>schedule(s,n,'meet')).toThrow()
  expect(()=>acceptMarriage(s,false)).toThrow()
  expect(s).toEqual(existing)
  s.negotiations=[]
  schedule(s,n,'terms')
  const waiting=structuredClone(s)
  expect(()=>acceptMarriage(s,true)).toThrow()
  expect(s).toEqual(waiting)
  s.negotiations=[]
  n.age=13
  expect(()=>acceptMarriage(s,false)).toThrow()
  expect(s.negotiations).toEqual([])
})

it('keeps the same agreement and all balances when the candidate wants a standard ceremony',()=>{
  for(let i=0;i<100;i++){
    const s=agreed(i,6), next=decide(s,'plainWedding')
    if(agreement(next)?.simpleTerms!=='declined')continue
    expect(next.people).toEqual(s.people)
    expect(next.households).toEqual(s.households)
    expect(next.marriages).toEqual(s.marriages)
    expect(()=>decide(next,'plainWedding')).toThrow()
    expect(decide(next,'marry').negotiations![0].agreement?.receipt?.cash).toBe(6)
    return
  }
  throw Error('Missing refusal of simplified terms')
})
