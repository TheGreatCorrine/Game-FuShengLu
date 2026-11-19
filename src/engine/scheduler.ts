import { canonical, currentCandidate, clearCandidate, player, playerId, keyFor, residents, type Game } from './domain.ts'
import { account } from './accounts.ts'
import { environmentFor, household } from './economy.ts'
import { candidate, fulfill } from './encounters.ts'
import { ageResidents, developFamily, finishResidentDeaths } from './family.ts'
import { livelihood } from './livelihood.ts'
import { annualHealth } from './mortality.ts'
import { changeOccupation } from './operations.ts'
import { random, weighted } from './rng.ts'
import type { Kin, State } from './types.ts'

export function record(s: Game, text: string, cause?: string) {
  const entry = { age: player(s).age, year: s.year, text, cause }
  s.chronicle.push(entry)
  if (cause) s.ledger.push(entry)
}
function mature(s: Game) {
  const p = player(s)
  for (const q of s.queue.filter((q) => q.age === p.age)) {
    if (p.age === 18 && ['习读', '半日习读'].includes(p.training)) {
      const ok =
        p.health > 40 &&
        random(s.seed, 'completion') <
          0.45 + 0.3 * p.talent + 0.15 * Number(account(s).debt === 0)
      p.training = ok ? '学成' : '中辍'
      p.skill += ok ? 3 : 0
      record(
        s,
        ok
          ? '三年习读，如今能独自理清一册货账。'
          : '家事与生计牵扯，未能读完。',
        q.cause,
      )
    }
  }
  s.queue = s.queue.filter((q) => q.age > p.age)
}
export function beginYear(s: Game, onCandidateDeath?: (person: Kin) => void) {
  const p = player(s)
  if (!p.name || p.dead || s.pending) throw Error('Year cannot advance')
  const key = keyFor(s,playerId(s))
  if (!key) throw Error('Missing player health key')
  p.age++
  s.year++
  s.env = environmentFor(s,p)
  Object.assign(p,annualHealth(p.age,p.health,p.vulnerability,s.env.disease,account(s).debt > 0,
    k => random(s.seed,key+k+s.year),s.mortality))
  finishResidentDeaths(s,ageResidents(s,residents(s),id => keyFor(s,id)))
  household(s)
  if (!p.dead) developFamily(s)
  if (!p.health) {
    p.dead = true
    record(
      s,
      p.acute
        ? '这场' + (p.acute === '受伤' ? '伤' : '病') + '后，你未能恢复。'
        : '此生至此，年谱收卷。',
    )
    return
  }
  fulfill(s)
  const n = currentCandidate(s)
  if (n) {
    n.age++
    const h = annualHealth(
      n.age,
      n.health,
      0.5,
      s.env.disease,
      false,
      (k) => random(s.seed, keyFor(s,n.id) + k + s.year),
      s.mortality,
    )
    n.health = h.health
    if (h.dead) {
      n.alive = false
      n.acute = h.acute
      if (!canonical(s) && 'parents' in n) onCandidateDeath?.(n)
      clearCandidate(s)
      s.wedding.attempts++
      record(s, n.name + '的故讯传来，先前的婚议就此作罢。')
    }
  }
  mature(s)
  if (p.age >= 15 && p.training !== '习读' && !p.acute) p.practice++
  const job = livelihood(s)
  if (job !== p.work) {
    changeOccupation(p, job)
    record(s, '开始' + job + '。', job === '佐理文书' ? 'turn' : undefined)
  }
  if (s.wedding.state === 'deferred' && p.age >= s.wedding.next)
    s.wedding.state = 'eligible'

}

export function continueYear(s: State, events: (s: State) => {id:string; weight:number}[],
  ): State {
  if (s.dead) return s
  const pool = events(s),
    turn = pool.find((e) => e.id === 'turn')
  if (turn) s.pending = turn.id
  else if (pool.length && random(s.seed, 'pause' + s.age) < 0.29)
    s.pending =
      pool[
        weighted(
          pool.map((e) => e.weight),
          random(s.seed, 'scene' + s.age),
        )
      ].id
  if (s.pending === 'wedding') {
    s.candidate = candidate(s)
    s.wedding.state = 'attempted'
  }
  return s
}
