import { random } from './rng.ts'
import type { State } from './types.ts'
export const yields: Record<string, number> = {
  幼年: 0,
  田间劳作: 7,
  管田: 12,
  习艺: 5,
  织作: 10,
  随家行商: 8,
  经营货担: 13,
  代人理账: 13,
  佐理文书: 15,
  家中休养: 3,
}
export function livelihood(s: State) {
  const roll = random(s.seed, 'work:' + s.age)
  if (s.age === 15)
    return s.home === 2
      ? '随家行商'
      : s.home === 3 || roll < (s.sex === '女' ? 0.5 : 0.2)
        ? '习艺'
        : '田间劳作'
  if (s.age < 16) return s.work
  if (s.health < 32 && s.acute) return '家中休养'
  if (s.work === '家中休养' && s.health > 60)
    return s.home === 2 ? '随家行商' : '田间劳作'
  if (roll > 0.2 || s.age < 19) return s.work
  if (s.work === '代人理账' && s.home === 3 && s.sex === '男' && s.skill >= 4)
    return '佐理文书'
  if (s.work === '田间劳作' && s.assets >= 2 && s.practice >= 5) return '管田'
  if (s.work === '习艺' && s.practice >= 4) return '织作'
  if (
    s.work === '随家行商' &&
    s.cash >= 18 &&
    s.practice >= 4 &&
    s.env.trade > 0.8
  )
    return '经营货担'
  if (s.work === '经营货担' && s.debt > 25) return '随家行商'
  return s.work
}
