// The scheduler still executes one Stage 1 command on a detached legacy view.
// Its RNG keys, array iteration and heir sorting remain the compatibility contract.
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
  return collectPeople(legacy.confirmName(legacyPeopleView(s), name),s)
}
export function advance(s: Life) {
  const p = protagonist(s)
  if (!p.name || p.dead || s.pending) return s
  let lost: Kin | undefined
  const next = legacy.advance(legacyPeopleView(s), n => { lost = n })
  return collectPeople(next,s,lost)
}
export function decide(s: Life, action: Action) {
  return collectPeople(legacy.decide(legacyPeopleView(s),action),s)
}
export function skip(s: Life) {
  while (protagonist(s).name && !protagonist(s).dead && !s.pending) s=advance(s)
  return s
}
