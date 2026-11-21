import { migrateHouseholds, validateHouseholds, withAccountViews } from './accounts.ts'
import type { Kin, Memory, State } from './types.ts'

type PersonId = string
type Attitude = Pick<Kin, 'trust' | 'closeness' | 'conflict' | 'history'>
export type Relative = Omit<Kin, 'parents' | 'partner' | 'history' | 'trust' | 'closeness' | 'conflict' | 'house'> & {
  kind: 'relative'
  house: string | null
}
const playerFields = ['birth','age','surname','name','sex','health','acute','risk','vulnerability',
  'talent','skill','practice','training','work','purse','dead','home','residence'] as const
type Protagonist = Pick<State, typeof playerFields[number]> & { kind: 'player'; id: PersonId }
type Union = {
  pair: [PersonId, PersonId]
  start: number | null
  end: { year: number | null; cause: 'widowed' | 'ended' } | null
}
type Graph = {
  people: Record<PersonId, Relative | Protagonist>
  legacyKeys: Record<PersonId, string>
  parentIds: Record<PersonId, PersonId[]>
  towardPlayer: Record<PersonId, Attitude>
  marriages: Union[]
  residentOrder: PersonId[]
  candidateId: PersonId | null
  playerId: PersonId
  nextPerson: number
}
type World = Omit<State, typeof playerFields[number] | 'playerParentKeys' | 'spouse' | 'candidate' | 'marriage' | 'unions' |
  'exportedPersonKeys' | 'archivedCandidates' | 'npcs' | 'cash' | 'assets' | 'debt' | 'estates'>
export type Life = World & Graph

function resolve(keys: Map<string,string>, key: string, field: string) {
  const id = keys.get(key)
  if (!id) throw Error('Unresolved person at ' + field + ': ' + key)
  return id
}

function mapReferences<T extends Pick<State,'negotiations'|'loans'|'settlements'|'heads'|'promise'|'news'|'chronicle'|'ledger'>>(
  s: T, active: (key:string, field:string)=>string, historical: (key:string)=>string,
) {
  // Entries can be shared between chronicle and ledger. Translate each object once.
  const visited = new Set<State['ledger'][number]>()
  for (const rows of [s.news,s.chronicle,s.ledger]) {
    for (const row of rows) {
      if (!visited.has(row) && row.actors) row.actors = row.actors.map(historical)
      visited.add(row)
    }
  }
  for (const row of s.negotiations ?? []) row.person = active(row.person,'negotiations.person')
  for (const loan of s.loans) loan.debtor = active(loan.debtor,'loan.debtor')
  for (const record of s.settlements) {
    record.owner = active(record.owner,'settlement.owner')
    for (const share of record.shares) share.id = active(share.id,'settlement.share')
  }
  for (const [house,id] of Object.entries(s.heads)) if (id !== null) s.heads[house] = active(id,'heads.'+house)
  if (s.promise) s.promise.id = active(s.promise.id,'promise')
}

function translateMemory(history: Memory[], translate: (key:string)=>string) {
  return history.map(m => ({ ...m, actors: m.actors.map(translate) }))
}

function playerUnions(g: Graph) {
  return g.marriages.filter(u=>u.pair.includes(g.playerId))
}

export function marriageSummary(g: Graph): State['marriage'] {
  const list = playerUnions(g)
  const last = list.at(-1)
  if (!last) return 'never'
  return last.end?.cause ?? (list.length === 1 ? 'married' : 'remarried')
}

// Convert a detached command result. Older entities and closed unions carry forward.
export function collectPeople(source: State, prior?: Life, lostCandidate?: Kin): Life {
  const snapshot = structuredClone(source)
  const { npcs, exportedPersonKeys, archivedCandidates = [], candidate, spouse, marriage, unions, playerParentKeys, ...world } = snapshot
  const g: Graph = {
    playerId: prior?.playerId ?? 'p0', nextPerson: prior?.nextPerson ?? 1,
    people: { ...prior?.people }, legacyKeys: { ...prior?.legacyKeys },
    towardPlayer: { ...prior?.towardPlayer }, parentIds: { ...prior?.parentIds },
    marriages: structuredClone(prior?.marriages ?? []), residentOrder: [], candidateId: null,
  }
  // A Stage A export may contain former candidates interleaved with later residents.
  // Preserve its IDs even though flat clients enumerate residents before visitors.
  if (!prior && exportedPersonKeys) {
    if (exportedPersonKeys[g.playerId] !== 'player') throw Error('Invalid exported protagonist')
    for (const [id,key] of Object.entries(exportedPersonKeys)) {
      if (!/^p(0|[1-9]\d*)$/.test(id) || !Number.isSafeInteger(Number(id.slice(1))) || !key)
        throw Error('Invalid exported person key')
      g.legacyKeys[id] = key
      g.nextPerson = Math.max(g.nextPerson, Number(id.slice(1))+1)
    }
  }
  g.legacyKeys[g.playerId] = 'player'
  const keys = new Map(Object.entries(g.legacyKeys).map(([id,key])=>[key,id]))
  const required = (key:string, field:string) => resolve(keys,key,field)
  // An old candidate can leave only a ledger reference in a Stage 1 snapshot.
  const historic = (key:string) => keys.get(key) ?? 'unresolved:' + key
  const people = [...npcs,...archivedCandidates]
  if (['wedding','weddingReply'].includes(source.pending) && !candidate && !prior) throw Error('Missing pending marriage candidate')
  if (candidate) {
    if (!candidate.alive || candidate.partner !== null || spouse !== null) throw Error('Invalid active candidate: '+candidate.id)
    people.push(candidate)
  }
  if (lostCandidate && !people.some(n=>n.id===lostCandidate.id)) people.push(lostCandidate)
  const encountered = new Set(['player'])
  for (const n of people) {
    if (encountered.has(n.id)) throw Error('Duplicate legacy person: ' + n.id)
    encountered.add(n.id)
    if (!keys.has(n.id)) {
      const id = 'p' + g.nextPerson++
      keys.set(n.id,id)
      g.legacyKeys[id] = n.id
    }
  }
  const player = {kind:'player', id:g.playerId} as Protagonist
  for (const field of playerFields) {
    Object.assign(player,{[field]:world[field]})
    Reflect.deleteProperty(world,field)
  }
  g.people[g.playerId] = player
  g.parentIds[g.playerId] = prior?.parentIds[g.playerId] ??
    (playerParentKeys ?? ['father','mother']).map(key=>required(key,'player.parents'))

  for (const n of people) {
    const {id:key,parents,partner,trust,closeness,conflict,history,house,...facts} = n
    const id = required(key,'person')
    const external = n === candidate || n === lostCandidate || archivedCandidates.includes(n)
    g.people[id] = { ...facts, kind:'relative', id, house:external ? null : house }
    g.parentIds[id] = parents.map(key=>required(key,'parents'))
    g.towardPlayer[id] = {trust,closeness,conflict,history:translateMemory(history,historic)}
    if (!external) g.residentOrder.push(id)
    if (n === candidate) g.candidateId = id
    if (partner !== null) required(partner,'partner')
  }
  mapReferences(world,required,historic)

  const partners = new Map<string,string>()
  if (spouse !== null) partners.set('player',spouse)
  for (const n of npcs) if (n.partner !== null) partners.set(n.id,n.partner)
  for (const [a,b] of partners) {
    if (a === b || partners.get(b) !== a) throw Error('Inconsistent active marriage: '+a+' / '+b)
  }
  for (const u of g.marriages.filter(u=>u.end === null)) {
    const [a,b] = u.pair.map(id=>g.legacyKeys[id])
    if (partners.get(a) !== b) {
      u.end = {year:world.year, cause:u.pair.includes(g.playerId) && marriage==='ended' ? 'ended' : 'widowed'}
    }
  }
  // In Stage 1 only accepted spouses enter the roster with the spouse role.
  // Retain proven former unions in roster order; an absent date stays unknown.
  if (!prior) {
    for (const n of npcs) {
      if (n.role !== '伴侣' || n.id === spouse) continue
      const id = required(n.id,'former spouse')
      const evidence = world.ledger.find(e=>(e.cause==='wedding' || e.cause==='weddingReply') && e.actors?.includes(id) && e.decision?.endsWith(':marry'))
      g.marriages.push({ pair:[g.playerId,id], start:evidence?.year ?? null,
        end:{year:null,cause:n.alive && player.dead ? 'ended' : 'widowed'} })
    }
    // The old sibling partner is introduced exclusively by the sibling-union event.
    if (keys.has('sibPartner') && !partners.has('sibPartner')) {
      g.marriages.push({pair:[required('sibling','former marriage'),required('sibPartner','former marriage')],
        start:null,end:{year:null,cause:'widowed'}})
    }
  }
  for (const [a,b] of partners) {
    const pair: [string,string] = [required(a,'union'),required(b,'union')]
    if (g.marriages.some(u=>!u.end && pair.every(id=>u.pair.includes(id)))) continue
    const evidence = pair.includes(g.playerId) && world.ledger.find(e=>(e.cause==='wedding' || e.cause==='weddingReply') &&
      e.decision?.endsWith(':marry') && pair.every(id=>e.actors?.includes(id)))
    g.marriages.push({pair,start:prior ? world.year : (evidence ? evidence.year ?? null : null),end:null})
  }
  if (playerUnions(g).length !== unions || marriageSummary(g) !== marriage)
    throw Error('Unresolved legacy marriage history: '+marriage+' / '+unions)
  return { ...world,...g }
}

export function migratePeople(snapshot: Parameters<typeof migrateHouseholds>[0] | Life): Life {
  const life = 'people' in snapshot ? structuredClone(snapshot) : collectPeople(migrateHouseholds(snapshot))
  validatePeople(life)
  return life
}

export function protagonist(s: Life): Protagonist {
  const p = s.people[s.playerId]
  if (p?.kind !== 'player') throw Error('Missing protagonist: '+s.playerId)
  return p
}

// This detached compatibility view is discarded after a command or render.
export function legacyPeopleView(state: Life): State {
  const { people,playerId,parentIds,towardPlayer,legacyKeys,marriages,residentOrder,candidateId,nextPerson,...world } =
    structuredClone(state)
  const graph = {people,playerId,parentIds,towardPlayer,legacyKeys,marriages,residentOrder,candidateId,nextPerson}
  const key = (id:string) => {
    if (!Object.hasOwn(legacyKeys,id)) throw Error('Unresolved stable person: '+id)
    return legacyKeys[id]
  }
  const historic = (id:string) => id.startsWith('unresolved:') ? id.slice(11) : key(id)
  const partners = new Map<string,string>()
  for (const u of marriages) if (!u.end) {
    const [a,b] = u.pair
    partners.set(a,b); partners.set(b,a)
  }
  const {kind,id,...p} = protagonist(state)
  function kin(id:string): Kin {
    const n = people[id]
    if (n.kind !== 'relative') throw Error('Expected relative '+id)
    const attitude = towardPlayer[id]
    // Field order is part of the Stage 0 golden serialization.
    return {sex:n.sex,parents:parentIds[id].map(key),partner:partners.has(id)?key(partners.get(id)!):null,
      born:n.born,acute:n.acute,ambition:n.ambition,tier:n.tier,conflict:attitude.conflict,
      history:translateMemory(attitude.history,historic),house:n.house ?? p.residence,background:n.background,
      id:key(id),role:n.role,age:n.age,name:n.name,alive:n.alive,health:n.health,work:n.work,position:n.position,
      goal:n.goal,generosity:n.generosity,trust:attitude.trust,closeness:attitude.closeness,money:n.money,memories:n.memories}
  }
  const archived = Object.keys(people).filter(id => id !== candidateId && people[id].kind === 'relative' &&
    !residentOrder.includes(id) && world.negotiations?.length)
  mapReferences(world,key,historic)
  // Public compatibility projections cannot be used as a second account ledger.
  for (const book of Object.values(world.households)) Object.freeze(book)
  Object.freeze(world.households)
  return withAccountViews({...world,...p,playerParentKeys:parentIds[playerId].map(key),spouse:partners.has(playerId)?key(partners.get(playerId)!):null,
    marriage:marriageSummary(graph),unions:playerUnions(graph).length,npcs:residentOrder.map(kin),
    ...(world.negotiations?.length ? {exportedPersonKeys:legacyKeys} : {}),
    ...(archived.length ? {archivedCandidates:archived.map(kin)} : {}),
    candidate:candidateId ? kin(candidateId) : null})
}

export function validatePeople(s: Life) {
  const player = protagonist(s)
  const ids = Object.keys(s.people)
  const defined = (id:string) => {
    if (!Object.hasOwn(s.people,id)) throw Error('Unresolved person: '+id)
  }
  if (Object.keys(s.legacyKeys).length !== ids.length ||
      new Set(Object.values(s.legacyKeys)).size !== ids.length) throw Error('Invalid identity map')
  const roster = new Set(s.residentOrder)
  if (roster.size !== s.residentOrder.length || roster.has(s.playerId)) throw Error('Invalid resident order')
  for (const id of roster) defined(id)
  if (s.candidateId) {
    defined(s.candidateId)
    const n = s.people[s.candidateId]
    if (roster.has(s.candidateId) || n.kind !== 'relative' || !n.alive) throw Error('Invalid candidate')
  }
  for (const field of ['spouse','npcs','candidate','unions','marriage','residence','cash','assets','debt','estates'])
    if (Object.hasOwn(s,field)) throw Error('Mixed identity/account schemas: '+field)
  for (const id of Object.keys(s.parentIds)) defined(id)
  for (const id of Object.keys(s.towardPlayer)) {
    defined(id)
    if (id===s.playerId) throw Error('Unexpected self attitude')
    for (const memory of s.towardPlayer[id].history) for (const actor of memory.actors)
      if (!actor.startsWith('unresolved:')) defined(actor)
  }
  const closed = new Set<string>()
  for (const [index,row] of (s.negotiations ?? []).entries()) {
    defined(row.person)
    if (s.people[row.person].kind !== 'relative' ||
      (row.contact === 'immediate' ? row.due !== null : row.due !== row.opened+(row.contact === 'meet' ? 1 : 2)))
      throw Error('Invalid marriage appointment')
    if (!row.result && (row.person !== s.candidateId || index !== s.negotiations!.length-1 || player.dead))
      throw Error('Orphan marriage appointment')
    if (row.result && row.result.outcome !== 'willing') closed.add(row.person)
  }
  const complete = new Set<string>()
  function ancestry(id:string, chain:Set<string>) {
    defined(id)
    if (chain.has(id)) throw Error('Cyclic parentage: '+id)
    if (complete.has(id)) return
    chain.add(id)
    const parents = s.parentIds[id]
    if (!parents || new Set(parents).size !== parents.length) throw Error('Invalid parents: '+id)
    for (const parent of parents) ancestry(parent,chain)
    chain.delete(id)
    complete.add(id)
  }
  for (const id of ids) {
    ancestry(id,new Set())
    const n = s.people[id]
    if ((n.kind==='player') !== (id===s.playerId)) throw Error('Unexpected protagonist: '+id)
    if (n.id !== id || !s.legacyKeys[id] || !/^p\d+$/.test(id) || Number(id.slice(1)) >= s.nextPerson)
      throw Error('Invalid stable identity: '+id)
    if (n.kind === 'relative') {
      if (roster.has(id) !== (n.house !== null) || !s.towardPlayer[id]) throw Error('Invalid membership: '+id)
      if (n.alive && n.house === null && id !== s.candidateId && !closed.has(id)) throw Error('Untracked external person: '+id)
    }
  }
  const partnered = new Set<string>()
  for (const u of s.marriages) {
    const [a,b] = u.pair
    defined(a); defined(b)
    if (a===b) throw Error('Self marriage')
    if (!u.end) {
      if (partnered.has(a)||partnered.has(b)) throw Error('Conflicting active marriage')
      for (const id of u.pair) {
        const n=s.people[id]
        if (n.kind==='player' ? player.dead : !n.alive || n.house===null) throw Error('Invalid active spouse: '+id)
        partnered.add(id)
      }
    }
  }
  validateHouseholds(legacyPeopleView(s))
}
