import { canonical, attitude, unionCount, currentCandidate, type Person, birthSibling, siblingMate, parentsOf, keyFor, register, formUnion, kinContext, player, playerId, residents, partnerOf, endUnion, type Game } from './domain.ts'
import { payHouseDebt, changeOccupation, transferSavings } from './operations.ts'
import { authority, settle, borrow, outstanding, repay } from './legal.ts'
import type { State, Kin } from './types.ts'
import { homes, rules } from '../data.ts'
import { random } from './rng.ts'
import { annualHealth } from './mortality.ts'
import { account, openHouse, moveResidence } from './accounts.ts'
export function kin(s: Pick<State,'seed'|'sex'|'year'|'residence'|'home'|'surname'>, role: string, age: number, id: string): Kin {
  const roll = (k: string) => random(s.seed, id + k)
  return {
    sex:
      role === '父亲'
        ? '男'
        : role === '母亲'
          ? '女'
          : role === '伴侣'
            ? s.sex === '女'
              ? '男'
              : '女'
            : roll('sex') < 0.5
              ? '女'
              : '男',
    parents: [],
    partner: null,
    born: s.year - age,
    acute: '',
    ambition: roll('ambition'),
    tier: 1,
    conflict: 0,
    history: [],
    house: s.residence,
    background: s.home,
    id,
    role,
    age,
    name:
      (role === '母亲' || role === '伴侣'
        ? ['周', '许', '朱'][Math.floor(roll('姓') * 3)]
        : s.surname) +
      ['安', '宁', '成', '素', '和', '平'][Math.floor(roll('名') * 6)],
    alive: true,
    health: 65 + Math.floor(roll('健') * 30),
    work: age < 15 ? '未就业' : homes[s.home].work,
    position: role === '父亲' && s.home === 3 ? '地方小吏' : '',
    goal: roll('愿') < 0.5 ? '积谷' : '授业',
    generosity: roll('性'),
    trust: 0.3 + roll('信') * 0.5,
    closeness: 0.5,
    money: Math.floor(roll('钱') * 18),
    memories: [],
  }
}
const note = (s: Game, text: string) =>
  s.chronicle.push({ age: player(s).age, year: s.year, text })
const clamp = (v: number) => Math.min(1, Math.max(0, v))
export function remember(s: Game, n: Person, id: string, trust: number) {
  if (!n.alive || (!residents(s).includes(n) && currentCandidate(s) !== n) || !id || !Number.isFinite(trust))
    throw Error('Invalid relationship update: ' + n.id)
  const feelings = attitude(s,n)
  feelings.trust = clamp(feelings.trust + trust)
  feelings.conflict = clamp(feelings.conflict - trust)
  feelings.history.push({
    id,
    year: s.year,
    actors: [playerId(s), n.id],
    trust,
    significance: Math.abs(trust),
  })
  if (feelings.history.length > 8)
    feelings.history.splice(
      feelings.history.findIndex(
        (m) =>
          m.significance === Math.min(...feelings.history.map((m) => m.significance)),
      ),
      1,
    )
}
export function helpChance(s: Game, n: Person) {
  const feelings = attitude(s,n)
  const memory = feelings.history.reduce(
    (v, m) =>
      v +
      (m.id === 'care' || m.id === 'aid'
        ? 0.15
        : m.id === 'dispute'
          ? -0.12
          : 0),
    0,
  )
  return clamp(
    0.12 +
      0.24 * n.generosity +
      0.2 * feelings.trust +
      0.1 * feelings.closeness +
      0.12 * Number(n.goal === '积谷') +
      0.08 * Number(n.money > 10) -
      0.1 * feelings.conflict -
      0.12 * Number(n.acute !== '') +
      memory,
  )
}
export function joinFamily(s: Game, p: Person) {
  const self = player(s), pid = playerId(s)
  if (self.dead || !p.alive || partnerOf(s,p.id) || partnerOf(s,pid) || p.id === pid || residents(s).some(n => n.id === p.id))
    throw Error('Invalid household marriage admission: ' + p.id)
  if (canonical(s) && (s.candidateId !== p.id || s.people[p.id] !== p))
    throw Error('Unregistered marriage candidate')
  const serial = unionCount(s) + 1,
    origin = 'kin' + serial
  const allocation = { cash: Math.floor(homes[p.background].coins / 2), assets: 1, debt: 0 }
  const r = (k: string) => random(s.seed, origin + k)
  for (const [i, chance] of [0.78, 0.46].entries()) {
    if (r('relative' + i) > chance) continue
    const elder = kin(
      kinContext(s),
      i ? '姻亲长辈（母）' : '姻亲长辈（父）',
      p.age + 20 + Math.floor(r('age' + i) * 15),
      origin + 'elder' + i,
    )
    if (!i) elder.name = p.name[0] + elder.name.slice(1)
    elder.tier = 2
    elder.sex = i ? '女' : '男'
    elder.house = origin
    elder.background = p.background
    elder.work = homes[p.background].work
    if (elder.age >= 60) elder.work = '家中休养'
    const parent = register(s,elder,[])
    if (canonical(s)) s.parentIds[p.id].push(parent.id)
    else if ('parents' in p) p.parents.push(parent.id)
  }
  // A later spouse joins the established household, keeping children resident.
  const elders = residents(s).some(n => n.house === origin)
  const moving = serial === 1 && r('move') < (account(s).cash < 30 ? 0.75 : 0.48)
  if (elders || moving) {
    const destination = elders ? origin : 'independent'
    openHouse(s, destination, allocation)
    if (moving) moveResidence(s, destination)
  } else {
    // An unrepresented spouse household contributes its original endowment once.
    account(s).cash += allocation.cash
    account(s).assets += allocation.assets
  }
  p.house = self.residence
  if (canonical(s)) {
    s.residentOrder.push(p.id)
    s.candidateId = null
  } else if ('parents' in p) {
    s.npcs.push(p)
    s.unions = serial
    s.marriage = serial === 1 ? 'married' : 'remarried'
  }
  formUnion(s,pid,p.id)
  for (const id of [origin, self.residence])
    if (id === self.residence || s.households[id]) s.heads[id] = authority(s, id)
  note(
    s,
    '与' +
      p.name +
      '成家，' +
      (self.residence === 'birth'
        ? '留在原家同住。'
        : self.residence === 'independent'
          ? '另起门户。'
          : '同姻亲合住。'),
  )
}
type HealthWorld = Pick<State,'seed'|'year'|'env'|'mortality'|'households'>
type Resident = Pick<Kin,'id'|'age'|'alive'|'health'|'acute'> & { house: string | null }

// Traversal order controls the subsequent death notices and estate settlements.
export function ageResidents(world: HealthWorld, residents: Resident[], keyFor: (id:string) => string) {
  const deaths: string[] = []
  for (const n of residents) {
    if (!n.alive) continue
    const key = keyFor(n.id)
    if (!key || n.house === null || !Object.hasOwn(world.households,n.house))
      throw Error('Missing resident health context: ' + n.id)
    n.age++
    const outcome = annualHealth(n.age, n.health, random(world.seed, key + 'frailty'),
      world.env.disease, world.households[n.house].debt > 0,
      k => random(world.seed, key + k + world.year), world.mortality)
    n.health = outcome.health
    n.acute = outcome.acute
    if (outcome.dead) {
      n.alive = false
      deaths.push(n.id)
    }
  }
  return deaths
}

export function resolveKinHealth(s: State) {
  finishResidentDeaths(s, ageResidents(s, s.npcs, id => id))
}

export function finishResidentDeaths(s: Game, deaths: string[]) {
  const p = player(s), pid = playerId(s)
  for (const id of deaths) {
    const n = residents(s).find(person => person.id === id)
    if (!n || n.alive) throw Error('Invalid resident death: ' + id)
    note(s, n.role + ' ' + n.name + ' 离世。')
    const spouse = partnerOf(s,id)
    if (spouse) endUnion(s,id,'widowed')
    if (spouse === pid) {
      s.wedding.state = 'deferred'
      s.wedding.next = p.age + rules.family.remarryWait
      note(s, '伴侣离世，留下的家人仍在原户生活。')
    }
  }
  for (const id of deaths) settle(s, id)
  if (p.dead) {
    settle(s,pid)
    if (partnerOf(s,pid)) endUnion(s,pid,'ended')
  }
}
export function developFamily(s: Game) {
  const self = player(s)
  const roster = residents(s)
  for (const n of roster.filter((n) => n.alive)) {
    const r = random(s.seed, keyFor(s,n.id) + 'year' + self.age),
      book = account(s, n.house!)
    if (n.age >= 18 && n.age < 60 && !n.acute) {
      if (
        book.debt >= 8 &&
        n.goal === '积谷' &&
        n.generosity > 0.6 &&
        r < 0.12 &&
        !outstanding(s, n.id) &&
        borrow(s, n.id)
      ) {
        payHouseDebt(n, book, 8)
        note(s, n.name + '以自己的名义借了八钱，替家中还欠。')
      } else if (n.money > 4 && outstanding(s, n.id)) {
        n.money -= repay(s, n.id, n.money - 4)
      }
    }
    if (n.age === 15 || n.age === 60) {
      n.work =
        n.age === 60
          ? '家中休养'
          : n.memories.includes('随家人习字')
            ? '文书'
            : homes[n.background].work
      n.position = ''
      note(s, n.name + ' 开始' + n.work + '。')
    }
    if (
      n.acute ||
      n.age < 15 ||
      n.age >= 60 ||
      (n.tier === 2 && n.age % 3 !== 0)
    )
      continue
    if (
      book.debt > 5 &&
      n.work !== '织作' &&
      r < 0.1 + 0.18 * n.ambition + 0.12 * Number(n.goal === '积谷')
    ) {
      changeOccupation(n, '织作')
      n.position = ''
      note(
        s,
        (n.house === self.residence ? '' : '旧家传来消息，') +
          n.name +
          ' 接了织作，想替家里还债。',
      )
    } else if (n.goal === '授业' && r < 0.22) {
      const pupil = roster.find(
        (c) =>
          c.alive &&
          c.house === n.house &&
          c.age >= 6 &&
          c.age < 15 &&
          !c.memories.includes('随家人习字'),
      )
      if (
        pupil &&
        (homes[n.background].books || (self.skill >= 3 && n.house === self.residence))
      ) {
        pupil.memories.push('随家人习字')
        pupil.goal = '授业'
        if (!n.memories.includes('带出第一个识字的孩子')) {
          n.memories.push('带出第一个识字的孩子')
          if (book.debt > 0) n.goal = '积谷'
        }
        note(s, n.name + ' 腾出工夫教' + pupil.name + ' 辨认木简。')
      }
    } else if (n.goal === '积谷' && r < 0.18 && book.cash >= 2) {
      transferSavings(book, n, 2)
      if (
        n.money >= 20 &&
        book.debt === 0 &&
        n.ambition > 0.5 &&
        !n.memories.includes('攒够过冬私蓄')
      ) {
        n.memories.push('攒够过冬私蓄')
        n.goal = '授业'
        note(s, n.name + '把过冬的积蓄封好，开始留意家里哪个孩子肯学字。')
      }
    }
  }
  const sib = birthSibling(s)
  if (
    sib?.alive &&
    !sib.acute &&
    sib.age >= 23 &&
    sib.age <= 38 &&
    !siblingMate(s,sib) &&
    sib.money >= 3 &&
    random(s.seed, 'sibUnion' + s.year) < 0.08 + 0.05 * sib.ambition
  ) {
    const mate = kin(kinContext(s), '手足的伴侣', sib.age + 1, 'sibPartner')
    mate.sex = sib.sex === '男' ? '女' : '男'
    mate.house = sib.house!
    mate.tier = 2
    if (
      !s.households.sibling &&
      sib.house !== 'sibling' &&
      sib.money >= 9 &&
      sib.ambition > 0.6
    ) {
      openHouse(s, 'sibling', { cash: 6, assets: 0, debt: 0 })
      sib.money -= 6
      sib.house = mate.house = 'sibling'
    }
    const spouse = register(s,mate,[])
    formUnion(s,sib.id,spouse.id)
    note(
      s,
      sib.name +
        ' 与' +
        mate.name +
        ' 成亲，' +
        (sib.house === 'sibling' ? '另立了门户。' : '留在原户生活。'),
    )
  }
  const mate = siblingMate(s,sib)
  if (
    sib?.alive &&
    mate?.alive &&
    !sib.acute &&
    !mate.acute &&
    sib.age < 40 &&
    !roster.some(n => parentsOf(s,n.id).includes(sib.id) && parentsOf(s,n.id).includes(mate.id)) &&
    random(s.seed, 'sibChild' + s.year) < 0.12
  ) {
    const child = kin(kinContext(s), '手足的孩子', 0, 'niece')
    child.house = sib.house!
    child.tier = 2
    register(s,child,[sib.id,mate.id])
    note(s, sib.name + ' 家添了孩子。')
  }
  const p = roster.find((n) => n.id === partnerOf(s,playerId(s)) && n.alive)
  if (
    !p ||
    p.acute ||
    self.acute ||
    Math.max(self.age, p.age) > rules.family.lastParentAge ||
    Math.min(self.health, p.health) < 40 ||
    (s.lastBirth !== null && s.year - s.lastBirth < rules.family.spacing)
  )
    return
  if (
    random(s.seed, 'child' + self.age) >=
    rules.family.chance * (account(s).debt > 0 ? 0.65 : 1)
  )
    return
  const id = 'child' + s.year
  const child = kin(kinContext(s), '孩子', 0, id)
  child.background = p.background
  s.lastBirth = s.year
  register(s,child,[playerId(s),p.id])
  note(s, '你与' + p.name + ' 的孩子' + child.name + '出生了。')
}
