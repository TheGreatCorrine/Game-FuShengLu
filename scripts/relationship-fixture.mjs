// Controlled fixture D: same later finances, same people and same draw.
// The two interventions are care vs taking paid work during a roof repair.
import { generate, confirmName, decide } from '../src/engine.ts'
export function memoryPair(seed) {
  let start = confirmName(generate(seed), '宁')
  Object.assign(start, { age: 20, year: start.birth + 20, pending: 'roof' })
  const outcomes = ['bond', 'work'].map((action) => {
    const later = decide(start, action)
    // Controlled five-year gap: no intervening contacts and equalized resources.
    later.age += 5
    later.year += 5
    for (const n of later.npcs) n.age = later.year - n.born
    later.households[later.residence].cash = 0
    later.purse = 5
    later.households[later.residence].debt = 10
    later.npcs[0].money = 12
    later.pending = 'relief'
    const end = decide(later, 'petition')
    return {
      action,
      age: end.age,
      debt: end.debt,
      response: end.chronicle.at(-1).text,
      memories: end.npcs[0].history,
    }
  })
  return { seed, fixture: true, outcomes }
}
