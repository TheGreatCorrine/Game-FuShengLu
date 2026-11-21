import { date, eligible, narrative } from '../engine.ts'
import { history, homes, regions, rules } from '../data.ts'
import type { Action } from '../data.ts'
import { marriageSummary, protagonist } from './people.ts'
import type { Life } from './people.ts'

const publicRows = (rows: Life['news']) => rows.map(({age, text}) => ({age, text}))

function pendingScene(s: Life) {
  if (!s.pending) return null
  const event = eligible(s).find(e => e.id === s.pending)
  if (!event) return null
  return {
    title: event.title,
    body: narrative(s, event.id, event.body),
    choices: event.choices.map(([label, action]): [string, Action] => [label, action]),
  }
}

export function observePlayer(life: Life) {
  const p = protagonist(life)
  const common = {
    dynasty: rules.dynasty, period: rules.birthPeriod, region: regions[life.region], regionIndex: life.region,
    birth: date(p.birth), origin: homes[p.home].name, surname: p.surname, sex: p.sex,
  }
  if (!p.name) return { ...common, phase: 'birth' as const }
  const book = life.households[p.residence]
  const marriage = marriageSummary(life)
  return {
    ...common, phase: 'named' as const, year: date(life.year), age: p.age, name: p.name,
    work: p.work, legal: rules.legal, dead: p.dead,
    condition: p.dead ? '已故' : p.acute || (p.health > 65 ? '康健' : p.health > 30 ? '尚可' : '衰弱'),
    resources: book.debt > 0 ? '家中尚有欠账' : book.cash < life.expenses ? '家中余钱不多' : '家中有些余钱',
    purse: p.purse, cash: book.cash, debt: book.debt,
    personalDebt: life.loans.reduce((v,l) => v + (l.debtor === p.id ? l.balance : 0), 0),
    scene: pendingScene(life),
    news: publicRows(life.news), chronicle: publicRows(life.chronicle),
    residence: p.residence === 'birth' ? '居于出生之家' : p.residence === 'independent' ? '已另立门户' : '与姻亲同住',
    marriage: {never:'未婚',married:'已婚',widowed:'丧偶',remarried:'再婚',ended:'此生婚姻已终'}[marriage],
    relatives: life.residentOrder.map(id => {
      const n = life.people[id]
      if (n.kind !== 'relative') throw Error('Invalid resident: ' + id)
      return {id, sameHouse:n.house === p.residence, role:n.role, name:n.name, age:n.age,
        activity:n.alive ? n.position || n.work : '已故', memory:n.memories.at(-1)}
    }),
    ending: p.dead ? {
      training: p.training, turns: publicRows(life.ledger.filter(e => e.cause === 'turn')),
      history: life.exposure.map(x => {
        const h = history.find(e => e.id === x.id)!
        return date(1-h.from) + ' · ' + h.title + '（' + h.source + '）。' +
          (x.load ? '本户额外支出 ' + x.cost + ' 钱。' : '此地未计入直接损失。') +
          (x.heard ? '当年听见了地方消息。' : '当年未获消息。')
      }),
    } : null,
  }
}
export type PlayerObservation = ReturnType<typeof observePlayer>
