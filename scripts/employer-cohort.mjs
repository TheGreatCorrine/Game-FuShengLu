// node scripts/employer-cohort.mjs [number of lives] [optional first seed index]
import assert from 'node:assert/strict'
import {generate,confirmName,nextPlayableYear,endActionYear,decide,validatePeople} from '../src/engine/life.ts'
import {annualPhase,availableActions,submitAnnual} from '../src/engine/annual-actions.ts'
import {employer,marketReachable} from '../src/engine/employer.ts'
import {eligible} from '../src/content/western-han/events.ts'
import {protagonist} from '../src/engine/people.ts'
import {homes} from '../src/data.ts'

const groups={}, examples={}
function wallet(s){
  return [s.households,s.closedHouses,s.loans,s.settlements,protagonist(s).purse,
    Object.values(s.people).filter(n=>n.kind==='relative').map(n=>[n.id,n.money])]
}
const count=Number(process.argv[2]??1000), start=Number(process.argv[3]??0)
for(let i=start;i<start+count;i++){
  const seed='marriage-audit-'+i
  let s=confirmName(generate(seed),'宁'), lastYear=null, rows=[]
  const inviteRows=new Map()
  while(!protagonist(s).dead){
    if(s.pending){
      const event=eligible(s).find(e=>e.id===s.pending)
      const choice=event.choices.find(c=>c[1]==='nurse')??event.choices[0]
      s=decide(s,choice[1])
    }else if(annualPhase(s)==='actions'){
      const choices=availableActions(s), contact=employer(s), p=protagonist(s)
      if(lastYear!==s.year){
        lastYear=s.year
        rows=['全部',homes[p.home].name,'居处/'+p.residence,'债务/'+(s.households[p.residence].debt?'有':'无')].map(k=>groups[k]??={years:0,without:0,introduced:0,applied:0,refused:0,met:0,expired:0,interrupted:0,care:0})
        for(const row of rows){
          row.years++
          if(!contact || !marketReachable(s,contact) || p.acute || p.health<35 || s.year===s.careYear)row.without++
        }
      }
      const action=choices.find(o=>o.target===contact?.id)??choices.find(o=>['整理布匹','照看货担'].includes(o.subject) && o.kind==='interview')??choices.find(o=>['整理布匹','照看货担'].includes(o.subject) && o.kind==='inquiry')
      if(!action){s=endActionYear(s);continue}
      const before=s, {state,result}=submitAnnual(s,{...action,id:JSON.stringify([s.year,action.kind,action.target,action.subject]),year:s.year})
      assert.deepEqual(wallet(before),wallet(state))
      if(contact && action.target===contact.id && action.kind==='inquiry' && result.accepted)inviteRows.set(action.subject,rows)
      s=state
      for(const row of rows){
        if(!contact && employer(s))row.introduced++
        if(action.target===contact?.id){
          if(action.kind==='inquiry')row.applied++
          if(!result.accepted)row.refused++
          if(action.kind==='interview')row.met++
        }
      }
    }else s=nextPlayableYear(s)
  }
  validatePeople(s)
  const h=employer(s)?.history??[]
  for(const o of s.annual?.interviews??[]){
    if(!inviteRows.has(o.job) || o.employer!==employer(s)?.id)continue
    assert.notEqual(o.status,'open')
    if(o.status==='expired' || o.status==='interrupted'){
      for(const row of inviteRows.get(o.job)){
        row[o.status]++
        if(h.some(e=>e.opportunity===o.job && e.outcome==='missed' && e.text.includes('留家照护')))row.care++
      }
    }
  }
  for(const [name,event] of [['care',h.find(e=>e.text.includes('留家照护'))],['recognition',h.find(e=>e.outcome==='met' && h[2]?.outcome==='refused' && e.year-h[0].year<7)]]){
    if(event && !examples[name])examples[name]={seed,year:event.year,history:h.filter(e=>e.year<=event.year)}
  }
}
console.log(JSON.stringify({count,start,groups,examples},null,2))
