import { homes, regions, rules } from '../data.ts'
import { configure, type Mortality } from './mortality.ts'
import { random, weighted } from './rng.ts'
import { kin } from './family.ts'
import { register } from './domain.ts'
import type { Life } from './people.ts'
export function generate(
  seed: string,
  overrides: Partial<Mortality> = {},
): Life {
  const r = (k: string) => random(seed, k)
  const region = Math.floor(r('region') * regions.length),
    home = weighted(rules.weights[region], r('home')),
    birth = 1 - rules.birthBCE[Math.floor(r('birth') * 4)]
  const p = {
    id:'p0', kind:'player' as const,
    vulnerability: r('vulnerability'),
    acute: '',
    risk: 0,
    practice: 0,
    residence: 'birth',
    birth,
    age: 0,
    home,
    surname: ['陈', '李', '张', '王', '郑', '田'][Math.floor(r('surname') * 6)],
    name: '',
    sex: r('sex') < 0.5 ? '女' : '男',
    health: 80 + Math.floor(r('health') * 20),
    talent: r('ability'),
    skill: 0,
    purse: 0,
    work: '幼年',
    dead: false,
    training: '',
  }
  const s: Life = {
    loans: [],
    settlements: [],
    nextCollection: 0,
    seed,
    mortality: configure(overrides),
    households: { birth: { cash: homes[home].coins + Math.floor(r('cash') * 20), assets: home === 1 ? 0 : home === 0 ? 2 : 1, debt: 0 } },
    closedHouses: {},
    promise: null,
    careYear: null,
    heads: { birth: null },
    lastBirth: null,
    wedding: { state: 'eligible', attempts: 0, next: 0 },
    env: { trade: 1, price: 1, harvest: 1, disease: 0.12 },
    year: birth,
    region,
    income: 0,
    expenses: 0,
    news: [],
    chronicle: [],
    ledger: [],
    seen: [],
    pending: '',
    queue: [],
    exposure: [],
    playerId:p.id, nextPerson:1, people:{[p.id]:p}, legacyKeys:{[p.id]:'player'},
    parentIds:{}, towardPlayer:{}, residentOrder:[], candidateId:null, marriages:[],
  }
  const origin = {...p, seed, year:birth}
  const siblingAge = 1 + Math.floor(r('sib') * 7)
  const father = register(s, kin(origin,'父亲',25+siblingAge+Math.floor(r('father')*12),'father'), [])
  const mother = register(s, kin(origin,'母亲',20+siblingAge+Math.floor(r('mother')*10),'mother'), [])
  s.parentIds[p.id] = [father.id,mother.id]
  register(s,kin(origin,'手足',siblingAge,'sibling'),[father.id,mother.id])
  s.heads.birth = father.id
  return s
}
