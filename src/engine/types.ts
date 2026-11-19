import type { Mortality } from './mortality.ts'
export type Estate = { cash: number; assets: number; debt: number }
export type Memory = {
  id: string
  year: number
  actors: string[]
  trust: number
  significance: number
}
export type Kin = {
  id: string
  sex: string
  born: number
  parents: string[]
  partner: string | null
  acute: string
  ambition: number
  conflict: number
  history: Memory[]
  tier: 1 | 2
  house: string
  background: number
  role: string
  name: string
  age: number
  alive: boolean
  health: number
  work: string
  position: string
  goal: string
  generosity: number
  trust: number
  closeness: number
  money: number
  memories: string[]
}
type Entry = {
  age: number
  text: string
  cause?: string
  year?: number
  actors?: string[]
  changes?: Record<string, number>
  fact?: string
  decision?: string
}
export type State = {
  loans: import('./legal.ts').Loan[]
  settlements: import('./legal.ts').Settlement[]
  nextCollection: number
  mortality: Mortality
  vulnerability: number
  acute: string
  risk: number
  practice: number
  readonly assets: number
  households: Record<string, Estate>
  residence: string
  readonly estates: Readonly<Record<string, Readonly<Estate>>>
  heads: Record<string, string | null>
  spouse: string | null
  unions: number
  marriage: 'never' | 'married' | 'widowed' | 'remarried' | 'ended'
  lastBirth: number | null
  candidate: Kin | null
  promise: { id: string; due: number } | null
  careYear: number | null
  closedHouses: Record<string, number>
  wedding: {
    state: 'eligible' | 'attempted' | 'deferred' | 'resolved'
    attempts: number
    next: number
  }
  env: { trade: number; price: number; harvest: number; disease: number }
  seed: string
  birth: number
  age: number
  year: number
  surname: string
  name: string
  region: number
  home: number
  sex: string
  health: number
  talent: number
  skill: number
  readonly cash: number
  purse: number
  readonly debt: number
  income: number
  expenses: number
  work: string
  dead: boolean
  npcs: Kin[]
  news: Entry[]
  chronicle: Entry[]
  ledger: Entry[]
  seen: string[]
  pending: string
  training: string
  queue: { age: number; cause: string }[]
  exposure: { id: string; load: number; cost: number; heard: boolean }[]
}
