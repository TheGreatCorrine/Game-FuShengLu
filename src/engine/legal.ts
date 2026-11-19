import { account } from './accounts.ts'
import type { State, Kin } from './types.ts'
import { rules } from '../data.ts'
import { random } from './rng.ts'

export type Loan = {
  id: string
  debtor: string
  creditor: 'local-lender'
  original: number
  balance: number
  year: number
  due: number
  writtenOff: number
}
export type Settlement = {
  owner: string
  rule: string
  assets: number
  liabilities: number
  paid: number
  writtenOff: number
  shares: { id: string; gross: number; charge: number; net: number }[]
}
export type LegalRuleset = {
  id: string
  reserve: number
  loanSize: number
  term: number
  needsAssent: (sex: string, dependent: boolean, lender: number) => boolean
  eligible: (s: State, owner: string) => string[]
  recover: (assets: number, debt: number) => number
  divide: (amount: number, heirs: string[]) => number[]
}
export const outstanding = (s: State, id: string) =>
  s.loans.filter((l) => l.debtor === id).reduce((a, l) => a + l.balance, 0)
export function authority(s: State, house: string) {
  const capable = (n: Kin) =>
    n.alive && n.house === house && n.age >= 15 && n.health >= 35 && !n.acute
  const adults = s.npcs.filter(capable)
  if (house.startsWith('kin')) {
    const head = [s.heads[house], house + 'elder0', house + 'elder1'].find(
      (id) => adults.some((n) => n.id === id),
    )
    if (head) return head
  }
  if (house === 'birth') {
    const parent = ['father', 'mother']
      .map((id) => adults.find((n) => n.id === id))
      .find(Boolean)
    if (parent) return parent.id
  }
  if (
    house === s.residence &&
    !s.dead &&
    s.age >= 16 &&
    s.health >= 35 &&
    !s.acute
  )
    return 'player'
  // Named successors by household role, independent of age ranking.
  const successors =
    house === 'birth'
      ? ['sibling', 'sibPartner']
      : house === 'sibling'
        ? ['sibling', 'sibPartner']
        : [house + 'elder0', house + 'elder1', s.spouse]
  return (
    successors.find((id) => adults.some((n) => n.id === id)) ??
    adults.find((n) => n.role === '孩子' || n.role === '手足的孩子')?.id ??
    null
  )
}
export function spendable(s: State) {
  return Math.max(
    0,
    s.purse - Math.min(rules.legalRules.reserve, outstanding(s, 'player')),
  )
}
export function credit(s: State, person = 'player') {
  const n = s.npcs.find((k) => k.id === person),
    house = n?.house ?? s.residence,
    age = n?.age ?? s.age
  const book = account(s, house)
  const head = authority(s, house),
    sponsor = s.npcs.find((k) => k.id === head)
  const backing =
    !!sponsor && sponsor.trust + sponsor.generosity > 1 && book.assets > 0
  const security =
    (person === 'player' ? s.purse : (n?.money ?? 0)) +
    (head === person ? book.assets * 4 : 0)
  if (age < 15 || s.dead || (n && !n.alive)) return '借主眼下不能亲自立约。'
  if (outstanding(s, person) >= rules.legalRules.loanSize)
    return '旧借未清，出借人不愿再垫。'
  if (security < 3 && !backing) return '手中没有足够私蓄，也无人愿意作保。'
  const disposition = random(s.seed, 'lender' + house)
  if (
    rules.legalRules.needsAssent(
      n?.sex ?? s.sex,
      head !== person && security < 6,
      disposition,
    ) &&
    !backing
  )
    return '这位出借人要掌家人作保，眼下无人应下。'
  if (book.debt > 12 && security < 9 && disposition < 0.5)
    return '出借人见家计吃紧，婉拒了。'
  return ''
}
export function borrow(
  s: State,
  id: string,
  amount = rules.legalRules.loanSize,
) {
  if (
    !Number.isSafeInteger(amount) ||
    amount <= 0 ||
    amount > rules.legalRules.loanSize ||
    credit(s, id)
  )
    return false
  const person = s.npcs.find((n) => n.id === id)
  if (id !== 'player' && !person) return false
  s.loans.push({
    id: 'loan' + s.loans.length,
    debtor: id,
    creditor: 'local-lender',
    original: amount,
    balance: amount,
    year: s.year,
    due: s.year + rules.legalRules.term,
    writtenOff: 0,
  })
  if (person) person.money += amount
  else s.purse += amount
  return true
}
export function repay(s: State, id: string, available: number) {
  if (!Number.isSafeInteger(available) || available < 0)
    throw Error('Invalid payment')
  let left = available
  for (const l of s.loans.filter((l) => l.debtor === id)) {
    const paid = Math.min(l.balance, left)
    l.balance -= paid
    left -= paid
  }
  return available - left
}
export function settle(
  s: State,
  id: string,
  rule: LegalRuleset = rules.legalRules,
) {
  if (s.settlements.some((e) => e.owner === id)) return
  const n = s.npcs.find((k) => k.id === id)
  if (id === 'player' ? !s.dead : !n || n.alive) return
  const assets = n ? n.money : s.purse,
    liabilities = outstanding(s, id),
    paid = repay(s, id, rule.recover(assets, liabilities))
  for (const l of s.loans.filter((l) => l.debtor === id)) {
    l.writtenOff += l.balance
    l.balance = 0
  }
  const ids = rule.eligible(s, id).sort()
  const gross = rule.divide(assets, ids),
    charges = rule.divide(paid, ids)
  const shares = ids.map((heir, i) => ({
    id: heir,
    gross: gross[i],
    charge: charges[i],
    net: gross[i] - charges[i],
  }))
  if (n) n.money = 0
  else s.purse = 0
  for (const share of shares) {
    if (share.id === 'player') s.purse += share.net
    else s.npcs.find((k) => k.id === share.id)!.money += share.net
  }
  if (!shares.length) {
    const house = n?.house ?? s.residence
    account(s, house).cash += assets - paid
  }
  s.settlements.push({
    owner: id,
    rule: rule.id,
    assets,
    liabilities,
    paid,
    writtenOff: liabilities - paid,
    shares,
  })
  if (assets || liabilities)
    s.chronicle.push({
      age: s.age,
      text:
        (n?.name ?? s.name) +
        '的私财已清点。先偿契债' +
        paid +
        '钱，余下' +
        (assets - paid) +
        '钱' +
        (ids.length ? '由' + ids.length + '名子女分取。' : '归入家用。'),
    })
}
