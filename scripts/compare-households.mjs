// Supply a bundled ESM build of the Stage 0 engine as the first argument.
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import * as current from '../src/engine.ts'
import { migrateHouseholds, validateHouseholds } from '../src/engine/accounts.ts'
import { legacyView } from './legacy-household-view.mjs'

const old = await import(pathToFileURL(resolve(process.argv[2])).href)
const policies = {
  first: [], conservative: ['save','pass','work','petition','waitPlan','trialSkill'],
  education: ['learn','halfDays','trialSkill','career','meet'], random: [],
}
let transitions = 0, migrations = 0, moves = 0
function mismatch(a, b, path = []) {
  if (Object.is(a, b)) return
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (Object.hasOwn(a,key) !== Object.hasOwn(b,key)) return [...path,key]
      const found = mismatch(a[key], b[key], [...path,key])
      if (found) return found
    }
    return
  }
  return path
}
function check(a, b, label, context) {
  if (isDeepStrictEqual(a,b)) return
  const path = mismatch(a,b) ?? []
  throw Error(JSON.stringify({ ...context, householdId: label === 'households' ? path[0] : context.householdId,
    field: [label,...path].join('.'), old: path.reduce((v,k)=>v?.[k],a) ?? null,
    new: path.reduce((v,k)=>v?.[k],b) ?? null }))
}
for (const [policy, priority] of Object.entries(policies)) {
  for (let i = 0; i < Number(process.argv[3] ?? 600); i++) {
    const seed = 'quality' + i
    let a = old.generate(seed), b = current.generate(seed), command = 'generate', previous
    for (;;) {
      const ctx = {seed,policy,age:a.age,command,householdId:a.residence}
      const books = {...a.estates, [a.residence]: {cash:a.cash,assets:a.assets,debt:a.debt}}
      try { validateHouseholds(b) } catch (error) { throw Error(JSON.stringify(ctx) + ' ' + error.message) }
      check(books,b.households,'households',ctx)
      check(a,legacyView(b),'state',ctx)
      if (previous !== a.residence || (a.age === 40 && command === 'advance')) {
        const converted = migrateHouseholds(a)
        check(books,converted.households,'households',ctx)
        check(a,legacyView(converted),'migration',ctx)
        migrations++
        if (previous !== undefined && previous !== a.residence) moves++
      }
      previous = a.residence
      transitions++
      if (a.dead) break
      if (!a.name) {
        command = 'confirmName'
        a = old.confirmName(a,'宁'); b = current.confirmName(b,'宁')
      } else if (a.pending) {
        const options = old.eligible(a).find(e=>e.id===a.pending).choices
        check(options,current.eligible(b).find(e=>e.id===b.pending)?.choices,'choices',ctx)
        const actions = options.map(c=>c[1])
        const action = policy==='random' ? actions[Math.floor(old.random(seed,'policy'+a.age)*actions.length)]
          : priority.find(x=>actions.includes(x)) ?? actions[0]
        command = 'decide:' + action
        a = old.decide(a,action); b = current.decide(b,action)
      } else {
        command = 'advance'
        a = old.advance(a); b = current.advance(b)
      }
    }
  }
}
console.log(JSON.stringify({transitions,migrations,moves}))
