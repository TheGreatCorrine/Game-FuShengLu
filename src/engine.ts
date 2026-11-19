import { account, withAccountViews } from './engine/accounts.ts'
import {
  participant,
  allowed,
  negotiate,
  candidate,
  fulfill,
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
import { history, homes, regions, rules, scenes } from './data.ts'
import type { Action } from './data.ts'
import { random, weighted } from './engine/rng.ts'
import type { State, Kin } from './engine/types.ts'
import { annualHealth, configure } from './engine/mortality.ts'
import type { Mortality } from './engine/mortality.ts'
import { livelihood } from './engine/livelihood.ts'
import {
  kin,
  joinFamily,
  resolveKinHealth,
  developFamily,
  remember,
  helpChance,
} from './engine/family.ts'
import { household, environment } from './engine/economy.ts'
export { yearImpact } from './engine/economy.ts'
export { random }
export type { State, Kin }
export function generate(
  seed: string,
  overrides: Partial<Mortality> = {},
): State {
  const r = (k: string) => random(seed, k)
  const region = Math.floor(r('region') * regions.length),
    home = weighted(rules.weights[region], r('home')),
    birth = 1 - rules.birthBCE[Math.floor(r('birth') * 4)]
  const s = withAccountViews({
    loans: [],
    settlements: [],
    nextCollection: 0,
    seed,
    mortality: configure(overrides),
    vulnerability: r('vulnerability'),
    acute: '',
    risk: 0,
    practice: 0,
    households: { birth: { cash: homes[home].coins + Math.floor(r('cash') * 20), assets: home === 1 ? 0 : home === 0 ? 2 : 1, debt: 0 } },
    residence: 'birth',
    closedHouses: {},
    candidate: null,
    promise: null,
    careYear: null,
    heads: { birth: 'father' },
    spouse: null,
    unions: 0,
    marriage: 'never',
    lastBirth: null,
    wedding: { state: 'eligible', attempts: 0, next: 0 },
    env: { trade: 1, price: 1, harvest: 1, disease: 0.12 },
    birth,
    year: birth,
    age: 0,
    region,
    home,
    surname: ['陈', '李', '张', '王', '郑', '田'][Math.floor(r('surname') * 6)],
    name: '',
    sex: r('sex') < 0.5 ? '女' : '男',
    health: 80 + Math.floor(r('health') * 20),
    talent: r('ability'),
    skill: 0,
    purse: 0,
    income: 0,
    expenses: 0,
    work: '幼年',
    dead: false,
    npcs: [],
    news: [],
    chronicle: [],
    ledger: [],
    seen: [],
    pending: '',
    training: '',
    queue: [],
    exposure: [],
  })
  const sibling = 1 + Math.floor(r('sib') * 7)
  s.npcs = [
    kin(s, '父亲', 25 + sibling + Math.floor(r('father') * 12), 'father'),
    kin(s, '母亲', 20 + sibling + Math.floor(r('mother') * 10), 'mother'),
    kin(s, '手足', sibling, 'sibling'),
  ]
  return s
}
export function confirmName(s: State, name: string) {
  if (s.name || !name.trim() || Array.from(name.trim()).length > 8)
    throw Error('名须为一至八字，落定后不可更改。')
  return withAccountViews({ ...structuredClone(s), name: name.trim() })
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
export function eligible(s: State) {
  return scenes
    .filter(
      (e) =>
        (e.id !== 'studyConflict' ||
          (s.training === '习读' &&
            account(s).debt > 0 &&
            participant(s, 'turn')?.goal === '积谷' &&
            ['father', 'mother'].includes(participant(s, 'turn')!.id))) &&
        (e.id !== 'medicine' || !!participant(s, 'medicine')) &&
        (e.id !== 'personalLoan' || s.purse < 16 || account(s).debt > 0) &&
        (e.id !== 'collect' ||
          (s.age >= s.nextCollection &&
            s.loans.some(
              (l) => l.debtor === 'player' && l.balance > 0 && l.due <= s.year,
            ))) &&
        (e.id !== 'demand' ||
          (s.residence !== 'birth' && (s.households.birth?.debt ?? 0) > 0)) &&
        s.name &&
        !s.dead &&
        s.age >= e.min &&
        s.age <= e.max &&
        (!s.seen.includes(e.id) || e.id === 'wedding' || e.id === 'collect') &&
        (e.id !== 'relief' ||
          (account(s).debt >= 8 &&
            living(s).some(
              (n) => n.house === s.residence && n.age >= 16 && n.money > 0,
            ))) &&
        (e.id !== 'letterHome' ||
          (s.residence !== 'birth' &&
            (s.households.birth?.debt ?? 0) >= 8 &&
            s.purse >= 1 &&
            living(s).some((n) => n.house === 'birth'))) &&
        (e.id !== 'wedding' || s.age >= s.wedding.next) &&
        (!e.gate ||
          {
            books: homes[s.home].books > 0,
            kin: living(s).some((n) => n.house === s.residence),
            trained: s.training === '学成',
            single:
              s.age >= rules.marriageAge &&
              !s.spouse &&
              (s.marriage === 'widowed'
                ? s.age <= rules.family.widowAgeLimit
                : s.age <= 34),
            trade: s.home === 2,
          }[e.gate]),
    )
    .map((e) => ({
      ...e,
      choices: e.choices.filter(([, a]) => allowed(s, e.id, a)),
    }))
    .filter((e) => e.choices.length > 0)
}
function record(s: State, text: string, cause?: string) {
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
export function advance(input: State): State {
  if (!input.name || input.dead || input.pending) return input
  const s = withAccountViews(structuredClone(input))
  s.age++
  s.year++
  environment(s)
  const health = annualHealth(
    s.age,
    s.health,
    s.vulnerability,
    s.env.disease,
    account(s).debt > 0,
    (k) => random(s.seed, 'player' + k + s.year),
    s.mortality,
  )
  Object.assign(s, health)
  resolveKinHealth(s)
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
      s.candidate = null
      s.wedding.attempts++
      record(s, n.name + '的故讯传来，先前的婚议就此作罢。')
    }
  }
  mature(s)
  if (s.age >= 15 && s.training !== '习读' && !s.acute) s.practice++
  const job = livelihood(s)
  if (job !== s.work) {
    s.work = job
    record(s, '开始' + job + '。', job === '佐理文书' ? 'turn' : undefined)
  }
  if (s.wedding.state === 'deferred' && s.age >= s.wedding.next)
    s.wedding.state = 'eligible'
  const pool = eligible(s),
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
      const amount = Math.min(6, s.purse, s.households.birth.debt)
      s.purse -= amount
      s.households.birth.debt -= amount
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
        const amount = Math.min(12, s.purse, s.households.birth.debt)
        s.purse -= amount
        s.households.birth.debt -= amount
        remember(s, n, 'aid', 0.12)
        result = n.name + ' 收下了送到旧家的钱，用来还债。'
      } else if (action === 'petition') {
        const accepted = r < helpChance(s, n)
        if (accepted) {
          const amount = Math.min(10, n.money, account(s).debt)
          n.money -= amount
          account(s).debt -= amount
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
        s.work = '代人理账'
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
