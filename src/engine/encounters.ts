import { payHouseDebt, changeOccupation } from './operations.ts'
import { account, openHouse } from './accounts.ts'
import { homes } from '../data.ts'
import type { State, Kin } from './types.ts'
import { authority, spendable } from './legal.ts'
import { kin, remember, helpChance } from './family.ts'
import { random } from './rng.ts'
import type { Action } from '../data.ts'
export function candidate(s: State) {
  if (s.candidate) return s.candidate
  const p = kin(
    s,
    '伴侣',
    s.age + 1,
    'spouse' + (s.unions + 1) + '-' + s.wedding.attempts,
  )
  p.background = Math.floor(
    random(s.seed, 'match' + s.wedding.attempts) * homes.length,
  )
  p.work = homes[p.background].work
  return p
}
export function participant(s: State, id: string) {
  const local = s.npcs.filter((n) => n.alive && n.house === s.residence)
  if (id === 'turn' || id === 'studyConflict' || id === 'letters')
    return local.find((n) => n.id === authority(s, s.residence))
  if (id === 'wedding') return candidate(s)
  if (id === 'siblingPlan')
    return local.find(
      (n) =>
        n.id === 'sibling' &&
        n.age >= 18 &&
        !n.partner &&
        !n.acute &&
        n.house === 'birth' &&
        n.money >= 4 &&
        (n.ambition > 0.45 || n.goal === '积谷'),
    )
  if (id === 'spousePlan')
    return local.find(
      (n) =>
        n.id === s.spouse &&
        !n.acute &&
        n.age < 60 &&
        n.work !== '织作' &&
        (n.ambition > 0.5 || (n.goal === '积谷' && account(s).debt > 0)),
    )
  if (id === 'feast')
    return local.find(n => ['父亲','母亲','姻亲长辈（父）','姻亲长辈（母）'].includes(n.role))
  if (id === 'medicine')
    return local
      .filter((n) => n.acute)
      .sort((a, b) => a.health - b.health || a.id.localeCompare(b.id))[0]
  const people =
    id === 'letterHome'
      ? s.npcs.filter((n) => n.alive && n.house === 'birth' && n.age >= 15)
      : local
  const options =
    id === 'relief' ? people.filter((n) => n.age >= 16 && n.money > 0) : people
  // Select the responsible household contact, or the relative with strongest existing ties.
  return [...options].sort(
    (a, b) =>
      Number(b.id === authority(s, b.house)) -
        Number(a.id === authority(s, a.house)) ||
      b.closeness - a.closeness ||
      a.id.localeCompare(b.id),
  )[0]
}
export function allowed(s: State, id: string, a: Action) {
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
export function narrative(s: State, id: string, body: string) {
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
        (n.history.some((m) => m.id === 'care')
          ? '“还记得那回你留下照应我。这次又要你费心了。”'
          : '“有余钱便捎一点。若手紧，给我个准信，我好另作打算。”')
      )
    case 'wedding': {
      const guardian = s.npcs.find(
        (k) => k.alive && k.id === authority(s, s.residence),
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
export function negotiate(s: State, n: Kin, id: string, a: Action, r: number) {
  const yes = r < helpChance(s, n)
  switch (a) {
    case 'halfDays':
      if (!yes && n.goal === '积谷' && account(s).debt > 0) {
        remember(s, n, 'dispute', -0.04)
        return n.name + '指着未完的活：“少了半日也赶不及。这次等一等。”'
      }
      account(s).cash -= 2
      s.skill++
      s.practice++
      s.training = '半日习读'
      if (!s.queue.some((q) => q.cause === 'turn'))
        s.queue.push({ age: 18, cause: 'turn' })
      remember(s, n, 'halfDays', 0.06)
      return n.name + '答应只请半日的课。你天亮先做活，午后再去认字。'
    case 'split': {
      const own = Math.min(4, n.money)
      s.purse -= 4
      n.money -= own
      openHouse(s, 'sibling', { cash: 4 + own, debt: 0, assets: 0 })
      n.house = 'sibling'
      s.heads.sibling = n.id
      remember(s, n, 'aid', 0.12)
      return n.name + '收下你的四钱，合上自己的积蓄，搬去另过。'
    }
    case 'apprentice':
      if (yes) {
        changeOccupation(n, '织作')
        remember(s, n, 'introduction', 0.08)
        return n.name + '愿意先试你介绍的织活，暂留原户。'
      }
      remember(s, n, 'dispute', -0.04)
      return n.name + '谢过你，说还是想自己谋出路。'
    case 'stake':
      s.purse -= 3
      changeOccupation(n, '织作')
      remember(s, n, 'aid', 0.1)
      return n.name + '用你出的三钱置线，接下第一匹布。'
    case 'trial':
      s.practice++
      if (n.ambition + r > 0.8) {
        changeOccupation(n, '织作')
        remember(s, n, 'trial', 0.06)
        return n.name + '自己接下织活，你接手了一部分家务。'
      }
      return n.name + '衡量了一回，决定先守住现有的活。'
    case 'object':
      remember(s, n, 'dispute', -0.07)
      if (n.ambition + r > 1.2) {
        changeOccupation(n, '织作')
        return n.name + '听完仍接了织活：“这一次，我想自己拿主意。”'
      }
      return n.name + '收起了线样，暂且继续原来的生计。'
    case 'medicineFee':
      s.purse -= 5
      n.health = Math.min(100, n.health + (yes ? 12 : 4))
      remember(s, n, 'care', 0.1)
      return (
        '你用五钱请人照看' +
        n.name +
        '。' +
        (yes ? '歇过一阵，精神好些。' : '仍觉不适，还得慢慢养。')
      )
    case 'nurse':
      s.careYear = s.year + 1
      n.health = Math.min(100, n.health + 7)
      remember(s, n, 'care', 0.12)
      return '你应下照料' + n.name + '，接下来的活要少做一些。'
    case 'pledge':
      s.promise = { id: n.id, due: s.year + 1 }
      remember(s, n, 'promise', 0.03)
      return n.name + '收到回信，等你来年从私钱中匀出至多六钱。'
    case 'meet':
      remember(s, n, 'meeting', 0.08)
      return '你先同' + n.name + '谈过成家后的用度，约定日后再议。'
    case 'waitPlan':
      remember(s, n, 'delay', -0.02)
      return n.name + '收回自己的钱，打算先攒着。'
    default:
      throw Error('Unsupported negotiation ' + id)
  }
}
export function fulfill(s: State) {
  const p = s.promise
  if (!p || s.year < p.due) return
  s.promise = null
  const n = s.npcs.find((n) => n.id === p.id && n.alive && n.house === 'birth'),
    book = s.residence === 'birth' ? undefined : s.households.birth
  if (!n || !book || s.dead || !book.debt) return
  const amount = payHouseDebt(s, book, 6)
  remember(s, n, amount ? 'aid' : 'brokenPromise', amount ? 0.12 : -0.09)
  const entry = {
    age: s.age,
    year: s.year,
    cause: 'letterHome',
    actors: ['player', n.id],
    text: amount
      ? '照去年的约定，你给' + n.name + '捎回' + amount + '钱抵旧账。'
      : '这一年仍无余钱，你只得写信给' + n.name + '说明失约。',
  }
  s.chronicle.push(entry)
  s.ledger.push(entry)
}
