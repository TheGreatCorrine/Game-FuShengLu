import { acceptMarriage, agreement, arrangeCare, celebrate, endAgreement, postponeWedding } from './marriage-arrangements.ts'
import { conclude, schedule } from './negotiations.ts'
import { childhoodScene, preparation } from '../content/western-han/childhood.ts'
import { eligible, participant, bindCandidate } from '../content/western-han/events.ts'
import { homes, type Action } from '../data.ts'
import { account } from './accounts.ts'
import { attitude, currentCandidate, partnerOf, player, playerId, residents, type Game, type Person } from './domain.ts'
import { negotiate } from './encounters.ts'
import { remember, helpChance } from './family.ts'
import { authority, borrow, credit, outstanding, repay, spendable } from './legal.ts'
import { changeOccupation, payHouseDebt } from './operations.ts'
import { random } from './rng.ts'
import { record } from './scheduler.ts'

export function support(s: Game, n: Person) {
  const p = player(s), feelings = attitude(s,n)
  if (!n.alive) return 0
  return Math.max(
    0.05,
    Math.min(
      0.95,
      0.1 +
        0.12 * n.generosity +
        0.1 * p.talent +
        0.06 * (feelings.history.some((m) => m.id === 'aid') ? 1 : 0) -
        0.05 * feelings.conflict +
        0.1 * n.generosity +
        0.15 * feelings.trust +
        0.15 * Number(n.goal === '授业') +
        0.15 * Number(account(s).cash > 35) +
        0.09 * homes[p.home].books -
        0.15 * Number(account(s).debt > 0) -
        0.08 * Number(p.sex === '女' && homes[p.home].books === 0),
    ),
  )
}
export function resolveChoice(s: Game, action: Action) {
  const event = eligible(s).find((e) => e.id === s.pending)
  const choice = event?.choices.find((c) => c[1] === action)
  if (!event || !choice) throw Error('此项选择当前不可用')
  const p = player(s), pid = playerId(s)
  const payingHouse = p.residence
  const before = {cash:account(s).cash, skill:p.skill, purse:p.purse, practice:p.practice}
  const
    cause = event.id,
    adult = residents(s).find((n) => n.alive && n.id === authority(s, p.residence)),
    r = random(
      s.seed,
      cause + 'result' + (cause === 'wedding' ? s.wedding.attempts : ''),
    )
  let result = ''
  let fact: string | undefined
  let actors: string[] = []
  if (cause === 'wedding') bindCandidate(s)
  const involved = participant(s, cause)
  switch (action) {
    case 'childFirst':
    case 'childSecond': {
      const [,lesson,text] = childhoodScene(cause)!.outcomes[action === 'childFirst' ? 0 : 1]
      const n = involved!
      actors = [n.id]
      fact = 'childhood/'+lesson
      if (lesson === 'letters') p.skill++
      if (lesson === 'hands') p.practice++
      remember(s,n,cause,lesson === 'company' ? 0.12 : 0.04)
      n.memories.push('曾与你一道经历「'+event.title+'」')
      result = n.name+'与你一道。'+text
      break
    }
    case 'childCraft': {
      const {mentor,entry} = preparation(s,'hands')!
      actors = [mentor.id]
      p.practice += 3
      p.training = '留家'
      remember(s,mentor,'childCraft',0.08)
      result = mentor.name+'提起你'+entry.age+'岁那次「'+childhoodScene(entry.cause!)!.title+'」，这次把整件活交给你，自己只在旁指点。'
      break
    }
    case 'trialSkill':
      p.practice++
      result = '你照着示范动手做了一遍，记下其中的手法。'
      break
    case 'split':
    case 'halfDays':
    case 'apprentice':
    case 'stake':
    case 'trial':
    case 'object':
    case 'medicineFee':
    case 'nurse':
    case 'pledge':
    case 'waitPlan':
      if (!involved) throw Error('缺少参与者')
      actors = [involved.id]
      result = negotiate(s, involved, cause, action, r)
      break
    case 'meet':
    case 'terms':
      actors = [involved!.id]
      if (action === 'meet') remember(s,involved!, 'meeting', 0.08)
      result = schedule(s,involved!,action)
      break
    case 'declineMatch':
      actors = [involved!.id]
      result = agreement(s) ? endAgreement(s,'declined') : conclude(s,involved!, 'declined')
      break
    case 'pass':
      if (cause === 'medicine' && involved) {
        remember(s, involved, 'rest', 0.02)
        actors = [involved.id]
      }
      result =
        cause === 'medicine'
          ? involved!.name + '依自己的意思在家静养。'
          : (cause === 'wedding' || cause === 'weddingReply')
            ? '你托媒人暂缓此事，没有约定再议的日子。'
            : cause === 'demand'
              ? '你指给他看旧户的名字，他收起了账。'
              : '你收起荷包。'
      break
    case 'gift': {
      const amount = payHouseDebt(p, s.households.birth, 6)
      result = '你替旧户还了' + amount + '钱。'
      break
    }
    case 'takeLoan': {
      const reason = credit(s)
      const ok = borrow(s, pid)
      result = ok ? '立下借契，八钱放进自己的荷包。' : reason
      break
    }
    case 'buyTool':
      if (spendable(s) >= 6) {
        p.purse -= 6
        p.practice += 2
        result = '工具拿到手，往后练活更顺手。'
      } else
        result = outstanding(s, pid)
          ? '留下应还的钱后，余钱还不够。'
          : '私钱不足，先用旧器。'
      break
    case 'payLoan': {
      const amount = repay(s, pid, p.purse)
      p.purse -= amount
      s.nextCollection = p.age + 2
      result = '付了' + amount + '钱，账上照数勾去。'
      break
    }
    case 'extend': {
      const ok = random(s.seed, 'extension' + s.year) < 0.55
      s.nextCollection = p.age + (ok ? 4 : 2)
      if (ok)
        for (const loan of s.loans.filter(
          (l) => l.debtor === pid && l.balance && l.due <= s.year,
        ))
          loan.due = s.year + 4
      result = ok
        ? '出借人应下宽限，把日子另记在简上。'
        : '出借人摇头，约了日后再来。'
      break
    }

    case 'decline':
    case 'aid':
    case 'petition': {
      const n = involved!
      actors = [n.id]
      if (action === 'aid') {
        payHouseDebt(p, s.households.birth, 12)
        remember(s, n, 'aid', 0.12)
        result = n.name + ' 收下了送到旧家的钱，用来还债。'
      } else if (action === 'petition') {
        const accepted = r < helpChance(s, n)
        if (accepted) {
          payHouseDebt(n, account(s), 10)
        }
        result =
          n.name +
          (accepted
            ? ' 取出私蓄，先还了一部分欠账。'
            : ' 摇摇头，把钱留作以后的口粮。')
        remember(s, n, 'petition', accepted ? 0.04 : -0.03)
      } else {
        remember(s, n, 'decline', -0.06)
        result = n.name + ' 听过解释，收起了账简。'
      }
      break
    }
    case 'childStudy':
    case 'learn': {
      const link = action === 'childStudy' ? preparation(s,'letters') : undefined
      const ok =
        (account(s).cash >= 5 ||
          (!!adult && account(s).cash + adult.money >= 5 && adult.generosity > 0.7)) &&
        r < Math.min(0.95,(adult ? support(s, adult) : 0.15) + (link ? 0.12 : 0))
      if (adult) {
        remember(s, adult, ok ? 'study' : 'dispute', ok ? 0.06 : -0.09)
        adult.memories.push(ok ? '应允识字' : '未应允识字')
        attitude(s,adult).closeness = Math.min(1, attitude(s,adult).closeness + 0.02)
      }
      if (ok) {
        const fromHouse = Math.min(5, account(s).cash)
        account(s).cash -= fromHouse
        if (adult) adult.money -= 5 - fromHouse
        p.skill++
        result = '匀出五钱，开始习字。'
      } else
        result =
          account(s).cash < 5
            ? '家中连束脩都凑不齐，只好先顾生计。'
            : '家人掂量过眼下的活计，未能应允。'
      if (adult)
        result =
          adult.name +
          (ok
            ? adult.goal === '授业'
              ? '把简推到你面前：“去吧，学会了回来教我。”'
              : '点了钱：“工别落下，我替你应这一次。”'
            : account(s).cash < 5
              ? '摊开空钱袋：“你看看，拿什么付呢？”'
              : adult.generosity > 0.55
                ? '收好简册：“我先替你留着。等家里缓一缓。”'
                : '摇头：“明早缺人。这回先跟我去。”')
      if (link) {
        actors = [...new Set([link.mentor.id,...(adult ? [adult.id] : [])])]
        result = link.mentor.name+'提起你'+link.entry.age+'岁辨认旧字的事。'+result
      }
      if (cause === 'turn') {
        p.training = ok ? '习读' : '未入学'
        if (ok) s.queue.push({ age: 18, cause })
      }
      break
    }
    case 'work': {
      if (cause === 'turn' || cause === 'studyConflict') {
        result = '你回家分担日常劳作。'
      } else if (cause === 'offer') {
        result = '你推辞了核账的差事，继续原来的生计。'
      } else {
        const pay = r < 0.8 ? 3 : 0
        p.purse += pay
        result = pay ? '做完了活，荷包添了三钱。' : '忙了一日，未能挣得工钱。'
      }
      if (cause === 'studyConflict') {
        p.training = '中辍'
        s.queue = s.queue.filter((q) => q.cause !== 'turn')
        remember(s, involved!, 'work', 0.08)
        actors = [involved!.id]
      }
      if (cause === 'turn') {
        p.training = '留家'
        p.practice += 2
      }
      break
    }
    case 'bond': {
      const n = involved!
      attitude(s,n).closeness = Math.min(1, attitude(s,n).closeness + 0.1)
      remember(s, n, 'care', 0.12)
      n.memories.push('曾受照应')
      actors = [n.id]
      result = n.name + ' 记下了你的照应。'
      break
    }
    case 'save': {
      result = '钱仍收在家中，今日没有出门做活。'
      break
    }
    case 'career': {
      const ok = r < 0.45 + 0.07 * p.skill + 0.15 * p.talent
      if (ok) {
        changeOccupation(p, '代人理账')
        record(s, '当年习字取得了接账的资格。', 'turn')
      }
      result = ok ? '核账无误，往后来此谋生。' : '账目未合，仍操旧业。'
      break
    }
    case 'planWedding':
    case 'marry':
      actors=[currentCandidate(s)!.id]
      result=cause==='arrangements' ? celebrate(s,6) : acceptMarriage(s,action==='planWedding')
      break
    case 'plainWedding':
    case 'familyGift':
      actors=[currentCandidate(s)!.id]
      result=celebrate(s,2,action==='familyGift')
      break
    case 'stayCare':
      result=arrangeCare(s)
      break
    case 'waitWedding':
      result=postponeWedding(s)
      break
  }
  if (cause === 'wedding' || cause === 'weddingReply' || cause==='arrangements') {
    if (cause!=='arrangements') s.wedding.attempts++
    s.wedding.state = partnerOf(s,pid) ? 'resolved' : 'deferred'
    s.wedding.next = p.age + 3
  }
  record(s, choice[0] + '。' + result, cause)
  s.pending = agreement(s) && agreement(s)!.next<=s.year ? 'arrangements' : ''
  Object.assign(s.ledger.at(-1)!, {
    decision: cause + ':' + p.age + ':' + action,
    actors: [
      pid,
      ...actors,
      ...(action === 'learn' && adult ? [adult.id] : []),

    ],
    changes: {
      cash: (['wedding','weddingReply','arrangements'].includes(cause) ? s.households[payingHouse].cash : account(s).cash) - before.cash,
      skill: p.skill - before.skill,
      purse: p.purse - before.purse,
      practice: p.practice - before.practice,
    },
    fact: fact ?? (p.training || p.work),
  })
  if (
    !s.seen.includes(cause) &&
    (cause !== 'wedding' || s.wedding.state === 'resolved')
  )
    s.seen.push(cause)
}
