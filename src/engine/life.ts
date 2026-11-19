import { ageResidents } from './family.ts'
import { confirmedName } from './operations.ts'
import { scheduleYear } from './scheduler.ts'
import { withAccountViews } from './accounts.ts'
import * as legacy from '../engine.ts'
import { collectPeople, legacyPeopleView, protagonist } from './people.ts'
import type { Life } from './people.ts'
import type { Kin } from './types.ts'
import type { Action } from '../data.ts'

export { legacyPeopleView, migratePeople, validatePeople } from './people.ts'
export function generate(...args: Parameters<typeof legacy.generate>) {
  return collectPeople(legacy.generate(...args))
}
export function confirmName(s: Life, name: string) {
  const value = confirmedName(protagonist(s).name, name)
  const next = structuredClone(s)
  protagonist(next).name = value
  return next
}
export function advance(s: Life) {
  const p = protagonist(s)
  if (!p.name || p.dead || s.pending) return s
  let lost: Kin | undefined
  const player = { ...p }
  const draft = { ...s, people: { ...s.people, [s.playerId]: player } }
  const residents = draft.residentOrder.map(id => {
    const n = draft.people[id]
    if (n?.kind !== 'relative') throw Error('Invalid resident: ' + id)
    const resident = { ...n }
    draft.people[id] = resident
    return resident
  })
  const next = scheduleYear(draft, player, s.legacyKeys[s.playerId],
    () => ageResidents(draft, residents, id => draft.legacyKeys[id]),
    () => withAccountViews(structuredClone(legacyPeopleView(draft))), legacy.eligible,
    n => { lost = n })
  return collectPeople(next,s,lost)
}
export function decide(s: Life, action: Action) {
  return collectPeople(legacy.decide(legacyPeopleView(s),action),s)
}
export function skip(s: Life) {
  while (protagonist(s).name && !protagonist(s).dead && !s.pending) s=advance(s)
  return s
}
