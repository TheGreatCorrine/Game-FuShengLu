import { account } from './accounts.ts'
export { account } from './accounts.ts'
import { authority } from './legal.ts'
import type { State } from './types.ts'
import { random } from './rng.ts'
import { history } from '../data.ts'
import { yields } from './livelihood.ts'
export function yearImpact(s: State) {
  return history
    .filter((e) => s.year >= 1 - e.from && s.year <= 1 - e.to)
    .map((e) => {
      const load = e.load[s.region],
        heard = load > 0 && s.age >= 7
      return {
        id: e.id,
        load,
        heard,
        cost: 0,
        message: !heard
          ? ''
          : s.home === 3
            ? '家人带回征运的消息，说县里在催办。'
            : s.home === 2
              ? e.market
              : '集上粟价又涨，买回的粮比去年少。',
      }
    })
}
export function environment(s: State) {
  const impacts = yearImpact(s),
    load = impacts.reduce((v, e) => v + e.load, 0)
  const harvest = 0.7 + 0.6 * random(s.seed, 'harvest' + s.year)
  s.env = {
    trade: 1 - load * 0.11,
    price: 1 + load * 0.09,
    disease: 0.12 + (1 - harvest) * 0.2 + load * 0.08,
    harvest,
  }
}
// Empty households retain unresolved common property under its original owner.
export function inactiveHouse(s: State, id: string) {
  const book = s.households[id]
  if (
    !book ||
    id === s.residence ||
    s.npcs.some((n) => n.alive && n.house === id)
  )
    return
  s.heads[id] = null
  const paid = Math.min(book.cash, book.debt)
  book.cash -= paid
  book.debt -= paid
  if (book.cash || book.assets || book.debt) return
  s.closedHouses[id] = s.year
  delete s.households[id]
  delete s.heads[id]
  s.chronicle.push({
    age: s.age,
    year: s.year,
    text:
      (id === 'birth' ? '旧家' : '亲属之家') +
      '已无人同住，家中财物与欠账已清，遂收起旧账。',
  })
}
export function household(s: State) {
  for (const id of new Set([s.residence, ...Object.keys(s.households)])) {
    const book = account(s, id),
      active = id === s.residence
    const residents = s.npcs.filter((n) => n.alive && n.house === id)
    if (!active && !residents.length) {
      inactiveHouse(s, id)
      continue
    }
    const workers = residents.filter(
      (n) =>
        n.age >= 15 &&
        n.age < 65 &&
        n.health >= 35 &&
        !n.acute &&
        n.work !== '家中休养' &&
        n.work !== '未就业',
    )
    s.heads[id] = authority(s, id)
    const consumption = 6 * (Number(active && !s.dead) + residents.length)
    const marketCost = Math.round(consumption * (s.env.price - 1))
    if (active)
      for (const { message, ...h } of yearImpact(s)) {
        s.exposure.push({ ...h, cost: h.load ? marketCost : 0 })
        if (message) s.news.push({ age: s.age, text: message })
      }
    const harvest = s.env.harvest
    const production = workers.reduce(
      (v, n) =>
        v +
        (n.work === '贩运'
          ? 10 * s.env.trade
          : n.work === '织作'
            ? 10
            : n.work === '文书'
              ? 10
              : 8 * harvest),
      0,
    )
    const own =
      Number(active && s.age >= 15 && !s.dead && !s.acute && s.health >= 35) *
      (yields[s.work] || 0) *
      (s.careYear === s.year ? 0.5 : 1) *
      (s.work.includes('商') || s.work === '经营货担' ? s.env.trade : 1)
    const income = Math.round(production + own + book.assets * 1.5 * harvest)
    const expenses =
      consumption +
      marketCost +
      Math.ceil(book.assets / 2) +
      (active && s.acute ? 4 : 0) +
      residents.filter((n) => n.acute).length * 2 +
      Number(active && s.training === '习读') * 3
    const wage = Math.floor(own / 4)
    s.purse += wage
    if (active) {
      s.income = income
      s.expenses = expenses
    }
    let net = book.cash + income - wage - expenses - book.debt
    if (net < -15 && book.assets) {
      book.assets--
      net += 15
    }
    if (net > 95 && book.assets < 5) {
      book.assets++
      net -= 30
    }
    book.debt = Math.max(0, -net)
    book.cash = Math.max(0, net)
  }
}
