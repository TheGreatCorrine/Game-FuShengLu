import { generate as birth } from './engine/birth.ts'
import { legacyPeopleView } from './engine/people.ts'
import { eligible } from './content/western-han/events.ts'
export { eligible }
import { scheduleYear, record } from './engine/scheduler.ts'
import { changeOccupation, confirmedName, payHouseDebt } from './engine/operations.ts'
import { account, withAccountViews } from './engine/accounts.ts'
import {
  participant,
  negotiate,
  candidate,
  narrative,
} from './engine/encounters.ts'
export { participant, narrative }
export { migrateHouseholds } from './engine/accounts.ts'
import {
  authority,
  borrow,
  credit,
  outstanding,
  repay,
  spendable,
} from './engine/legal.ts'
import { homes, regions, rules } from './data.ts'
import type { Action } from './data.ts'
import { random, weighted } from './engine/rng.ts'
import type { State, Kin } from './engine/types.ts'
import { configure } from './engine/mortality.ts'
import type { Mortality } from './engine/mortality.ts'
import {
  kin,
  joinFamily,
  ageResidents,
  remember,
  helpChance,
} from './engine/family.ts'
export { yearImpact } from './engine/economy.ts'
export { random }
export type { State, Kin }
export function generate(...args: Parameters<typeof birth>) {
  const projected = legacyPeopleView(birth(...args))
  const {playerParentKeys, ...flat} = structuredClone(projected)
  return withAccountViews(flat)
}
export function confirmName(s: State, name: string) {
  return withAccountViews({ ...structuredClone(s), name: confirmedName(s.name, name) })
}
export const date = (year: number) =>
  year <= 0 ? '前' + (1 - year) + '年' : '公元' + year + '年'
const living = (s: State) => s.npcs.filter((n) => n.alive)
export function support(s: State, n: Kin) {
  if (!n.alive) return 0
  return Math.max(
    0.05,
    Math.min(
      0.95,
      0.1 +
        0.12 * n.generosity +
        0.1 * s.talent +
        0.06 * (n.history.some((m) => m.id === 'aid') ? 1 : 0) -
        0.05 * n.conflict +
        0.1 * n.generosity +
        0.15 * n.trust +
        0.15 * Number(n.goal === '授业') +
        0.15 * Number(account(s).cash > 35) +
        0.09 * homes[s.home].books -
        0.15 * Number(account(s).debt > 0) -
        0.08 * Number(s.sex === '女' && homes[s.home].books === 0),
    ),
  )
}
export function advance(input: State, onCandidateDeath?: (person: Kin) => void): State {
  if (!input.name || input.dead || input.pending) return input
  const draft = withAccountViews(structuredClone(input))
  return scheduleYear(draft, draft, 'player', () => ageResidents(draft, draft.npcs, id => id),
    () => draft, eligible, onCandidateDeath)
}
export function decide(input: State, action: Action): State {
  const event = eligible(input).find((e) => e.id === input.pending)
  const choice = event?.choices.find((c) => c[1] === action)
  if (!event || !choice) throw Error('此项选择当前不可用')
  const s = withAccountViews(structuredClone(input)),
    cause = event.id,
    adult = living(s).find((n) => n.id === authority(s, s.residence)),
    r = random(
      s.seed,
      cause + 'result' + (cause === 'wedding' ? s.wedding.attempts : ''),
    )
  let result = ''
  let actors: string[] = []
  if (cause === 'wedding') s.candidate = candidate(s)
  const involved = participant(s, cause)
  switch (action) {
    case 'trialSkill':
      s.practice++
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
    case 'meet':
    case 'waitPlan':
      if (!involved) throw Error('缺少参与者')
      actors = [involved.id]
      result = negotiate(s, involved, cause, action, r)
      break
    case 'pass':
      if (cause === 'medicine' && involved) {
        remember(s, involved, 'rest', 0.02)
        actors = [involved.id]
      }
      result =
        cause === 'medicine'
          ? involved!.name + '依自己的意思在家静养。'
          : cause === 'wedding'
            ? '两家约好以后再回话。'
            : cause === 'demand'
              ? '你指给他看旧户的名字，他收起了账。'
              : '你收起荷包。'
      break
    case 'gift': {
      const amount = payHouseDebt(s, s.households.birth, 6)
      result = '你替旧户还了' + amount + '钱。'
      break
    }
    case 'takeLoan': {
      const reason = credit(s)
      const ok = borrow(s, 'player')
      result = ok ? '立下借契，八钱放进自己的荷包。' : reason
      break
    }
    case 'buyTool':
      if (spendable(s) >= 6) {
        s.purse -= 6
        s.practice += 2
        result = '工具拿到手，往后练活更顺手。'
      } else
        result = outstanding(s, 'player')
          ? '留下应还的钱后，余钱还不够。'
          : '私钱不足，先用旧器。'
      break
    case 'payLoan': {
      const amount = repay(s, 'player', s.purse)
      s.purse -= amount
      s.nextCollection = s.age + 2
      result = '付了' + amount + '钱，账上照数勾去。'
      break
    }
    case 'extend': {
      const ok = random(s.seed, 'extension' + s.year) < 0.55
      s.nextCollection = s.age + (ok ? 4 : 2)
      if (ok)
        for (const loan of s.loans.filter(
          (l) => l.debtor === 'player' && l.balance && l.due <= s.year,
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
        payHouseDebt(s, s.households.birth, 12)
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
    case 'learn': {
      const ok =
        (account(s).cash >= 5 ||
          (!!adult && account(s).cash + adult.money >= 5 && adult.generosity > 0.7)) &&
        r < (adult ? support(s, adult) : 0.15)
      if (adult) {
        remember(s, adult, ok ? 'study' : 'dispute', ok ? 0.06 : -0.09)
        adult.memories.push(ok ? '应允识字' : '未应允识字')
        adult.closeness = Math.min(1, adult.closeness + 0.02)
      }
      if (ok) {
        const fromHouse = Math.min(5, account(s).cash)
        account(s).cash -= fromHouse
        if (adult) adult.money -= 5 - fromHouse
        s.skill++
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
      if (cause === 'turn') {
        s.training = ok ? '习读' : '未入学'
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
        s.purse += pay
        result = pay ? '做完了活，荷包添了三钱。' : '忙了一日，未能挣得工钱。'
      }
      if (cause === 'studyConflict') {
        s.training = '中辍'
        s.queue = s.queue.filter((q) => q.cause !== 'turn')
        remember(s, involved!, 'work', 0.08)
        actors = [involved!.id]
      }
      if (cause === 'turn') {
        s.training = '留家'
        s.practice += 2
      }
      break
    }
    case 'bond': {
      const n = involved!
      n.closeness = Math.min(1, n.closeness + 0.1)
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
      const ok = r < 0.45 + 0.07 * s.skill + 0.15 * s.talent
      if (ok) {
        changeOccupation(s, '代人理账')
        record(s, '当年习字取得了接账的资格。', 'turn')
      }
      result = ok ? '核账无误，往后来此谋生。' : '账目未合，仍操旧业。'
      break
    }
    case 'marry': {
      const partner = s.candidate!
      const ok =
        account(s).cash >= 6 &&
        r <
          0.45 +
            0.15 * partner.generosity +
            0.09 * Number(partner.history.some((m) => m.id === 'meeting')) +
            0.08 * Number(s.skill >= 3) +
            0.12 * Number(account(s).debt === 0)
      if (ok) {
        account(s).cash -= 6
        joinFamily(s, partner)
        s.candidate = null
      }
      result =
        partner.name +
        (ok
          ? '应下婚事，两人从此同过。'
          : partner.goal === '积谷'
            ? '想再攒些过冬的钱，婚事先缓一缓。'
            : '想再见一面，将日后的打算说清。')
      break
    }
  }
  if (cause === 'wedding') {
    s.wedding.attempts++
    s.wedding.state = Boolean(s.spouse) ? 'resolved' : 'deferred'
    s.wedding.next = s.age + 3
  }
  record(s, choice[0] + '。' + result, cause)
  s.pending = ''
  Object.assign(s.ledger.at(-1)!, {
    decision: cause + ':' + s.age + ':' + action,
    actors: [
      'player',
      ...actors,
      ...(action === 'learn' && adult ? [adult.id] : []),
      ...(action === 'marry' && s.wedding.state === 'resolved'
        ? [s.spouse!]
        : []),
    ],
    changes: {
      cash: account(s).cash - account(input).cash,
      skill: s.skill - input.skill,
      purse: s.purse - input.purse,
      practice: s.practice - input.practice,
    },
    fact: s.training || s.work,
  })
  if (
    !s.seen.includes(cause) &&
    (cause !== 'wedding' || s.wedding.state === 'resolved')
  )
    s.seen.push(cause)
  return s
}
export function skip(s: State) {
  while (s.name && !s.dead && !s.pending) s = advance(s)
  return s
}
