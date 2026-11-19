import { protagonist, type Life } from './people.ts'
import type { Estate, State } from './types.ts'

type Projection = 'cash' | 'assets' | 'debt' | 'estates'
type Snapshot = Omit<State, Projection>
export type LegacySnapshot = Omit<Snapshot, 'households'> & Estate & {
  estates: Record<string, Estate>
}

export function account(s: Pick<State,'households'|'residence'> | Life, id = 'residence' in s ? s.residence : protagonist(s).residence): Estate {
  if (!Object.hasOwn(s.households, id)) throw Error('Missing household: ' + id)
  return s.households[id]
}

export function openHouse(s: Snapshot, id: string, balances: Estate) {
  if (Object.hasOwn(s.households, id) || Object.hasOwn(s.closedHouses, id))
    throw Error('Duplicate household: ' + id)
  Object.defineProperty(s.households, id, {
    value: { ...balances }, writable: true, enumerable: true, configurable: true,
  })
}

export function moveResidence(s: Snapshot, destination: string) {
  account(s, destination)
  if (s.residence === destination) return
  // Legacy settlement visited current first, then other books in insertion order.
  const previous = s.residence
  const book = account(s, previous)
  delete s.households[previous]
  Object.defineProperty(s.households, previous, {
    value: book, writable: true, enumerable: true, configurable: true,
  })
  s.residence = destination
}

function formerBooks(s: Snapshot) {
  return Object.freeze(Object.fromEntries(Object.entries(s.households)
    .filter(([id]) => id !== s.residence)
    .map(([id, book]) => [id, Object.freeze({ ...book })])))
}

export function withAccountViews(s: Snapshot): State {
  return Object.defineProperties(s, {
    cash: { get: () => account(s).cash },
    assets: { get: () => account(s).assets },
    debt: { get: () => account(s).debt },
    estates: { get: () => formerBooks(s) },
  }) as State
}

export function migrateHouseholds(input: LegacySnapshot | Snapshot): State {
  const snapshot = structuredClone(input)
  let state: Snapshot
  if ('households' in snapshot) {
    for (const key of ['cash', 'assets', 'debt', 'estates'])
      if (Object.hasOwn(snapshot, key)) throw Error('Mixed account schemas: ' + key)
    state = snapshot
  } else {
    const { cash, assets, debt, estates, ...rest } = snapshot
    state = { ...rest, households: {} }
    openHouse(state, state.residence, { cash, assets, debt })
    const books = Object.values(estates)
    if (new Set(books).size !== books.length) throw Error('Aliased legacy household accounts')
    for (const [id, book] of Object.entries(estates)) openHouse(state, id, book)
  }
  validateHouseholds(state)
  return withAccountViews(state)
}

export function validateHouseholds(state: Snapshot) {
  const owners = new Set<Estate>()
  for (const [id, book] of Object.entries(state.households)) {
    if (owners.has(book) || Object.hasOwn(state.closedHouses, id))
      throw Error('Conflicting household account: ' + id)
    owners.add(book)
    for (const value of [book.cash, book.assets, book.debt])
      if (!Number.isSafeInteger(value) || value < 0) throw Error('Invalid balance: ' + id)
  }
  account(state)
  for (const person of state.npcs) if (person.alive) account(state, person.house)
}
