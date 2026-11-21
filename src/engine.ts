import { generate as birth } from './engine/birth.ts'
import { legacyPeopleView } from './engine/people.ts'
import { runYear } from './engine/scheduler.ts'
import { confirmedName } from './engine/operations.ts'
import { withAccountViews } from './engine/accounts.ts'
import { resolveChoice } from './engine/choices.ts'
import type { Action } from './data.ts'
import type { Kin, State } from './engine/types.ts'

export { eligible, participant, narrative } from './content/western-han/events.ts'
export { date } from './content/western-han/date.ts'
export { support } from './engine/choices.ts'
export { migrateHouseholds } from './engine/accounts.ts'
export { yearImpact } from './engine/economy.ts'
export { random } from './engine/rng.ts'
export type { State, Kin }
export function generate(...args: Parameters<typeof birth>) {
  const projected = legacyPeopleView(birth(...args))
  const {playerParentKeys, ...flat} = structuredClone(projected)
  return withAccountViews(flat)
}
export function confirmName(s: State, name: string) {
  return withAccountViews({ ...structuredClone(s), name: confirmedName(s.name, name) })
}
export function advance(input: State, onCandidateDeath?: (person: Kin) => void): State {
  if (!input.name || input.dead || input.pending) return input
  const draft = withAccountViews(structuredClone(input))
  runYear(draft,onCandidateDeath)
  return draft
}
export function decide(input: State, action: Action): State {
  const draft = withAccountViews(structuredClone(input))
  resolveChoice(draft,action)
  return draft
}
export function skip(s: State) {
  while (s.name && !s.dead && !s.pending) s = advance(s)
  return s
}
