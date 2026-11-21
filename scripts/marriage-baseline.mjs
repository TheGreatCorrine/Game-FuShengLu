// node scripts/marriage-baseline.mjs yes|meet|random|pass
import {advance, confirmName, decide, generate, validatePeople} from '../src/engine/life.ts'
import {eligible, random} from '../src/engine.ts'
import {homes} from '../src/data.ts'

const policy = process.argv[2]
if (!['yes','meet','random','pass'].includes(policy)) throw Error('Specify a wedding response policy')
const groups = {}, marriageAges = [], offerAges = []
const families = [{marriages:0,parents:0,children:0},{marriages:0,parents:0,children:0}]
function quartiles(values) {
  if (!values.length) return null
  values.sort((a,b) => a-b)
  return [.25,.5,.75].map(q => values[Math.ceil(values.length*q)-1])
}
for (let i=0;i<1000;i++) {
  let life = confirmName(generate('marriage-audit-'+i),'宁')
  const birth = life.people[life.playerId]
  const labels = ['all',homes[birth.home].name,birth.sex]
  const count = (field, amount=1) => {
    for (const label of labels) {
      const row = groups[label] ??= {}
      row[field] = (row[field] ?? 0) + amount
    }
  }
  count('births')
  let everEligible=false, everOffered=false, marriageAge=null
  const discussed = new Set(), revisited = new Set()
  while (!life.people[life.playerId].dead) {
    life = advance(life)
    const p = life.people[life.playerId]
    if (p.dead) break
    const pool = eligible(life)
    if (pool.some(e=>e.id==='wedding')) {
      count('eligibleYears')
      if (!everEligible) count('eligibleLives')
      everEligible=true
    }
    if (!life.pending) continue
    const scene = pool.find(e=>e.id===life.pending)
    let action = scene.choices[0][1]
    if (scene.id!=='wedding') {life=decide(life,action);continue}
    count('offers')
    if (!everOffered) {count('offeredLives');offerAges.push(p.age)}
    everOffered=true
    const id = life.candidateId
    if (discussed.has(id)) revisited.add(id)
    if (policy==='meet' && !life.towardPlayer[id].history.some(m=>m.id==='meeting')) action='meet'
    if (policy==='pass') action='pass'
    if (policy==='random') action=scene.choices[Math.floor(random(life.seed,'audit/reply/'+p.age)*scene.choices.length)][1]
    if (action==='meet') discussed.add(id)
    const book=life.households[p.residence]
    life=decide(life,action)
    count(action)
    if (action!=='marry') continue
    if (!life.marriages.some(u=>!u.end && u.pair.includes(life.playerId))) {
      count(book.cash<6?'cashBlocked':'fundedUnsuccessful')
      continue
    }
    if (marriageAge===null) {
      marriageAge=p.age
      marriageAges.push(p.age)
      count('firstMarriages')
      if (life.people[life.playerId].residence!==p.residence) count('firstMoves')
      if (book.debt>0) count('firstWithOriginDebt')
    } else count('remarriages')
  }
  validatePeople(life)
  count('discussedCandidates',discussed.size)
  count('discussedOfferedAgain',revisited.size)
  const children=Object.values(life.parentIds).filter(ids=>ids.includes(life.playerId)).length
  count('parents',Number(children>0))
  count('children',children)
  if (marriageAge!==null) {
    const band=families[Number(marriageAge>=28)]
    band.marriages++
    band.parents+=Number(children>0)
    band.children+=children
  }
}
console.log(JSON.stringify({policy,groups,firstOfferQuartiles:quartiles(offerAges),firstMarriageQuartiles:quartiles(marriageAges),families},null,2))
