import { account } from './accounts.ts'
import { environmentFor, household } from './economy.ts'
import { candidate, fulfill } from './encounters.ts'
import { developFamily, finishResidentDeaths } from './family.ts'
import { livelihood } from './livelihood.ts'
import { annualHealth } from './mortality.ts'
import { changeOccupation } from './operations.ts'
import { random, weighted } from './rng.ts'
import type { Kin, State } from './types.ts'

export function record(s: State, text: string, cause?: string) {
  const entry = { age: s.age, year: s.year, text, cause }
  s.chronicle.push(entry)
  if (cause) s.ledger.push(entry)
}
function mature(s: State) {
  for (const q of s.queue.filter((q) => q.age === s.age)) {
    if (s.age === 18 && ['习读', '半日习读'].includes(s.training)) {
      const ok =
        s.health > 40 &&
        random(s.seed, 'completion') <
          0.45 + 0.3 * s.talent + 0.15 * Number(account(s).debt === 0)
      s.training = ok ? '学成' : '中辍'
      s.skill += ok ? 3 : 0
      record(
        s,
        ok
          ? '三年习读，如今能独自理清一册货账。'
          : '家事与生计牵扯，未能读完。',
        q.cause,
      )
    }
  }
  s.queue = s.queue.filter((q) => q.age > s.age)
}
type YearWorld = Pick<State, 'year'|'region'|'env'|'seed'|'mortality'|'households'|'pending'>
type Player = Pick<State, 'name'|'age'|'dead'|'health'|'acute'|'risk'|'vulnerability'|'home'|'residence'>

// The caller owns the draft. Legacy domains receive it only after resident health.
export function scheduleYear(world: YearWorld, player: Player, rngKey: string,
  residentHealth: () => string[], workingState: () => State, events: (s: State) => {id:string; weight:number}[],
  onCandidateDeath?: (person: Kin) => void): State {
  if (!player.name || player.dead || world.pending) throw Error('Year cannot advance')
  if (!rngKey || !Object.hasOwn(world.households, player.residence))
    throw Error('Missing player health context')
  player.age++
  world.year++
  world.env = environmentFor(world, player)
  Object.assign(player, annualHealth(player.age, player.health, player.vulnerability,
    world.env.disease, world.households[player.residence].debt > 0,
    k => random(world.seed, rngKey + k + world.year), world.mortality))
  const deaths = residentHealth()
  const s = workingState()
  finishResidentDeaths(s, deaths)
  household(s)
  if (!s.dead) developFamily(s)
  if (!s.health) {
    s.dead = true
    record(
      s,
      s.acute
        ? '这场' + (s.acute === '受伤' ? '伤' : '病') + '后，你未能恢复。'
        : '此生至此，年谱收卷。',
    )
    return s
  }
  fulfill(s)
  if (s.candidate) {
    const n = s.candidate
    n.age++
    const h = annualHealth(
      n.age,
      n.health,
      0.5,
      s.env.disease,
      false,
      (k) => random(s.seed, n.id + k + s.year),
      s.mortality,
    )
    n.health = h.health
    if (h.dead) {
      onCandidateDeath?.({ ...n, alive: false, acute: h.acute })
      s.candidate = null
      s.wedding.attempts++
      record(s, n.name + '的故讯传来，先前的婚议就此作罢。')
    }
  }
  mature(s)
  if (s.age >= 15 && s.training !== '习读' && !s.acute) s.practice++
  const job = livelihood(s)
  if (job !== s.work) {
    changeOccupation(s, job)
    record(s, '开始' + job + '。', job === '佐理文书' ? 'turn' : undefined)
  }
  if (s.wedding.state === 'deferred' && s.age >= s.wedding.next)
    s.wedding.state = 'eligible'
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
