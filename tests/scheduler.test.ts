import { expect, it } from 'vitest'
import * as life from '../src/engine/life.ts'
import * as flat from '../src/engine.ts'
import { payHouseDebt, transferSavings, changeOccupation } from '../src/engine/operations.ts'
import { settle } from '../src/engine/legal.ts'
import { rules } from '../src/data.ts'

it('uses historical mortality keys even when stable resident numbers change', () => {
  const s = life.confirmName(life.generate('scheduler'), '宁')
  const [id] = s.residentOrder
  const renamed = structuredClone(s)
  const nextId = 'p' + renamed.nextPerson++
  for (const table of [renamed.people, renamed.legacyKeys, renamed.parentIds, renamed.towardPlayer]) {
    Object.assign(table, { [nextId]: table[id] })
    delete table[id]
  }
  renamed.people[nextId].id = nextId
  renamed.residentOrder[0] = nextId
  renamed.heads.birth = nextId
  for (const parents of Object.values(renamed.parentIds))
    for (let i=0;i<parents.length;i++) if (parents[i]===id) parents[i]=nextId
  const before = structuredClone(renamed)
  expect(life.legacyPeopleView(life.advance(renamed))).toEqual(life.legacyPeopleView(life.advance(s)))
  expect(renamed).toEqual(before)
})

it('rejects invalid transfers before writing and separates debt service from savings', () => {
  const book = { cash:5, debt:3, assets:1 }, person = {money:2, alive:true}
  expect(() => transferSavings(book,person,6)).toThrow()
  expect(() => payHouseDebt(person,book,-1)).toThrow()
  expect([book.cash,book.debt,person.money]).toEqual([5,3,2])
  transferSavings(book,person,4)
  expect(payHouseDebt(person,book,5)).toBe(3)
  expect([book.cash,book.debt,book.assets,person.money]).toEqual([1,0,1,3])
  expect(() => changeOccupation({alive:false,work:'织作'},'文书')).toThrow()
})

it('rejects an invalid legal allocation before clearing property or contracts', () => {
  const s=flat.generate('invalid-heirs')
  const n=s.npcs[0]
  n.alive=false
  n.money=11
  s.loans.push({id:'loan0',debtor:n.id,creditor:'local-lender',original:8,balance:8,year:1,due:4,writtenOff:0})
  const before=structuredClone(s)
  for (const rule of [
    {...rules.legalRules,eligible:()=>['missing']},
    {...rules.legalRules,divide:()=>[0]},
  ]) {
    expect(()=>settle(s,n.id,rule)).toThrow()
    expect(structuredClone(s)).toEqual(before)
  }
})
