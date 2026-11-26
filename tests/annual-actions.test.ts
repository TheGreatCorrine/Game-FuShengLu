import {it,expect} from 'vitest'
import {generate,confirmName,advance,nextPlayableYear,decide,endActionYear,legacyPeopleView,migratePeople} from '../src/engine/life.ts'
import {actionsLeft,annualPhase,availableActions,openActionYear,submitAnnual} from '../src/engine/annual-actions.ts'
import type {ActionChoice} from '../src/engine/annual-actions.ts'
import {protagonist,type Life} from '../src/engine/people.ts'
import {eligible} from '../src/content/western-han/events.ts'

function fixture(i=0,age=22) {
  const s=confirmName(generate('annual-case-'+i),'宁'), p=protagonist(s)
  p.age=age;p.home=0;s.env.harvest=1;s.year=p.birth+age
  for(const id of s.parentIds[p.id]){
    const n=s.people[id]
    if(n.kind==='relative'){n.work='耕作';n.acute='';n.health=85}
  }
  openActionYear(s)
  return s
}
function request(s:Life,kind:ActionChoice['kind'],id='first'){
  const choice=availableActions(s).find(o=>o.kind===kind)!
  const command={...choice,id,year:s.year}
  return {...submitAnnual(s,command),command}
}
function interviewFixture(){
  for(let i=0;i<100;i++){
    const s=fixture(i)
    const inquiry=request(s,'inquiry')
    if(inquiry.result.accepted)return inquiry
  }
  throw Error('Missing interview')
}
it('opens only at a known adult boundary and can spend zero without rerunning the year',()=>{
  const s=fixture(0,17)
  expect(s.annual).toBeUndefined()
  const old=migratePeople(legacyPeopleView(s))
  const a=nextPlayableYear(old), expected=advance(old)
  expect(a.year).toBe(old.year+1)
  const copy=structuredClone(a);delete copy.annual
  expect(copy).toEqual(expected)
  while(a.pending){const resolved=decide(a,eligible(a).find(e=>e.id===a.pending)!.choices[0][1]);Object.assign(a,resolved)}
  expect(actionsLeft(a)).toBe(2)
  expect(nextPlayableYear(a)).toBe(a)
  const closed=endActionYear(a)
  expect(actionsLeft(closed)).toBe(0)
  expect(closed.households).toEqual(a.households)
  openActionYear(closed)
  expect(actionsLeft(closed)).toBe(0)
  expect(endActionYear(closed)).toBe(closed)
  expect(nextPlayableYear(closed).year).toBe(a.year+1)
})
it('shows the first result, spends two independent commands, and rejects a third',()=>{
  const {state:s,result,command}=interviewFixture()
  expect(s.chronicle.at(-1)?.text).toBe(result.text)
  expect(actionsLeft(s)).toBe(1)
  expect(nextPlayableYear(s)).toBe(s)
  const second=request(s,'interview','second')
  expect(second.state.year).toBe(s.year)
  expect(annualPhase(second.state)).toBe('finished')
  expect(second.state.annual!.interviews[0].status).toBe('attended')
  expect(second.state.households).toEqual(s.households)
  expect(protagonist(second.state).purse).toBe(protagonist(s).purse)
  expect(()=>submitAnnual(second.state,{...command,id:'third'})).toThrow()
  expect(submitAnnual(second.state,command)).toEqual({state:second.state,result})
  expect(()=>submitAnnual(s,{...command,target:'other'})).toThrow()
})
it('retains a genuine refusal; inspecting, cancelling or submitting invalid requests is free',()=>{
  for(let i=0;i<100;i++){
    const s=fixture(i), old=structuredClone(s)
    const opts=availableActions(s)
    expect(availableActions(s)).toEqual(opts)
    expect(()=>submitAnnual(s,{...opts[0],target:'unknown',id:'bad',year:s.year})).toThrow()
    expect(s).toEqual(old)
    const {state,command,result}=request(s,'introduction')
    if(result.accepted)continue
    expect(state.candidateId).toBeNull()
    expect(actionsLeft(state)).toBe(1)
    expect(()=>submitAnnual(state,{...command,id:'different'})).toThrow()
    expect(submitAnnual(migratePeople(legacyPeopleView(state)),command).result).toEqual(result)
    return
  }
  throw Error('Missing refusal')
})
it('reuses Stage B appointments and lets the candidate reply without spending an action',()=>{
  expect(availableActions(fixture(0,18)).some(o=>o.kind==='introduction')).toBe(false)
  for(let i=0;i<100;i++){
    const first=request(fixture(i),'introduction')
    if(!first.result.accepted)continue
    const s=first.state, person=s.candidateId
    expect(annualPhase(s)).toBe('event')
    expect(s.marriages.some(u=>u.pair.includes(s.playerId))).toBe(false)
    expect(migratePeople(legacyPeopleView(s)).annual).toEqual(s.annual)
    const meeting=decide(s,'meet')
    expect(meeting.candidateId).toBe(person)
    expect(actionsLeft(meeting)).toBe(1)
    const next=nextPlayableYear(endActionYear(meeting))
    if(next.pending!=='weddingReply')continue
    const declined=decide(next,'declineMatch')
    expect(declined.candidateId).toBeNull()
    expect(actionsLeft(declined)).toBe(2)
    expect(declined.annual!.receipts).toHaveLength(1)
    return
  }
  throw Error('Missing agreed reply')
})
it('expires unused interviews and interrupts promises when the employer leaves or the player dies',()=>{
  const {state:s,command}=interviewFixture()
  for(const reason of ['expired','moved','dead']){
    const copy=structuredClone(s), n=copy.people[command.target]
    copy.year+=reason==='expired'?2:1
    if(reason==='dead')protagonist(copy).dead=true
    if(reason==='moved' && n.kind==='relative')n.house='elsewhere'
    openActionYear(copy)
    expect(copy.annual!.interviews[0].status).toBe(reason==='expired'?'expired':'interrupted')
    expect(availableActions(copy).some(o=>o.kind==='interview')).toBe(false)
  }
})
it('preserves old midyear snapshots and exactly replays accepted and refused actions',()=>{
  const legacy=fixture();delete legacy.annual
  expect(availableActions(migratePeople(legacy))).toEqual([])
  const a=fixture(9),b=fixture(9)
  expect(request(a,'inquiry')).toEqual(request(b,'inquiry'))
})
it('rechecks the named employer on submission and changes access with work, harvest and training',()=>{
  const s=fixture(), p=protagonist(s), inquiry=availableActions(s).find(o=>o.kind==='inquiry')!
  const n=s.people[inquiry.target]
  if(n.kind!=='relative')throw Error('Missing employer')
  n.alive=false
  expect(()=>submitAnnual(s,{...inquiry,id:'stale',year:s.year})).toThrow()
  expect(actionsLeft(s)).toBe(2)
  n.alive=true
  const jobs=()=>availableActions(s).filter(o=>o.target===n.id && o.kind==='inquiry').map(o=>o.subject)
  s.env.harvest=0.8
  expect(jobs()).toEqual([])
  p.home=1
  expect(jobs()).toContain('帮佃户运租粮')
  n.work='文书';p.training='';p.skill=0
  expect(jobs()).toEqual([])
  p.training='学成'
  expect(jobs()).toContain('抄写货单')
  p.acute='病中'
  expect(jobs()).toEqual([])
})
it('retains a receipt across the next year without consuming the refreshed allowance',()=>{
  const first=interviewFixture()
  const next=nextPlayableYear(endActionYear(first.state))
  expect(next.year).toBe(first.command.year+1)
  expect(actionsLeft(next)).toBe(2)
  const retry=submitAnnual(migratePeople(JSON.parse(JSON.stringify(next))),first.command)
  expect(retry.result).toEqual(first.result)
  expect(actionsLeft(retry.state)).toBe(2)
})
