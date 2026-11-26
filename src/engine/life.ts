import { annualPhase, openActionYear, settleInterviews } from './annual-actions.ts'
import { confirmedName } from './operations.ts'
import { runYear } from './scheduler.ts'
import { resolveChoice } from './choices.ts'
import { protagonist } from './people.ts'
import type { Life } from './people.ts'
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
  runYear(draft)
  if (s.annual) openActionYear(draft)
  return draft
}
export function decide(s: Life, action: Action) {
  const draft = structuredClone(s)
  resolveChoice(draft,action)
  if(draft.annual) settleInterviews(draft)
  return draft
}
export function skip(s: Life) {
  while (protagonist(s).name && !protagonist(s).dead && !s.pending) s=advance(s)
  return s
}

// Legacy advance/skip explicitly forgo optional actions. Interactive advancement
// waits for this year's decisions and never grants a budget midway through an old save.
export function nextPlayableYear(s: Life) {
  if (annualPhase(s)==='actions') return s
  const next=advance(s)
  if(next!==s && !s.annual) openActionYear(next)
  return next
}
export function endActionYear(s: Life) {
  if(annualPhase(s)!=='actions') return s
  const next=structuredClone(s)
  next.annual!.closed=true
  return next
}

export function skipToChoice(s: Life) {
  while(protagonist(s).name && annualPhase(s)==='finished') s=nextPlayableYear(s)
  return s
}
