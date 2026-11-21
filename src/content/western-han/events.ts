import { marriageSummary } from '../../engine/people.ts'
import { inLawParents, attitude, birthSibling, parentsOf, partnerOf, playerId, residents, keyFor, canonical, currentCandidate, player, kinContext, register, unionCount, type Game, type Person } from '../../engine/domain.ts'
import { account } from '../../engine/accounts.ts'
import { kin } from '../../engine/family.ts'
import { authority, spendable } from '../../engine/legal.ts'
import { random } from '../../engine/rng.ts'
import type { Action } from './catalog.ts'
import type { Kin, State } from '../../engine/types.ts'
import { homes, rules, scenes } from './catalog.ts'

const living = (s: Game) => residents(s).filter(n => n.alive)
export function eligible(s: Game) {
  const p = player(s)
  return scenes
    .filter(
      (e) =>
        (e.id !== 'studyConflict' ||
          (p.training === '习读' &&
            account(s).debt > 0 &&
            participant(s, 'turn')?.goal === '积谷' &&
            parentsOf(s,playerId(s)).includes(participant(s, 'turn')!.id))) &&
        (e.id !== 'medicine' || !!participant(s, 'medicine')) &&
        (e.id !== 'personalLoan' || p.purse < 16 || account(s).debt > 0) &&
        (e.id !== 'collect' ||
          (p.age >= s.nextCollection &&
            s.loans.some(
              (l) => l.debtor === playerId(s) && l.balance > 0 && l.due <= s.year,
            ))) &&
        (e.id !== 'demand' ||
          (p.residence !== 'birth' && (s.households.birth?.debt ?? 0) > 0)) &&
        p.name &&
        !p.dead &&
        p.age >= e.min &&
        p.age <= e.max &&
        (!s.seen.includes(e.id) || e.id === 'wedding' || e.id === 'collect') &&
        (e.id !== 'relief' ||
          (account(s).debt >= 8 &&
            living(s).some(
              (n) => n.house === p.residence && n.age >= 16 && n.money > 0,
            ))) &&
        (e.id !== 'letterHome' ||
          (p.residence !== 'birth' &&
            (s.households.birth?.debt ?? 0) >= 8 &&
            p.purse >= 1 &&
            living(s).some((n) => n.house === 'birth'))) &&
        (e.id !== 'wedding' || p.age >= s.wedding.next) &&
        (!e.gate ||
          {
            books: homes[p.home].books > 0,
            kin: living(s).some((n) => n.house === p.residence),
            trained: p.training === '学成',
            single:
              p.age >= rules.marriageAge &&
              !partnerOf(s,playerId(s)) &&
              ((canonical(s) ? marriageSummary(s) : s.marriage) === 'widowed'
                ? p.age <= rules.family.widowAgeLimit
                : p.age <= 34),
            trade: p.home === 2,
          }[e.gate]),
    )
    .map((e) => ({
      ...e,
      choices: e.choices.filter(([, a]) => allowed(s, e.id, a)),
    }))
    .filter((e) => e.choices.length > 0)
}

export function candidate(s: State): Kin
export function candidate(s: Game): Person
export function candidate(s: Game) {
  const existing = currentCandidate(s)
  if (existing) return existing
  return candidateTemplate(s)
}
function candidateTemplate(s: Game) {
  const p = kin(
    kinContext(s),
    '伴侣',
    player(s).age + 1,
    'spouse' + (unionCount(s) + 1) + '-' + s.wedding.attempts,
  )
  p.background = Math.floor(
    random(s.seed, 'match' + s.wedding.attempts) * homes.length,
  )
  p.work = homes[p.background].work
  return p
}
export function bindCandidate(s: Game) {
  if (currentCandidate(s)) return
  const template = candidateTemplate(s)
  if (canonical(s)) s.candidateId = register(s,template,[],true).id
  else s.candidate = template
}
export function participant(s: State, id:string): Kin | undefined
export function participant(s: Game, id:string): Person | undefined
export function participant(s: Game, id: string) {
  const local = residents(s).filter((n) => n.alive && n.house === player(s).residence)
  if (id === 'turn' || id === 'studyConflict' || id === 'letters')
    return local.find((n) => n.id === authority(s, player(s).residence))
  if (id === 'wedding') return canonical(s) ? currentCandidate(s) ?? undefined : candidate(s)
  if (id === 'siblingPlan')
    return local.find(
      (n) =>
        n.id === birthSibling(s)?.id &&
        n.age >= 18 &&
        !partnerOf(s,n.id) &&
        !n.acute &&
        n.house === 'birth' &&
        n.money >= 4 &&
        (n.ambition > 0.45 || n.goal === '积谷'),
    )
  if (id === 'spousePlan')
    return local.find(
      (n) =>
        n.id === partnerOf(s,playerId(s)) &&
        !n.acute &&
        n.age < 60 &&
        n.work !== '织作' &&
        (n.ambition > 0.5 || (n.goal === '积谷' && account(s).debt > 0)),
    )
  if (id === 'feast') {
    if (canonical(s)) {
      const elders = [...parentsOf(s,s.playerId), ...inLawParents(s,player(s).residence)]
      return local.find(n => elders.includes(n.id))
    }
    return local.find(n => ['父亲','母亲','姻亲长辈（父）','姻亲长辈（母）'].includes(n.role))
  }
  if (id === 'medicine')
    return local
      .filter((n) => n.acute)
      .sort((a, b) => a.health - b.health || keyFor(s,a.id).localeCompare(keyFor(s,b.id)))[0]
  const people =
    id === 'letterHome'
      ? residents(s).filter((n) => n.alive && n.house === 'birth' && n.age >= 15)
      : local
  const options =
    id === 'relief' ? people.filter((n) => n.age >= 16 && n.money > 0) : people
  // Select the responsible household contact, or the relative with strongest existing ties.
  return [...options].sort(
    (a, b) =>
      Number(b.id === authority(s, b.house!)) -
        Number(a.id === authority(s, a.house!)) ||
      attitude(s,b).closeness - attitude(s,a).closeness ||
      keyFor(s,a.id).localeCompare(keyFor(s,b.id)),
  )[0]
}
export function allowed(s: Game, id: string, a: Action) {
  if (
    ['siblingPlan', 'spousePlan', 'medicine', 'letterHome'].includes(id) &&
    !participant(s, id)
  )
    return false
  if (id === 'feast' && a === 'bond') return !!participant(s, id)
  if (a === 'split') return spendable(s) >= 4
  if (a === 'medicineFee') return spendable(s) >= 5
  if (a === 'stake') return spendable(s) >= 3
  if (a === 'halfDays') return !!participant(s, id) && account(s).cash >= 2
  if (a === 'pledge') return !s.promise
  return true
}
export function narrative(s: Game, id: string, body: string) {
  const n = participant(s, id)
  if (!n) return body
  const who = n.role + ' ' + n.name
  switch (id) {
    case 'studyConflict':
      return who + '把简册合上：“近来家中缺人，往后的课能不能少去些？”'
    case 'turn':
      return (
        who +
        (account(s).debt ? '把借账压到席下。' : '把空出的木简放在案上。') +
        '邻里愿意教你识字，家里的活却要另找人接。\n' +
        (n.goal === '授业'
          ? '“我愿你读。先说说，你打算什么时候回来帮忙？”'
          : '“明早的活已经应下了。你去读书，这一头交给谁？”')
      )
    case 'siblingPlan':
      return (
        who +
        '把攒下的钱推到你面前，说想另起炉灶。\n“我自己出一份。你愿不愿意搭把手？挪不开钱，我也可以再攒一年。”'
      )
    case 'spousePlan':
      return (
        who +
        '平日做' +
        n.work +
        '，如今看中了邻里的织活。\n' +
        (account(s).debt
          ? '“再照旧做，欠账可不会自己少。丝线先得买。”'
          : '“第一匹布，我想自己试着织。你替我管几天家里的事？”')
      )
    case 'medicine':
      return (
        who +
        (n.acute === '受伤' ? '伤着了' : '病了') +
        '，今日歇了工。\n' +
        (n.goal === '积谷'
          ? '“请人来看也要钱。你坐一会儿就好。”'
          : '“水放近些。我缓过来，还想接着做手里的事。”')
      )
    case 'letterHome':
      return (
        who +
        '从旧家捎信，请你帮着还债。\n' +
        (attitude(s,n).history.some((m) => m.id === 'care')
          ? '“还记得那回你留下照应我。这次又要你费心了。”'
          : '“有余钱便捎一点。若手紧，给我个准信，我好另作打算。”')
      )
    case 'wedding': {
      const guardian = residents(s).find(
        (k) => k.alive && k.id === authority(s, player(s).residence),
      )
      return (
        (guardian
          ? guardian.role + ' ' + guardian.name + '捎来口信。'
          : '媒人捎来口信。') +
        n.name +
        '出身' +
        homes[n.background].name +
        '，平日做' +
        n.work +
        '。\n' +
        (n.goal === '积谷'
          ? '对方先问，两家礼钱出了，过冬的用度还有多少。'
          : '对方想知道，成家以后，是否还能抽空教孩子识字。')
      )
    }
    case 'relief':
      return (
        who +
        '和你一道摊开欠账，手边还有些私蓄。\n' +
        (n.goal === '积谷'
          ? '“哪些非得今天还？先说清楚。”'
          : '“先把一家人的吃用留下，再商量。”')
      )
    default:
      return body
  }
}
