import { player, playerId, keyFor, residents, type Game } from './domain.ts'
import { account } from './accounts.ts'
import { authority } from '../content/western-han/authority.ts'
export { authority }
import type { State } from './types.ts'
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
  eligible: (s: Game, owner: string) => string[]
  recover: (assets: number, debt: number) => number
  divide: (amount: number, heirs: string[]) => number[]
}
export const outstanding = (s: Game, id: string) =>
  s.loans.filter((l) => l.debtor === id).reduce((a, l) => a + l.balance, 0)
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
export function repay(s: Game, id: string, available: number) {
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
  s: Game,
  id: string,
  rule: LegalRuleset = rules.legalRules,
) {
  if (s.settlements.some((e) => e.owner === id)) return
  const p = player(s), pid = playerId(s)
  const n = residents(s).find((k) => k.id === id)
  if (id === pid ? !p.dead : !n || n.alive) return
  const assets = n ? n.money : p.purse
  const liabilities = outstanding(s, id)
  const paid = rule.recover(assets, liabilities)
  const validAmount = (v: number) => Number.isSafeInteger(v) && v >= 0
  if (![assets, liabilities, paid].every(validAmount) || paid > Math.min(assets, liabilities))
    throw Error('Invalid estate recovery: ' + id)

  // Eligibility belongs to the dynasty. Identity, conservation and ordering
  // are engine contracts and are checked before applying any payment.
  const ids = rule.eligible(s, id).sort((a,b) => {
    const x = keyFor(s,a), y = keyFor(s,b)
    return x < y ? -1 : x > y ? 1 : 0
  })
  const heirs = ids.map(heir => heir === pid ? p : residents(s).find(k => k.id === heir))
  if (new Set(ids).size !== ids.length || heirs.some(heir => !heir || ('dead' in heir ? heir.dead : !heir.alive)))
    throw Error('Invalid estate recipients: ' + id)
  const book = ids.length ? null : account(s, n?.house ?? p.residence)
  const gross = rule.divide(assets, ids), charges = rule.divide(paid, ids)
  if (gross.length !== ids.length || charges.length !== ids.length ||
      (ids.length && (gross.reduce((a,b)=>a+b,0) !== assets || charges.reduce((a,b)=>a+b,0) !== paid)))
    throw Error('Invalid estate division: ' + id)
  const shares = ids.map((heir, i) => {
    if (!validAmount(gross[i]) || !validAmount(charges[i]) || charges[i] > gross[i])
      throw Error('Invalid estate share: ' + heir)
    return {id: heir, gross: gross[i], charge: charges[i], net: gross[i] - charges[i]}
  })
  repay(s, id, paid)
  for (const l of s.loans.filter(l => l.debtor === id)) {
    l.writtenOff += l.balance
    l.balance = 0
  }
  if (n) n.money = 0
  else p.purse = 0
  for (const [i, share] of shares.entries()) {
    const heir = heirs[i]!
    if ('purse' in heir) heir.purse += share.net
    else heir.money += share.net
  }
  if (book) book.cash += assets - paid
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
      age: p.age,
      text:
        (n?.name ?? p.name) +
        '的私财已清点。先偿契债' +
        paid +
        '钱，余下' +
        (assets - paid) +
        '钱' +
        (ids.length ? '由' + ids.length + '名子女分取。' : '归入家用。'),
    })
}
