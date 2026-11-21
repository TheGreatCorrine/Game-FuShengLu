import { player, residents, type Game } from './domain.ts'
import { account } from './accounts.ts'
export { account } from './accounts.ts'
import { authority } from './legal.ts'
import type { State } from './types.ts'
import { random } from './rng.ts'
import { yearImpact } from '../content/western-han/exposure.ts'
export { yearImpact }
import { yields } from './livelihood.ts'
export function environment(s: State) {
  s.env = environmentFor(s, s)
}
export function environmentFor(s: Pick<State,'year'|'region'|'seed'>, p: Pick<State,'age'|'home'>) {
  const impacts = yearImpact({year:s.year,region:s.region,age:p.age,home:p.home}),
    load = impacts.reduce((v, e) => v + e.load, 0)
  const harvest = 0.7 + 0.6 * random(s.seed, 'harvest' + s.year)
  return {
    trade: 1 - load * 0.11,
    price: 1 + load * 0.09,
    disease: 0.12 + (1 - harvest) * 0.2 + load * 0.08,
    harvest,
  }
}
// Empty households retain unresolved common property under its original owner.
export function inactiveHouse(s: Game, id: string) {
  const p = player(s)
  const book = s.households[id]
  if (
    !book ||
    id === p.residence ||
    residents(s).some((n) => n.alive && n.house === id)
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
    age: p.age,
    year: s.year,
    text:
      (id === 'birth' ? '旧家' : '亲属之家') +
      '已无人同住，家中财物与欠账已清，遂收起旧账。',
  })
}
export function household(s: Game) {
  const p = player(s)
  for (const id of new Set([p.residence, ...Object.keys(s.households)])) {
    const book = account(s, id),
      active = id === p.residence
    const members = residents(s).filter((n) => n.alive && n.house === id)
    if (!active && !members.length) {
      inactiveHouse(s, id)
      continue
    }
    const workers = members.filter(
      (n) =>
        n.age >= 15 &&
        n.age < 65 &&
        n.health >= 35 &&
        !n.acute &&
        n.work !== '家中休养' &&
        n.work !== '未就业',
    )
    s.heads[id] = authority(s, id)
    const consumption = 6 * (Number(active && !p.dead) + members.length)
    const marketCost = Math.round(consumption * (s.env.price - 1))
    if (active)
      for (const { message, ...h } of yearImpact({year:s.year,region:s.region,age:p.age,home:p.home})) {
        s.exposure.push({ ...h, cost: h.load ? marketCost : 0 })
        if (message) s.news.push({ age: p.age, text: message })
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
      Number(active && p.age >= 15 && !p.dead && !p.acute && p.health >= 35) *
      (yields[p.work] || 0) *
      (s.careYear === s.year ? 0.5 : 1) *
      (p.work.includes('商') || p.work === '经营货担' ? s.env.trade : 1)
    const income = Math.round(production + own + book.assets * 1.5 * harvest)
    const expenses =
      consumption +
      marketCost +
      Math.ceil(book.assets / 2) +
      (active && p.acute ? 4 : 0) +
      members.filter((n) => n.acute).length * 2 +
      Number(active && p.training === '习读') * 3
    const wage = Math.floor(own / 4)
    p.purse += wage
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
