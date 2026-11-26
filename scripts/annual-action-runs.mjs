// Node 24. Pass a Stage B checkout to compare complete, same-seed lives.
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import * as game from '../src/engine/life.ts'
import { annualPhase, availableActions, submitAnnual, actionsLeft } from '../src/engine/annual-actions.ts'
import { eligible } from '../src/content/western-han/events.ts'
import { homes } from '../src/data.ts'
const [baseline, policy, size='1000']=process.argv.slice(2)
if(!baseline || !['skip','family','market'].includes(policy)) throw Error('Specify Stage B directory and skip|family|market')
const base=await import(pathToFileURL(resolve(baseline,'src/engine/life.ts')))
const baseEvents=await import(pathToFileURL(resolve(baseline,'src/content/western-han/events.ts')))
const groups={}, seeds={}, totals={first:0,unions:0,debt:0,children:0,age:[]}
const fresh=()=>({years:0,familyAvailable:0,workAvailable:0,used:0,introduced:0,kinRefused:0,invited:0,employerRefused:0,attended:0,expired:0,interrupted:0})
function run(seed,modern){
  const engine=modern?game:base, events=modern?eligible:baseEvents.eligible
  let s=engine.confirmName(engine.generate(seed),'宁'), lastYear=null, rows=[]
  const met=new Set(), issued=new Map()
  while(!s.people[s.playerId].dead){
    if(s.pending){
      const opts=events(s).find(o=>o.id===s.pending).choices.map(o=>o[1])
      let choice=opts[0]
      if(s.pending==='wedding' && !met.has(s.candidateId)){met.add(s.candidateId);choice='meet'}
      else if(['wedding','weddingReply'].includes(s.pending)) choice='marry'
      else if(s.pending==='arrangements') choice=['plainWedding','familyGift','marry','waitWedding'].find(o=>opts.includes(o))
      s=engine.decide(s,choice)
    }else if(modern && annualPhase(s)==='actions'){
      const p=s.people[s.playerId], choices=availableActions(s)
      if(lastYear!==s.year){
        lastYear=s.year
        const keys=['all','出身/'+homes[p.home].name,'居处/'+p.residence,'家债/'+(s.households[p.residence].debt?'有':'无')]
        rows=keys.map(k=>groups[k]??=fresh())
        for(const r of rows){
          r.years++
          r.familyAvailable+=Number(choices.some(o=>o.kind==='introduction'))
          r.workAvailable+=Number(choices.some(o=>o.kind==='inquiry'))
        }
      }
      const order=policy==='skip'?[]:policy==='family'?['introduction','interview','inquiry']:['interview','inquiry','introduction']
      const action=order.map(k=>choices.find(o=>o.kind===k)).find(Boolean)
      if(!action){s=game.endActionYear(s);continue}
      const cmd={...action,id:s.year+'/'+actionsLeft(s),year:s.year}
      const before=s, {state,result}=submitAnnual(s,cmd)
      assert.deepEqual(state.households,before.households)
      assert.deepEqual(state.loans,before.loans)
      assert.equal(state.people[s.playerId].purse,p.purse)
      for(const n of Object.values(state.people))if(n.kind==='relative')assert.equal(n.money,before.people[n.id]?.money??0)
      const key=action.kind==='interview'?'attended':action.kind==='introduction'?(result.accepted?'introduced':'kinRefused'):(result.accepted?'invited':'employerRefused')
      for(const r of rows){r.used++;r[key]++}
      if(key==='invited')issued.set(JSON.stringify([s.year,action.target,action.subject]),rows)
      seeds[key]??={seed,age:p.age,result:result.text,policy}
      s=state
    }else s=modern?game.nextPlayableYear(s):base.advance(s)
  }
  engine.validatePeople(s)
  if(modern){
    for(const o of s.annual?.interviews??[]){
      assert.notEqual(o.status,'open')
      if((o.status==='expired'||o.status==='interrupted') && !Object.values(seeds).some(v=>v.seed===seed))
        seeds[o.status]??={seed,age:o.year-s.people[s.playerId].birth,job:o.job,policy}
      if(o.status==='expired'||o.status==='interrupted')
        for(const r of issued.get(JSON.stringify([o.year,o.employer,o.job])))r[o.status]++
    }
    const us=s.marriages.filter(u=>u.pair.includes(s.playerId))
    if(us.length){totals.first++;totals.age.push(us[0].start-s.people[s.playerId].birth)}
    totals.unions+=us.length
    totals.children+=Object.values(s.parentIds).filter(ids=>ids.includes(s.playerId)).length
    totals.debt+=Object.values(s.households).reduce((v,h)=>v+h.debt,0)
  }
  return s
}
for(let i=0;i<Number(size);i++){
  const seed='marriage-audit-'+i
  const current=run(seed,true)
  if(policy==='skip'){
    delete current.annual
    assert.deepEqual(current,run(seed,false),seed)
  }
}
totals.age.sort((a,b)=>a-b)
totals.median=totals.age[Math.floor((totals.age.length-1)/2)]
delete totals.age
console.log(JSON.stringify({policy,lives:Number(size),totals,groups,seeds},null,2))
