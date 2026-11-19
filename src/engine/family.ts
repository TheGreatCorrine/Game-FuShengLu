import { authority, settle, borrow, outstanding, repay } from './legal.ts'
import type { State, Kin } from './types.ts'
import { homes, rules } from '../data.ts'
import { random } from './rng.ts'
import { annualHealth } from './mortality.ts'
import { account } from './economy.ts'
export function kin(s: State, role: string, age: number, id: string): Kin {
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
    parents: role === '手足' ? ['father', 'mother'] : [],
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
const note = (s: State, text: string) =>
  s.chronicle.push({ age: s.age, year: s.year, text })
const clamp = (v: number) => Math.min(1, Math.max(0, v))
export function remember(s: State, n: Kin, id: string, trust: number) {
  n.trust = clamp(n.trust + trust)
  n.conflict = clamp(n.conflict - trust)
  n.history.push({
    id,
    year: s.year,
    actors: ['player', n.id],
    trust,
    significance: Math.abs(trust),
  })
  if (n.history.length > 8)
    n.history.splice(
      n.history.findIndex(
        (m) =>
          m.significance === Math.min(...n.history.map((m) => m.significance)),
      ),
      1,
    )
}
export function helpChance(s: State, n: Kin) {
  const memory = n.history.reduce(
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
      0.2 * n.trust +
      0.1 * n.closeness +
      0.12 * Number(n.goal === '积谷') +
      0.08 * Number(n.money > 10) -
      0.1 * n.conflict -
      0.12 * Number(n.acute !== '') +
      memory,
  )
}
export function joinFamily(s: State, p: Kin) {
  const serial = ++s.unions,
    origin = 'kin' + serial
  s.estates[origin] = {
    cash: Math.floor(homes[p.background].coins / 2),
    assets: 1,
    debt: 0,
  }
  const r = (k: string) => random(s.seed, origin + k)
  for (const [i, chance] of [0.78, 0.46].entries()) {
    if (r('relative' + i) > chance) continue
    const elder = kin(
      s,
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
    p.parents.push(elder.id)
    s.npcs.push(elder)
  }
  // A later spouse joins the established household, keeping children resident.
  if (serial === 1 && r('move') < (s.cash < 30 ? 0.75 : 0.48)) {
    s.estates.birth = { cash: s.cash, assets: s.assets, debt: s.debt }
    const elders = s.npcs.some((n) => n.house === origin)
    s.residence = elders ? origin : 'independent'
    Object.assign(s, s.estates[origin])
    delete s.estates[origin]
  }
  // A spouse with no other represented relatives brings the allocated goods.
  if (s.estates[origin] && !s.npcs.some((n) => n.house === origin)) {
    s.cash += s.estates[origin].cash
    s.assets += s.estates[origin].assets
    delete s.estates[origin]
  }
  p.house = s.residence
  p.partner = 'player'
  s.spouse = p.id
  s.npcs.push(p)
  for (const id of [origin, s.residence])
    if (id === s.residence || s.estates[id]) s.heads[id] = authority(s, id)
  s.marriage = serial === 1 ? 'married' : 'remarried'
  note(
    s,
    '与' +
      p.name +
      '成家，' +
      (s.residence === 'birth'
        ? '留在原家同住。'
        : s.residence === 'independent'
          ? '另起门户。'
          : '同姻亲合住。'),
  )
}
export function resolveKinHealth(s: State) {
  const deaths: string[] = []
  for (const n of s.npcs.filter((n) => n.alive)) {
    n.age++
    const health = annualHealth(
      n.age,
      n.health,
      random(s.seed, n.id + 'frailty'),
      s.env.disease,
      account(s, n.house).debt > 0,
      (k) => random(s.seed, n.id + k + s.year),
      s.mortality,
    )
    n.health = health.health
    n.acute = health.acute
    if (!health.dead) continue
    n.alive = false
    deaths.push(n.id)
    note(s, n.role + ' ' + n.name + ' 离世。')
    if (n.partner && n.partner !== 'player') {
      const survivor = s.npcs.find((k) => k.id === n.partner)
      if (survivor) survivor.partner = null
      n.partner = null
    }
    if (n.id === s.spouse) {
      n.partner = null
      s.spouse = null
      s.marriage = 'widowed'
      s.wedding.state = 'deferred'
      s.wedding.next = s.age + rules.family.remarryWait
      note(s, '伴侣离世，留下的家人仍在原户生活。')
    }
  }
  for (const id of deaths) settle(s, id)
  if (s.dead) settle(s, 'player')
  if (s.dead && s.spouse) {
    const p = s.npcs.find((n) => n.id === s.spouse)!
    p.partner = null
    s.spouse = null
    s.marriage = 'ended'
  }
}
export function developFamily(s: State) {
  for (const n of s.npcs.filter((n) => n.alive)) {
    const r = random(s.seed, n.id + 'year' + s.age),
      book = account(s, n.house)
    if (n.age >= 18 && n.age < 60 && !n.acute) {
      if (
        book.debt >= 8 &&
        n.goal === '积谷' &&
        n.generosity > 0.6 &&
        r < 0.12 &&
        !outstanding(s, n.id) &&
        borrow(s, n.id)
      ) {
        n.money -= 8
        book.debt -= 8
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
      n.work = '织作'
      n.position = ''
      note(
        s,
        (n.house === s.residence ? '' : '旧家传来消息，') +
          n.name +
          ' 接了织作，想替家里还债。',
      )
    } else if (n.goal === '授业' && r < 0.22) {
      const pupil = s.npcs.find(
        (c) =>
          c.alive &&
          c.house === n.house &&
          c.age >= 6 &&
          c.age < 15 &&
          !c.memories.includes('随家人习字'),
      )
      if (
        pupil &&
        (homes[n.background].books || (s.skill >= 3 && n.house === s.residence))
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
      book.cash -= 2
      n.money += 2
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
  const sib = s.npcs.find((n) => n.id === 'sibling' && n.alive)
  if (
    sib &&
    !sib.acute &&
    sib.age >= 23 &&
    sib.age <= 38 &&
    !s.npcs.some((n) => n.id === 'sibPartner') &&
    sib.money >= 3 &&
    random(s.seed, 'sibUnion' + s.year) < 0.08 + 0.05 * sib.ambition
  ) {
    const mate = kin(s, '手足的伴侣', sib.age + 1, 'sibPartner')
    mate.sex = sib.sex === '男' ? '女' : '男'
    mate.house = sib.house
    mate.tier = 2
    mate.partner = sib.id
    sib.partner = mate.id
    if (
      !s.estates.sibling &&
      sib.house !== 'sibling' &&
      sib.money >= 9 &&
      sib.ambition > 0.6
    ) {
      s.estates.sibling = { cash: 6, assets: 0, debt: 0 }
      sib.money -= 6
      sib.house = mate.house = 'sibling'
    }
    s.npcs.push(mate)
    note(
      s,
      sib.name +
        ' 与' +
        mate.name +
        ' 成亲，' +
        (sib.house === 'sibling' ? '另立了门户。' : '留在原户生活。'),
    )
  }
  const mate = s.npcs.find((n) => n.id === 'sibPartner' && n.alive)
  if (
    sib &&
    mate &&
    !sib.acute &&
    !mate.acute &&
    sib.age < 40 &&
    !s.npcs.some((n) => n.id === 'niece') &&
    random(s.seed, 'sibChild' + s.year) < 0.12
  ) {
    const child = kin(s, '手足的孩子', 0, 'niece')
    child.house = sib.house
    child.parents = [sib.id, mate.id]
    child.tier = 2
    s.npcs.push(child)
    note(s, sib.name + ' 家添了孩子。')
  }
  const p = s.npcs.find((n) => n.id === s.spouse && n.alive)
  if (
    !p ||
    p.acute ||
    s.acute ||
    Math.max(s.age, p.age) > rules.family.lastParentAge ||
    Math.min(s.health, p.health) < 40 ||
    (s.lastBirth !== null && s.year - s.lastBirth < rules.family.spacing)
  )
    return
  if (
    random(s.seed, 'child' + s.age) >=
    rules.family.chance * (s.debt > 0 ? 0.65 : 1)
  )
    return
  const id = 'child' + s.year
  const child = kin(s, '孩子', 0, id)
  child.parents = ['player', p.id]
  child.background = p.background
  s.lastBirth = s.year
  s.npcs.push(child)
  note(s, '你与' + p.name + ' 的孩子' + child.name + '出生了。')
}
