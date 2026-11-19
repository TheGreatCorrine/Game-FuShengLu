import { ageResidents } from './family.ts'
import { confirmedName } from './operations.ts'
import { beginYear, continueYear } from './scheduler.ts'
import { withAccountViews } from './accounts.ts'
import * as legacy from '../engine.ts'
import { collectPeople, legacyPeopleView, protagonist } from './people.ts'
import type { Life } from './people.ts'
import type { Kin } from './types.ts'
import type { Action } from '../data.ts'

export { legacyPeopleView, migratePeople, validatePeople } from './people.ts'
export { generate } from './birth.ts'
export function confirmName(s: Life, name: string) {
  const value = confirmedName(protagonist(s).name, name)
  const next = structuredClone(s)
  protagonist(next).name = value
  return next
}
export function advance(s: Life) {
  const p = protagonist(s)
  if (!p.name || p.dead || s.pending) return s
  const draft = structuredClone(s)
  beginYear(draft)
  const next = continueYear(withAccountViews(structuredClone(legacyPeopleView(draft))),
    legacy.eligible)
  return collectPeople(next,draft)
}
export function decide(s: Life, action: Action) {
  return collectPeople(legacy.decide(legacyPeopleView(s),action),s)
}
export function skip(s: Life) {
  while (protagonist(s).name && !protagonist(s).dead && !s.pending) s=advance(s)
  return s
}
