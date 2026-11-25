// Node 24: node scripts/marriage-affordability.mjs /path/to/dd8d211 meet|care|delay
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
const [baseline,policy,count='1000']=process.argv.slice(2)
if (!baseline || !['meet','care','delay'].includes(policy)) throw Error('Specify baseline directory and policy')
async function engine(dir) {
  const load=p=>import(pathToFileURL(resolve(dir,p)))
  return {...await load('src/engine/life.ts'),...await load('src/content/western-han/events.ts')}
}
const A=await engine(baseline), B=await engine('.')
const stats=()=>({lives:0,offered:0,first:0,unions:0,blocked:0,agreedPoor:0,poorMarried:0,
  simple:0,standard:0,gifts:0,donated:0,charged:0,stayed:0,moved:0,indebtedAtDeath:0,
  debtAtDeath:0,children:0,care:0,visited:0,withdrawn:0,declinedSimple:0,audits:0,firstAges:[],examples:{}})
function audit(before,after,receipt) {
  const charge=receipt?.cash??0
  for(const id of Object.keys(before.people)) assert.ok(after.people[id], 'Lost canonical person '+id)
  for(const id of new Set([...Object.keys(before.households),...Object.keys(after.households)])){
    const opening=before.households[id]??{assets:0,debt:0,cash:0}
    assert.deepEqual(after.households[id],{...opening,cash:opening.cash-(receipt?.house===id?charge:0)})
  }
  for(const [id,n] of Object.entries(after.people)){
    const old=before.people[id]
    if(n.kind==='player') assert.equal(n.purse,old.purse)
    else assert.equal(n.money,(old?.money??0)-(receipt?.donor===id?receipt.gift:0))
  }
  assert.deepEqual(after.loans,before.loans)
  if(receipt) assert.ok([2,6].includes(charge+receipt.gift))
}
function run(api,modern,seed,m){
  let s=api.confirmName(api.generate(seed),'宁'), intro=null
  const met=new Set(), poor=new Set()
  const example=(kind,age)=>{m.examples[kind]??={seed,age}}
  while(!s.people[s.playerId].dead){
    if(!s.pending){s=api.advance(s);continue}
    const p=s.people[s.playerId], id=s.candidateId
    const actions=api.eligible(s).find(e=>e.id===s.pending).choices.map(x=>x[1])
    let act=actions[0]
    if(!['wedding','weddingReply','arrangements'].includes(s.pending)){s=api.decide(s,act);continue}
    if(!intro){intro=[p.age,s.legacyKeys[id]];m.offered++}
    if(s.pending==='wedding' && !met.has(id)){act='meet';met.add(id)}
    else if(s.pending==='arrangements'){
      const a=s.negotiations.at(-1).agreement
      const priority=policy==='delay' && s.year===a.since ? ['waitWedding'] :
        [...(policy==='care'?['stayCare']:[]),'plainWedding','familyGift','marry','waitWedding']
      act=priority.find(k=>actions.includes(k))
    }else act=modern && policy!=='meet'?'planWedding':'marry'
    const before=s
    s=api.decide(s,act)
    const row=s.negotiations?.at(-1), a=row?.agreement, r=a?.receipt
    const formed=s.marriages.length>before.marriages.length
    const mutual = modern ? s.pending==='arrangements' && before.pending!=='arrangements'
      : before.pending==='weddingReply' && act==='marry'
    if(mutual && before.households[p.residence].cash<6){poor.add(id);m.agreedPoor++}
    if((act==='marry'||act==='planWedding') && before.households[p.residence].cash<6 && !formed)m.blocked++
    if(modern){
      assert.equal(formed, Boolean(r))
      audit(before,s,formed?r:null)
      if(formed){
        assert.deepEqual(s.marriages.at(-1).pair,[p.id,id])
        assert.equal(s.ledger.at(-1).changes.cash,-r.cash || 0)
      }
      m.audits++
    }
    if(formed) {
      m.unions++
      if(poor.has(id))m.poorMarried++
      if(s.people[p.id].residence===p.residence)m.stayed++;else m.moved++
      if(!modern){m.standard++;m.charged+=6}
      if(r){m.charged+=r.cash+r.gift
        if(r.cash+r.gift===2){m.simple++;example('simple',p.age)}else m.standard++
        if(r.gift){m.gifts++;m.donated+=r.gift;example('gift',p.age)}
      }
    }
  }
  api.validatePeople(s)
  m.lives++
  const unions=s.marriages.filter(u=>u.pair.includes(s.playerId))
  if(unions.length){m.first++;m.firstAges.push(unions[0].start-s.people[s.playerId].birth)}
  m.children+=Object.values(s.parentIds).filter(parents=>parents.includes(s.playerId)).length
  const debt=Object.values(s.households).reduce((v,b)=>v+b.debt,0)
  m.indebtedAtDeath+=Number(debt>0);m.debtAtDeath+=debt
  for(const row of s.negotiations??[]){
    const a=row.agreement
    if(a?.closed==='withdrawn'){m.withdrawn++;example('withdrawn',a.endedYear-s.people[s.playerId].birth)}
    if(a?.simpleTerms==='declined')m.declinedSimple++
    if(a?.careFor)m.care++
    if(a?.careResult==='visited'){m.visited++;example('care',a.receipt.year-s.people[s.playerId].birth)}
    if(modern && a)assert.ok(a.closed)
  }
  return intro
}
const old=stats(),now=stats()
for(let i=0;i<Number(count);i++){
  const seed='marriage-audit-'+i
  try{assert.deepEqual(run(A,false,seed,old),run(B,true,seed,now))}
  catch(e){throw Error(seed+': '+e.message,{cause:e})}
}
for(const m of [old,now]){m.firstAges.sort((a,b)=>a-b);m.medianMarriage=m.firstAges[Math.floor((m.firstAges.length-1)/2)];delete m.firstAges}
console.log(JSON.stringify({policy,old,now},null,2))
