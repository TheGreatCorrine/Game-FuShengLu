// node scripts/marriage-negotiation-runs.mjs /path/to/595e8d5 meet|terms|yes|pass|decline|random [seedCount]
import {resolve,join} from 'node:path'
import {pathToFileURL} from 'node:url'
import assert from 'node:assert/strict'
const [base,policy,count='1000']=process.argv.slice(2)
if (!base || !['meet','terms','yes','pass','decline','random'].includes(policy)) throw Error('Specify baseline checkout and policy')
async function engine(path) {
  const load = file => import(pathToFileURL(join(resolve(path),file)).href)
  return {...await load('src/engine/life.ts'), ...await load('src/content/western-han/events.ts'), ...await load('src/engine/rng.ts')}
}
const old=await engine(base), current=await engine('.')
function metrics() {
  return {lives:0,introduced:0,firstMarriages:0,unions:0,repeatContacts:0,revisitedCandidates:0,replyMarriages:0,replyCashBlocks:0,firstAges:[],introAges:[],scheduled:0,
    valid:0,timelyValid:0,timelyAll:0,closed:0,outcomes:{},cashBlocks:0}
}
function run(api, modern, seed, m) {
  let s=api.confirmName(api.generate(seed),'宁'), intro=null
  const contacts=new Set(), revisited=new Set()
  while (!s.people[s.playerId].dead) {
    s=api.advance(s)
    if (!s.pending) continue
    const scene=api.eligible(s).find(e=>e.id===s.pending)
    let action=scene.choices[0][1]
    if (['wedding','weddingReply'].includes(scene.id)) {
      const p=s.people[s.playerId], id=s.candidateId
      if (!intro) {intro=[p.age,s.legacyKeys[id]];m.introduced++;m.introAges.push(p.age)}
      const repeat=contacts.has(id)
      if (repeat) {m.repeatContacts++;revisited.add(id)}
      contacts.add(id)
      if (scene.id==='wedding') {
        if (policy==='meet' && !repeat) action='meet'
        if (policy==='terms' && !repeat) action=modern?'terms':'meet'
        if (policy==='pass') action='pass'
        if (policy==='decline') action=modern?'declineMatch':'pass'
        if (policy==='random') action=['marry','meet','pass'][Math.floor(api.random(seed,'audit/reply/'+p.age)*3)]
      }
      if (action==='marry' && s.households[p.residence].cash<6) m.cashBlocks++
      if (scene.id==='weddingReply' && action==='marry') {
        if (s.households[p.residence].cash<6) m.replyCashBlocks++
        else m.replyMarriages++
      }
    }
    s=api.decide(s,action)
  }
  m.revisitedCandidates+=revisited.size
  api.validatePeople(s)
  const marriages=s.marriages.filter(u=>u.pair.includes(s.playerId))
  m.lives++;m.unions+=marriages.length
  if (marriages.length) {m.firstMarriages++;m.firstAges.push(marriages[0].start-s.people[s.playerId].birth)}
  for (const row of s.negotiations??[]) {
    if (row.due===null) continue
    m.scheduled++
    const reason=row.result?.outcome??'unresolved'
    m.outcomes[reason]=(m.outcomes[reason]??0)+1
    if (row.result) m.closed++
    const timely=!!row.result && row.result.year<=row.due+1
    if (timely) m.timelyAll++
    if (!['candidateDeath','playerDeath','ineligible'].includes(reason)) {
      m.valid++;if(timely)m.timelyValid++
    }
  }
  return intro
}
const before=metrics(),after=metrics()
for(let i=0;i<Number(count);i++){
  const seed='marriage-audit-'+i
  assert.deepEqual(run(current,true,seed,after),run(old,false,seed,before),'First introduction differs: '+seed)
}
function summarize(m) {
  const quartiles = xs => xs.length ? [.25,.5,.75].map(q=>xs.sort((a,b)=>a-b)[Math.ceil(q*xs.length)-1]) : []
  return {...m,firstAges:quartiles(m.firstAges),introAges:quartiles(m.introAges)}
}
console.log(JSON.stringify({policy,before:summarize(before),after:summarize(after)},null,2))
