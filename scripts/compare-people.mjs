// Usage: node compare.mjs /path/to/stage1.mjs POLICY [seedCount]
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import * as current from '../src/engine/life.ts'
import { eligible } from '../src/engine.ts'
import { observePlayer } from '../src/engine/observation.ts'
import { legacyView } from './legacy-household-view.mjs'

const old = await import(pathToFileURL(resolve(process.argv[2])).href)
const policy = process.argv[3]
const priorities = {first:[],education:['learn','halfDays','trialSkill','career','meet'],
  conservative:['save','pass','work','petition','waitPlan','trialSkill'],random:[]}
if (!Object.hasOwn(priorities,policy)) throw Error('Specify a policy')
let checkpoints=0, migrations=0, deaths=0, marriages=0, debt25=0, survivors25=0
function difference(a,b,path=[]) {
  if (Object.is(a,b)) return
  if (a && b && typeof a==='object' && typeof b==='object') {
    for (const key of new Set([...Object.keys(a),...Object.keys(b)])) {
      if (Object.hasOwn(a,key)!==Object.hasOwn(b,key)) return {path:[...path,key],old:a[key],new:b[key]}
      const d = difference(a[key],b[key],[...path,key])
      if (d) return d
    }
    return
  }
  return {path,old:a,new:b}
}
for (let i=0;i<Number(process.argv[4]??600);i++) {
  const seed='quality'+i
  let oldState=old.generate(seed), b=current.generate(seed), previous, command='generate'
  const canonical = 'people' in oldState
  while(true) {
    const a=canonical ? old.legacyPeopleView(oldState) : oldState
    const view=current.legacyPeopleView(b)
    const ctx={policy,seed,age:a.age,command,householdId:a.residence}
    function check(x,y,field) {
      if (isDeepStrictEqual(x,y)) return
      const d=difference(x,y)
      const index=d?.path.indexOf('npcs')
      const person=index>=0?a.npcs[d.path[index+1]]?.id:
        ['people','parentIds','towardPlayer','legacyKeys'].includes(d?.path[0]) ? d.path[1] : null
      const householdId=d?.path.includes('households') ? d.path[d.path.indexOf('households')+1] : ctx.householdId
      throw Error(JSON.stringify({...ctx,householdId,person,field,...d}, (_key,v)=>v===undefined?'<absent>':v))
    }
    try {
      if (canonical) check(oldState,b,'canonical')
      if (canonical && old.observePlayer) check(old.observePlayer(oldState),observePlayer(b),'observation')
      current.validatePeople(b)
      if(previous) for(const [id,key] of Object.entries(previous.legacyKeys)) check(key,b.legacyKeys[id],'stable.'+id)
      check(a.households,b.households,'accounts')
      check(legacyView(a),legacyView(view),'state')
      if ((command==='advance' && a.age===40) || a.dead) {
        const imported=current.migratePeople(a)
        check(legacyView(a),legacyView(current.legacyPeopleView(imported)),'import')
        migrations++
      }
    } catch(error) { throw Error(JSON.stringify(ctx)+' '+error.message) }
    checkpoints++
    if (a.dead) {deaths++; marriages+=Number(a.unions>0);break}
    if (a.age===25 && command==='advance') {survivors25++;debt25+=Number(a.debt>0)}
    previous=b
    if (!a.name) {
      command='confirmName'
      oldState=old.confirmName(oldState,'宁');b=current.confirmName(b,'宁')
    } else if(a.pending) {
      const options=old.eligible(a).find(e=>e.id===a.pending).choices
      check(options,eligible(b).find(e=>e.id===view.pending)?.choices,'choices')
      const actions=options.map(c=>c[1])
      const action=policy==='random'?actions[Math.floor(old.random(seed,'policy'+a.age)*actions.length)]
        :priorities[policy].find(x=>actions.includes(x))??actions[0]
      command='decide:'+action
      oldState=old.decide(oldState,action);b=current.decide(b,action)
    } else {
      command='advance'
      oldState=old.advance(oldState);b=current.advance(b)
    }
  }
}
console.log(JSON.stringify({policy,checkpoints,migrations,deaths,marriages,debt25,survivors25}))
