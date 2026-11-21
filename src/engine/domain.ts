import { protagonist, type Life, type Relative } from './people.ts'
import type { Kin, State } from './types.ts'

/** Public flat clients and native Life commands share domain procedures. */
export type Game = Life | State
export type Person = Relative | Kin
export const canonical = (s: Game): s is Life => 'people' in s
export const player = (s: Game) => canonical(s) ? protagonist(s) : s
export const playerId = (s: Game) => canonical(s) ? s.playerId : 'player'
export function relative(s: Life, id: string) {
  const n = s.people[id]
  if (n?.kind !== 'relative') throw Error('Unknown relative: ' + id)
  return n
}
export const residents = (s: Game): Person[] =>
  canonical(s) ? s.residentOrder.map(id => relative(s,id)) : s.npcs
export const keyFor = (s: Game,id:string) => canonical(s) ? s.legacyKeys[id] : id
export function attitude(s: Game,n: Person) {
  if (canonical(s)) return s.towardPlayer[n.id]
  if ('trust' in n) return n
  throw Error('Missing attitude: ' + n.id)
}

export function register(s: Game, template: Kin, parents: string[], external = false): Person {
  if (!canonical(s)) {
    template.parents = parents
    if (!external) s.npcs.push(template)
    return template
  }
  const {id:key, trust, closeness, conflict, history, partner, parents:unused, ...facts} = template
  const id = 'p' + s.nextPerson
  if (Object.hasOwn(s.people,id) || Object.values(s.legacyKeys).includes(key))
    throw Error('Duplicate person: '+key)
  if (parents.some(id => !s.people[id])) throw Error('Unknown parent of '+key)
  s.nextPerson++
  const n: Relative = {...facts, id, kind:'relative', house: external ? null : facts.house}
  s.people[id] = n
  s.parentIds[id] = parents
  s.towardPlayer[id] = {trust,closeness,conflict,history}
  s.legacyKeys[id] = key
  if (!external) s.residentOrder.push(id)
  return n
}

export function parentsOf(s: Game, id: string): string[] {
  if (canonical(s)) return s.parentIds[id]
  if (id === 'player') return s.playerParentKeys ?? ['father','mother']
  return s.npcs.find(n => n.id === id)?.parents ?? []
}
export function partnerOf(s: Game, id: string) {
  if (canonical(s)) {
    const union = s.marriages.find(u => !u.end && u.pair.includes(id))
    return union?.pair.find(other => other !== id) ?? null
  }
  return id === 'player' ? s.spouse : s.npcs.find(n => n.id === id)?.partner ?? null
}
export function endUnion(s: Game, id: string, cause: 'ended'|'widowed') {
  if (canonical(s)) {
    const union = s.marriages.find(u => !u.end && u.pair.includes(id))
    if (union) union.end = {year:s.year,cause}
  } else {
    const other = partnerOf(s,id)
    for (const n of s.npcs) if (n.id === id || n.id === other) n.partner = null
    if (other === 'player' || id === 'player') {
      s.spouse = null
      s.marriage = cause
    }
  }
}

/** The Western Han slice follows the first birth sibling in persisted roster order. */
export function birthSibling(s: Game) {
  if (!canonical(s)) return s.npcs.find(n => n.id === 'sibling')
  const parents = s.parentIds[s.playerId]
  return residents(s).find(n => s.parentIds[n.id].some(id => parents.includes(id)))
}
/** Most recent union contact, including a surviving spouse after widowhood. */
export function siblingUnionContact(s: Game, sibling: Person | undefined) {
  if (!canonical(s)) return s.npcs.find(n => n.id === 'sibPartner')
  if (!sibling) return undefined
  const unions = s.marriages.filter(u => u.pair.includes(sibling.id))
  const union = unions.find(u => !u.end) ?? unions.at(-1)
  const id = union?.pair.find(id => id !== sibling.id)
  return id ? relative(s,id) : undefined
}

export function inLawParents(s: Game, house: string) {
  if (!canonical(s)) return [house+'elder0',house+'elder1']
  return s.marriages.filter(u => u.pair.includes(s.playerId))
    .flatMap(u => parentsOf(s,u.pair.find(id => id !== s.playerId)!))
}

export function formUnion(s: Game, first: string, second: string) {
  if (first === second || partnerOf(s,first) || partnerOf(s,second))
    throw Error('Invalid union: '+first+' / '+second)
  if (canonical(s)) {
    s.marriages.push({pair:[first,second],start:s.year,end:null})
  } else {
    for (const [a,b] of [[first,second],[second,first]]) {
      if (a === 'player') s.spouse = b
      else s.npcs.find(n => n.id === a)!.partner = b
    }
  }
}
export function kinContext(s: Game) {
  const p = player(s)
  return {seed:s.seed,year:s.year,sex:p.sex,home:p.home,surname:p.surname,residence:p.residence}
}

export const unionCount = (s: Game) => canonical(s)
  ? s.marriages.filter(u => u.pair.includes(s.playerId)).length : s.unions
export const currentCandidate = (s: Game): Person|null => canonical(s)
  ? (s.candidateId ? relative(s,s.candidateId) : null) : s.candidate
export function clearCandidate(s: Game) {
  if (canonical(s)) s.candidateId = null
  else s.candidate = null
}
