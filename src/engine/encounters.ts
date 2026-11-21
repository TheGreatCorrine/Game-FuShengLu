import { player, playerId, residents, type Game, type Person } from './domain.ts'
import { payHouseDebt, changeOccupation } from './operations.ts'
import { account, openHouse } from './accounts.ts'
import { remember, helpChance } from './family.ts'
import type { Action } from '../data.ts'
export { participant, allowed, candidate, narrative } from '../content/western-han/events.ts'
export function negotiate(s: Game, n: Person, id: string, a: Action, r: number) {
  const p = player(s)
  const yes = r < helpChance(s, n)
  switch (a) {
    case 'halfDays':
      if (!yes && n.goal === '积谷' && account(s).debt > 0) {
        remember(s, n, 'dispute', -0.04)
        return n.name + '指着未完的活：“少了半日也赶不及。这次等一等。”'
      }
      account(s).cash -= 2
      p.skill++
      p.practice++
      p.training = '半日习读'
      if (!s.queue.some((q) => q.cause === 'turn'))
        s.queue.push({ age: 18, cause: 'turn' })
      remember(s, n, 'halfDays', 0.06)
      return n.name + '答应只请半日的课。你天亮先做活，午后再去认字。'
    case 'split': {
      const own = Math.min(4, n.money)
      p.purse -= 4
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
      p.purse -= 3
      changeOccupation(n, '织作')
      remember(s, n, 'aid', 0.1)
      return n.name + '用你出的三钱置线，接下第一匹布。'
    case 'trial':
      p.practice++
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
      p.purse -= 5
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
    case 'waitPlan':
      remember(s, n, 'delay', -0.02)
      return n.name + '收回自己的钱，打算先攒着。'
    default:
      throw Error('Unsupported negotiation ' + id)
  }
}
export function fulfill(s: Game) {
  const p = s.promise
  if (!p || s.year < p.due) return
  s.promise = null
  const n = residents(s).find((n) => n.id === p.id && n.alive && n.house === 'birth'),
    book = player(s).residence === 'birth' ? undefined : s.households.birth
  if (!n || !book || player(s).dead || !book.debt) return
  const amount = payHouseDebt(player(s), book, 6)
  remember(s, n, amount ? 'aid' : 'brokenPromise', amount ? 0.12 : -0.09)
  const entry = {
    age: player(s).age,
    year: s.year,
    cause: 'letterHome',
    actors: [playerId(s), n.id],
    text: amount
      ? '照去年的约定，你给' + n.name + '捎回' + amount + '钱抵旧账。'
      : '这一年仍无余钱，你只得写信给' + n.name + '说明失约。',
  }
  s.chronicle.push(entry)
  s.ledger.push(entry)
}
