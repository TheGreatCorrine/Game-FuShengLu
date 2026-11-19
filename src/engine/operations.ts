import type { Estate, State, Kin } from './types.ts'

export function confirmedName(current: string, input: string) {
  const name = input.trim()
  if (current || !name || Array.from(name).length > 8)
    throw Error('名须为一至八字，落定后不可更改。')
  return name
}

export function changeOccupation(worker: Pick<State,'work'|'dead'> | Pick<Kin,'work'|'alive'>, work: string) {
  if (!work.trim() || ('dead' in worker ? worker.dead : !worker.alive))
    throw Error('Invalid occupation transition')
  worker.work = work
}

// A personal payment discharges common debt. Neither household cash nor
// the person's contractual loan balance participates in this transaction.
export function payHouseDebt(payer: Pick<State,'purse'> | Pick<Kin,'money'>, book: Estate, limit: number) {
  const balance = 'purse' in payer ? payer.purse : payer.money
  if (![balance, book.debt, limit].every(n => Number.isSafeInteger(n) && n >= 0))
    throw Error('Invalid household debt payment')
  const paid = Math.min(limit, balance, book.debt)
  if ('purse' in payer) payer.purse -= paid
  else payer.money -= paid
  book.debt -= paid
  return paid
}

// A transfer between two owners conserves cash, including personal savings.
export function transferSavings(book: Estate, recipient: Pick<Kin,'alive'|'money'>, amount: number) {
  if (!recipient.alive || ![book.cash, recipient.money, amount].every(n => Number.isSafeInteger(n) && n >= 0)
    || amount > book.cash || !Number.isSafeInteger(recipient.money + amount))
    throw Error('Invalid savings transfer')
  book.cash -= amount
  recipient.money += amount
}
