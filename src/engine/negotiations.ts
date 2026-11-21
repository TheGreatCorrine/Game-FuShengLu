import { account } from './accounts.ts'
import { attitude, canonical, clearCandidate, currentCandidate, keyFor, player, type Game, type Person } from './domain.ts'
import { random } from './rng.ts'
import type { Negotiation, ReplyOutcome } from './types.ts'

export function appointment(s: Game) {
  const last = s.negotiations?.at(-1)
  return last && !last.result ? last : undefined
}

export function schedule(s: Game, person: Person, contact: 'meet' | 'terms') {
  if (appointment(s) || currentCandidate(s)?.id !== person.id) throw Error('Invalid marriage appointment')
  const delay = contact === 'meet' ? 1 : 2
  const history = s.negotiations ??= []
  history.push({person:person.id, opened:s.year, due:s.year+delay, contact})
  return contact === 'meet' ? '你和'+person.name+'见面谈过，两人定在明年回话。'
    : person.name+'愿和家人细算两家的用度，约好两年后给准信。'
}

export function willing(s: Game, n: Person, draw: number) {
  return draw < 0.45 + 0.15*n.generosity +
    0.09*Number(attitude(s,n).history.some(m=>m.id==='meeting')) +
    0.08*Number(player(s).skill>=3) + 0.12*Number(account(s).debt===0)
}

const reasons: Record<ReplyOutcome,string> = {
  willing:'托媒人带话，说自己愿意成婚，等你亲口答复。',
  refused:'请媒人回话，说自己不愿成这门亲，谢过两家的好意。',
  withdrawn:'捎信说家里眼下离不开人，请收回这次婚议。',
  changedPlans:'另有谋生的打算，来信说不能再依先前的约定。',
  illness:'托人捎话，身体欠安，要安心休养，这次婚议就此作罢。',
  candidateDeath:'的故讯传来，先前的婚议就此作罢。',
  playerDeath:'未能等到你的回话，这场婚议随你辞世而止。',
  ineligible:'收到了媒人的回报，两家已错过此次议亲的时机。',
  declined:'收到你的回话，知道这门婚事就此作罢。',
}

export function conclude(s: Game, n: Person, outcome: ReplyOutcome) {
  let row = appointment(s)
  if (!row) {
    row = {person:n.id, opened:s.year, due:null, contact:'immediate'} satisfies Negotiation
    const history = s.negotiations ??= []
    history.push(row)
  }
  if (n.id !== row.person) throw Error('Marriage reply from wrong person')
  row.result = {year:s.year,outcome}
  if (outcome !== 'willing') {
    if (!canonical(s) && 'parents' in n) (s.archivedCandidates ??= []).push(n)
    clearCandidate(s)
  }
  return n.name+reasons[outcome]
}

export function respond(s: Game, n: Person, acute: string) {
  const row = appointment(s)!
  const key = 'courtship/'+keyFor(s,n.id)+'/'+row.opened+'/'+row.contact
  if (acute) return 'illness'
  if (willing(s,n,random(s.seed,key+'/consent'))) return 'willing'
  const motive = random(s.seed,key+'/reason')
  return motive < 1/3 ? 'refused' : motive < 2/3 ? 'withdrawn' : 'changedPlans'
}

export function hasReply(s: Game) {
  const row = s.negotiations?.at(-1)
  return row?.result?.outcome === 'willing' && row.result.year === s.year &&
    row.person === currentCandidate(s)?.id
}
