import {expect,it} from 'vitest'
import {generate,confirmName,legacyPeopleView,migratePeople,validatePeople} from '../src/engine/life.ts'
import {protagonist,type Life} from '../src/engine/people.ts'
import {actionsLeft,availableActions,openActionYear,settleInterviews,submitAnnual} from '../src/engine/annual-actions.ts'
import {employer} from '../src/engine/employer.ts'
import {relative,formUnion} from '../src/engine/domain.ts'
import {settle} from '../src/engine/legal.ts'
import {observePlayer} from '../src/engine/observation.ts'

function fixture(i:number) {
  const s=confirmName(generate('布市'+i),'宁'),p=protagonist(s)
  s.region=0;p.age=20;s.year=p.birth+20;p.health=90;p.acute='';p.training='';p.skill=0
  for(const id of s.parentIds[p.id]){
    const n=relative(s,id)
    n.work='织作';n.health=80;n.acute='';n.name='张平'
  }
  openActionYear(s)
  return s
}
function year(s:Life){
  s.year++
  protagonist(s).age++
  openActionYear(s)
}
function submit(s:Life,kind:'inquiry'|'interview',target:string){
  const o=availableActions(s).find(o=>o.kind===kind && o.target===target)!
  const cmd={...o,year:s.year,id:[s.year,kind,target,o.subject].join(':')}
  return {...submitAnnual(s,cmd),cmd}
}
function introduced(i:number){
  const s=fixture(i), guide=s.parentIds[s.playerId][0]
  const first=submit(s,'inquiry',guide)
  if(!first.result.accepted)return
  const second=submit(first.state,'interview',guide)
  expect(actionsLeft(second.state)).toBe(0)
  year(second.state)
  return second.state
}
function sample(accepted:boolean){
  for(let i=0;i<150;i++){
    const s=introduced(i)
    if(!s)continue
    const reply=submit(s,'inquiry',employer(s)!.id)
    if(reply.result.accepted===accepted)return {s,...reply}
  }
  throw Error('Missing fixture')
}

it('introduces one canonical outsider only on actual visits, including a second route',()=>{
  for(let i=0;i<150;i++){
    const s=introduced(i)
    if(!s)continue
    const n=employer(s)!, guide=relative(s,s.parentIds[s.playerId][1])
    guide.work='贩运'
    const first=submit(s,'inquiry',guide.id)
    if(!first.result.accepted)continue
    const next=submit(first.state,'interview',guide.id).state
    expect(employer(next)!.history.filter(e=>e.outcome==='introduced').map(e=>e.source)).toEqual(['整理布匹','照看货担'])
    expect(n.id).not.toBe(guide.id);expect(n.name).toBe(guide.name)
    expect(next.nextPerson).toBe(s.nextPerson)
    expect(next.residentOrder).not.toContain(n.id)
    expect(next.heads).toEqual(s.heads);expect(next.parentIds).toEqual(s.parentIds)
    expect(next.marriages).toEqual(s.marriages);expect(next.candidateId).toBeNull()
    expect(()=>formUnion(next,next.playerId,n.id)).toThrow()
    settle(next,n.id);expect(next.settlements).toEqual(s.settlements)
    const flat=legacyPeopleView(next)
    expect(flat.npcs.some(r=>r.id===n.shop)).toBe(false)
    expect(migratePeople(JSON.parse(JSON.stringify(flat))).people[n.id]).toEqual(employer(next))
    expect(migratePeople(JSON.parse(JSON.stringify(next)))).toEqual(next)
    const old=fixture(i)
    expect(employer(migratePeople(legacyPeopleView(old)))).toBeUndefined()
    expect(observePlayer(old)).toMatchObject({contacts:[]})
    old.region=1
    const a=submit(old,'inquiry',old.parentIds[old.playerId][0])
    if(a.result.accepted)expect(employer(submit(a.state,'interview',a.cmd.target).state)).toBeUndefined()
    return
  }
  throw Error('Missing second route')
})
it('keeps refusals, permits changed qualifications or shipment, and replays receipts',()=>{
  const {state,s,cmd,result}=sample(false), n=employer(state)!
  expect(actionsLeft(state)).toBe(1)
  expect(submitAnnual(state,cmd)).toEqual({state,result})
  expect(()=>submitAnnual(state,{...cmd,id:'reroll'})).toThrow()
  expect(state.households).toEqual(s.households);expect(state.loans).toEqual(s.loans)
  expect(protagonist(state).purse).toBe(protagonist(s).purse)
  protagonist(state).skill=3
  const next=submit(state,'inquiry',n.id)
  expect(next.result.text).toContain(n.history.at(-1)!.condition)
  expect(actionsLeft(next.state)).toBe(0)
  expect(()=>submitAnnual(next.state,{...cmd,id:'third'})).toThrow()
  expect(submitAnnual(migratePeople(legacyPeopleView(next.state)),cmd).result).toEqual(result)
  const later=structuredClone(state);protagonist(later).skill=0;year(later);year(later)
  expect(submit(later,'inquiry',n.id).cmd.subject).not.toBe(cmd.subject)
})
it('retains the actor and reason across death, relocation, loss of route, care and expiry',()=>{
  const {state,cmd}=sample(true)
  for(const cause of ['death','relocation','guide','care','expiry','attend']){
    const s=structuredClone(state), n=employer(s)!
    if(cause==='death')n.alive=false
    if(cause==='relocation')n.location='外地'
    if(cause==='guide')relative(s,n.history[0].via).alive=false
    if(cause==='care')s.careYear=s.year+1
    year(s)
    const before=structuredClone(n.history)
    settleInterviews(s)
    expect(n.history).toEqual(before);expect(actionsLeft(s)).toBe(2)
    if(cause==='expiry')year(s)
    if(cause==='attend'){
      expect(n.history.at(-1)!.outcome).toBe('message')
      const visit=submit(s,'interview',n.id)
      expect(employer(visit.state)!.history.at(-1)!.outcome).toBe('met')
      expect(actionsLeft(visit.state)).toBe(1)
    }else{
      expect(s.annual!.interviews.at(-1)!.status).toBe(cause==='expiry'?'expired':'interrupted')
      expect(availableActions(s).some(o=>o.kind==='interview' && o.target===n.id)).toBe(false)
      if(cause==='care')expect(n.history.at(-1)!.text).toContain('照护')
      expect(n.history.at(-1)!.opportunity).toBe(cmd.subject)
      expect(migratePeople(legacyPeopleView(s)).people[n.id]).toEqual(n)
    }
    validatePeople(s)
  }
})
it('refuses stale visits for free and rejects family links even in imported data',()=>{
  const {s,cmd}=sample(false), n=employer(s)!
  n.location='外地'
  expect(()=>submitAnnual(s,cmd)).toThrow()
  expect(actionsLeft(s)).toBe(2)
  expect(n.history.every(e=>e.outcome==='introduced')).toBe(true)
  for(const corrupt of [
    (v:Life)=>v.residentOrder.push(n.id),
    (v:Life)=>{v.candidateId=n.id},
    (v:Life)=>v.parentIds[v.playerId].push(n.id),
    (v:Life)=>{v.heads.birth=n.id},
    (v:Life)=>v.marriages.push({pair:[v.playerId,n.id],start:v.year,end:{year:v.year,cause:'ended'}})
  ]){
    const invalid=structuredClone(s)
    corrupt(invalid)
    expect(()=>migratePeople(invalid)).toThrow()
  }
})
it('can still refuse a qualified applicant after communicating the new condition',()=>{
  for(let i=0;i<150;i++){
    const s=introduced(i)
    if(!s)continue
    const id=employer(s)!.id, first=submit(s,'inquiry',id)
    if(first.result.accepted)continue
    protagonist(first.state).skill=3
    const next=submit(first.state,'inquiry',id)
    if(next.result.accepted)continue
    expect(next.result.text).toContain('上回说过')
    expect(next.state.annual!.interviews.some(o=>o.employer===id)).toBe(false)
    return
  }
  throw Error('Missing repeated refusal')
})
