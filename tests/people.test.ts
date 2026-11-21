import { expect, it } from 'vitest'
import * as old from '../src/engine.ts'
import * as life from '../src/engine/life.ts'
import { collectPeople, protagonist } from '../src/engine/people.ts'
import { candidate } from '../src/engine/encounters.ts'
import { joinFamily } from '../src/engine/family.ts'
import { moveResidence, openHouse } from '../src/engine/accounts.ts'
import { settle } from '../src/engine/legal.ts'

const born = () => old.confirmName(old.generate('identity-fixture'),'宁')
const idOf = (s: ReturnType<typeof life.generate>, key:string) => {
  const id = Object.keys(s.legacyKeys).find(id=>s.legacyKeys[id]===key)
  if (!id) throw Error('Missing fixture person: '+key)
  return id
}

it('keeps distinct siblings, children, in-laws and asymmetric memories through moves and restore', () => {
  const s=born()
  const sibling=s.npcs[2]
  s.npcs.push({...structuredClone(sibling), id:'another-sibling'})
  const spouse=candidate(s)
  joinFamily(s,spouse)
  const elder={...structuredClone(s.npcs[0]),id:'another-elder',role:'姻亲长辈',house:s.residence}
  s.npcs.push(elder)
  spouse.parents.push(elder.id)
  for(const key of ['first-child','second-child']) {
    s.npcs.push({...structuredClone(sibling),id:key,role:'孩子',age:0,born:s.year,
      parents:['player',spouse.id],house:s.residence})
  }
  sibling.history.push({id:'care',actors:['player',sibling.id],year:s.year,trust:0.1,significance:1})
  let graph=life.migratePeople(s)
  const sib=idOf(graph,'sibling'), partner=idOf(graph,spouse.id)
  expect(sib).not.toBe(idOf(graph,'another-sibling'))
  expect(graph.parentIds[sib]).toEqual(graph.parentIds[idOf(graph,'another-sibling')])
  for (const key of ['first-child','second-child']) expect(graph.parentIds[idOf(graph,key)]).toEqual([graph.playerId,partner])
  expect(graph.parentIds[partner]).toContain(idOf(graph,elder.id))
  expect(graph.towardPlayer[sib].history[0].actors).toEqual([graph.playerId,sib])
  expect(graph.people[sib]).not.toHaveProperty('trust')
  expect(graph.people[partner]).not.toHaveProperty('partner')
  openHouse(s,'other',{cash:2,assets:1,debt:7})
  const otherBooks=structuredClone(s.households)
  for(const dest of ['other','birth','other']) {
    moveResidence(s,dest)
    graph=collectPeople(s,graph)
    expect(graph.legacyKeys[partner]).toBe(spouse.id)
    expect(protagonist(graph).residence).toBe(dest)
    expect(graph.households).toEqual(otherBooks)
    expect(life.migratePeople(JSON.parse(JSON.stringify(graph)))).toEqual(graph)
  }
})

it('keeps a single external candidate through meeting and marriage; historical dates use available evidence', () => {
  const s=born()
  Object.assign(s,{age:22,pending:'wedding'})
  s.candidate=candidate(s)
  const imported=life.migratePeople(s)
  const id=imported.candidateId!
  const met=life.decide(imported,'meet')
  expect(met.candidateId).toBe(id)
  expect(met.people[id]).toMatchObject({house:null})
  expect(met.residentOrder).not.toContain(id)
  const next=structuredClone(life.legacyPeopleView(met))
  joinFamily(next,next.candidate!)
  next.candidate=null
  const joined=collectPeople(next,met)
  expect(joined.residentOrder.filter(p=>p===id)).toHaveLength(1)
  expect(joined.marriages[0]).toEqual({pair:[joined.playerId,id],start:next.year,end:null})
  expect(life.migratePeople(next).marriages[0].start).toBeNull()
  expect(joined.towardPlayer[id].history.some(m=>m.id==='meeting')).toBe(true)
})

it('retains mortality evidence and identity of candidates removed by the old roster', () => {
  for (let i=0;i<200;i++) {
    const s=old.confirmName(old.generate('lost'+i),'安')
    s.age=24
    s.candidate=candidate(s)
    s.mortality.adult=0.9
    const before=life.migratePeople(s)
    const next=life.advance(before)
    const id=before.candidateId!
    if(next.candidateId || protagonist(next).dead) continue
    expect(next.people[id]).toMatchObject({id,alive:false,house:null,health:0})
    expect(next.residentOrder).not.toContain(id)
    life.validatePeople(next)
    return
  }
  throw Error('No candidate mortality fixture')
})

it('archives an ended marriage across widowhood and remarriage without replacing the first spouse', () => {
  const s=born(), first=candidate(s)
  joinFamily(s,first)
  const before=life.migratePeople(s)
  const original=idOf(before,first.id)
  s.year++
  first.alive=false;first.partner=null;s.spouse=null;s.marriage='widowed'
  const widow=collectPeople(s,before)
  expect(widow.marriages[0].end).toEqual({year:s.year,cause:'widowed'})
  s.year+=3
  const second=candidate(s)
  joinFamily(s,second)
  const later=collectPeople(s,widow)
  life.validatePeople(later)
  expect(later.marriages.filter(m=>!m.end)).toHaveLength(1)
  expect(later.marriages[0].pair).toContain(original)
  expect(later.people[original]).toMatchObject({alive:false})
  expect(later.marriages[1].pair).toContain(idOf(later,second.id))
  const imported=life.migratePeople(s)
  expect(imported.marriages[0].end?.year).toBeNull()
})

it('uses legacy heir ordering and preserves money, loan, settlement and promise references', () => {
  const s=born(), owner=s.npcs[0]
  owner.alive=false;owner.money=10
  s.npcs.push({...structuredClone(s.npcs[2]),id:'aaa',parents:[owner.id]})
  s.promise={id:'mother',due:s.year+1}
  s.loans.push({id:'loan0',debtor:owner.id,creditor:'local-lender',balance:2,original:2,year:s.year,due:s.year+1,writtenOff:0})
  const before=life.migratePeople(s)
  settle(s,owner.id)
  const after=collectPeople(s,before)
  const shares=after.settlements[0].shares
  expect(shares.map(x=>after.legacyKeys[x.id])).toEqual(['aaa','player','sibling'])
  expect(after.promise?.id).toBe(idOf(after,'mother'))
  expect(after.loans[0].debtor).toBe(idOf(after,owner.id))
  expect(after.settlements[0].owner).toBe(after.loans[0].debtor)
  expect(life.legacyPeopleView(after).settlements).toEqual(s.settlements)
})

it('rejects missing active references and preserves an unverifiable historical mention as such', () => {
  for (const change of [
    (s:old.State)=>{s.promise={id:'missing',due:0}},
    (s:old.State)=>{s.npcs[2].parents.push('missing')},
    (s:old.State)=>{s.heads.birth='missing'},
    (s:old.State)=>{s.npcs[2].partner='father'},
    (s:old.State)=>{s.npcs.push(structuredClone(s.npcs[0]))},
    (s:old.State)=>{s.candidate={...candidate(s),alive:false}},
  ]) {
    const s=born();change(s)
    expect(()=>life.migratePeople(s)).toThrow()
  }
  const s=born()
  s.ledger.push({age:24,text:'旧日来信',actors:['lost-candidate']})
  const migrated=life.migratePeople(s)
  expect(migrated.ledger.at(-1)?.actors).toEqual(['unresolved:lost-candidate'])
  expect(Object.values(migrated.legacyKeys)).not.toContain('lost-candidate')
  expect(life.legacyPeopleView(migrated).ledger.at(-1)?.actors).toEqual(['lost-candidate'])
})

it('keeps projected accounts and legacy relations detached from canonical state', () => {
  const graph=life.generate('detached')
  const projected=life.legacyPeopleView(graph)
  expect(()=>{ projected.households.birth.cash++ }).toThrow()
  projected.npcs[2].parents=[]
  expect(graph.households.birth.cash).toBe(projected.cash)
  expect(graph.parentIds[idOf(graph,'sibling')]).toHaveLength(2)
  expect(graph).not.toHaveProperty('cash')
})

it('determines player inheritance from the structural parent edge with a role-independent legacy alias', () => {
  const s=born()
  s.npcs[0].id='relative-73'
  s.npcs[2].parents=['relative-73','mother']
  s.heads.birth='relative-73'
  s.playerParentKeys=['relative-73','mother']
  const graph=life.migratePeople(s)
  const view=life.legacyPeopleView(graph)
  const parent=view.npcs[0]
  parent.alive=false
  parent.money=7
  settle(view,parent.id)
  expect(view.settlements[0].shares.map(s=>[s.id,s.net])).toEqual([['player',4],['sibling',3]])
  expect(graph.parentIds[graph.playerId]).toContain(idOf(graph,'relative-73'))
})

it('resumes a pending canonical snapshot with the same candidate, stable IDs and outcome', () => {
  const s=born()
  Object.assign(s,{age:24,pending:'wedding'})
  s.candidate=candidate(s)
  const graph=life.migratePeople(s)
  const restored=life.migratePeople(JSON.parse(JSON.stringify(graph)))
  expect(life.decide(restored,'meet')).toEqual(life.decide(graph,'meet'))
  const invalid=structuredClone(graph)
  invalid.promise={id:'p999',due:s.year}
  expect(()=>life.migratePeople(invalid)).toThrow(/Unresolved/)
})
