import {generate,confirmName,advance,eligible,decide,participant,random} from '../src/engine.ts'
const policies = { first: [], conservative: ['save','pass','work','petition','waitPlan','trialSkill'], education: ['learn','halfDays','trialSkill','career','meet'], random: [] }
for (const [policy, priorities] of Object.entries(policies)) {
  for(let i=0;i<600;i++){
    let s=confirmName(generate('quality'+i),'宁')
    const row={policy,seed:s.seed,sex:s.sex,origin:s.home,talent:s.talent,ages:{},proposals:[],attempts:[],unions:[],widowed:0,events:{},choices:0,duplicates:0,invalid:0,ill:0,incapacity:0,changes:0,episodes:0,recovered:0,longest:0,moved:0}
    let streak=0
    while(!s.dead){
      const prev=s
      s=advance(s)
      if(s.dead)break
      row.ill+=Number(s.acute==='病中')
      row.incapacity+=Number(s.health<35)
      row.changes+=Number(prev.work!==s.work)
      row.widowed+=Number(s.marriage==='widowed'&&prev.marriage!=='widowed')
      if(!row.eligible && s.age>=20 && s.age<=34)row.eligible=s.age
      if(s.pending){
        const e=eligible(s).find(e=>e.id===s.pending)
        row.events[e.id]=(row.events[e.id]||0)+1
        row.choices+=Number(e.choices.length>=2)
        row.duplicates+=e.choices.length-new Set(e.choices.map(c=>c[1])).size
        if(e.id==='medicine'&&!participant(s,e.id)?.acute)row.invalid++
        const actions=e.choices.map(c=>c[1])
        const a=policy==='random'?actions[Math.floor(random(s.seed,'policy'+s.age)*actions.length)]:priorities.find(x=>actions.includes(x))??actions[0]
        if(e.id==='wedding'){row.proposals.push(s.age);if(a==='marry')row.attempts.push(s.age)}
        s=decide(s,a)
        if(s.unions>prev.unions)row.unions.push(s.age)
      }
      row.moved+=Number(prev.residence!==s.residence)
      if(prev.residence!==s.residence)streak=0
      if(s.debt){if(!streak)row.episodes++;row.longest=Math.max(row.longest,++streak)}
      else {if(streak)row.recovered++;streak=0}
      if([5,15,25,40,60].includes(s.age)){
        const kin=s.npcs.filter(n=>n.alive&&n.house===s.residence)
        row.ages[s.age]=[s.cash,s.debt,s.assets,s.work,s.training,s.skill,s.practice,kin.filter(n=>n.age<15||n.age>=65).length,s.health,s.income,s.expenses,s.residence]
      }
    }
    row.death=s.age
    console.log(JSON.stringify(row))
  }
}
