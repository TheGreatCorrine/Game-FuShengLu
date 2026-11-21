// node scripts/childhood-cohort.mjs [unique seeds] [optional bundled baseline oracle.mjs]
import * as life from '../src/engine/life.ts'
import {observePlayer} from '../src/engine/observation.ts'
import {resolve} from 'node:path'
import {pathToFileURL} from 'node:url'

const api = process.argv[3] ? await import(pathToFileURL(resolve(process.argv[3]))) : {...life,observePlayer}
const count = Number(process.argv[2] || 1000)
const bands = [[0,3],[4,6],[7,10],[11,14]]
const stats = bands.map(() => ({entrants:0, years:0, empty:0, events:0, decisions:0, childDecisions:0, repeats:0}))
const bandFor = age => bands.findIndex(([min,max]) => age>=min && age<=max)
const altScenes = new Set()
const signatures = new Set(), examples = [], byHome = {}, sceneCounts = {}
const effects = {paired:0, both15:0, differentOptions15:0, both40:0, differentWork40:0,
  differentSkill40:0, differentPractice40:0, differentRecall40:0}
let routes15=0, reached15=0, recalls40=0, reached40=0, forks=0

function run(seed, alternative) {
  let s=api.confirmName(api.generate(seed),'宁'), fork, options15, at40
  const sequence=[], seen=new Set()
  if (!alternative) { stats[0].entrants++; stats[0].years++; stats[0].events++ }
  while (!s.people[s.playerId].dead) {
    s=api.advance(s)
    const p=s.people[s.playerId], age=p.age
    if (p.dead) break
    const band=bandFor(age)
    if (band>=0 && !alternative) {
      const m=stats[band]
      if (age===bands[band][0]) m.entrants++
      const events=s.chronicle.filter(e=>e.age===age).length+s.news.filter(e=>e.age===age).length+Number(!!s.pending)
      m.years++; m.events+=events; m.empty+=Number(!events)
      if (s.pending) {
        m.decisions++
        if(s.pending.startsWith('child')) {
          sequence.push(s.pending); m.childDecisions++
          m.repeats+=Number(seen.has(s.pending)); seen.add(s.pending)
          sceneCounts[s.pending]=(sceneCounts[s.pending]??0)+1
        }
      }
    }
    if (age===40) {
      const recall=s.chronicle.find(e=>e.age===40 && e.text.includes('十五岁那次商量'))?.text ?? ''
      at40={work:p.work,skill:p.skill,practice:p.practice,recall}
      if (!alternative) { reached40++; recalls40+=Number(!!recall) }
    }
    if (s.pending) {
      if (alternative && s.pending.startsWith('child')) altScenes.add(s.pending)
      const actions=api.observePlayer(s).scene.choices.map(c=>c[1])
      if (age===15) {
        options15=actions.join(',')
        if (!alternative) { reached15++; routes15+=Number(actions.some(a=>a==='childStudy'||a==='childCraft')) }
      }
      let action=actions.find(a=>a==='childStudy')??actions.find(a=>a==='childCraft')??actions[0]
      // Vary only one childhood choice. Both trajectories otherwise follow the same policy.
      if (!fork && age>=7 && age<=10 && s.pending.startsWith('child')) {
        fork={age,scene:s.pending}
        if (alternative) action=actions[1]
      }
      s=api.decide(s,action)
    }
  }
  api.validatePeople(s)
  if (!alternative) {
    signatures.add(sequence.join(','))
    const home=s.people[s.playerId].home
    const row=byHome[home]??={lives:0,sequences:new Set()}
    row.lives++;row.sequences.add(sequence.join(','))
    if(fork) forks++
  }
  return {fork,options15,at40}
}
for(let i=0;i<count;i++) {
  const seed='childhood-'+i, a=run(seed,false)
  if (!a.fork) continue
  const b=run(seed,true)
  effects.paired++
  if(a.options15 && b.options15) {
    effects.both15++
    effects.differentOptions15+=Number(a.options15!==b.options15)
  }
  if(a.at40 && b.at40) {
    effects.both40++
    for(const [field,key] of [['work','differentWork40'],['skill','differentSkill40'],['practice','differentPractice40'],['recall','differentRecall40']])
      effects[key]+=Number(a.at40[field]!==b.at40[field])
    if (examples.length<4 && a.options15!==b.options15 && a.at40.work!==b.at40.work)
      examples.push({seed,...a.fork,first:a,second:b})
  }
}
console.log(JSON.stringify({count,bands,stats,uniqueSequences:signatures.size,sceneCounts, scenesAcrossBoth:[...new Set([...Object.keys(sceneCounts),...altScenes])],
  byHome:Object.fromEntries(Object.entries(byHome).map(([k,v])=>[k,[v.lives,v.sequences.size]])),
  reached15,routes15,reached40,recalls40,forks,effects,examples},null,2))
