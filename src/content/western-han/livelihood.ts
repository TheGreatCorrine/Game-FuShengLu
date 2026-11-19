import { account } from '../../engine/accounts.ts'
import { random } from '../../engine/rng.ts'
import { player, type Game } from '../../engine/domain.ts'
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
export function livelihood(s: Game) {
  const p = player(s)
  const roll = random(s.seed, 'work:' + p.age)
  if (p.age === 15)
    return p.home === 2
      ? '随家行商'
      : p.home === 3 || roll < (p.sex === '女' ? 0.5 : 0.2)
        ? '习艺'
        : '田间劳作'
  if (p.age < 16) return p.work
  if (p.health < 32 && p.acute) return '家中休养'
  if (p.work === '家中休养' && p.health > 60)
    return p.home === 2 ? '随家行商' : '田间劳作'
  if (roll > 0.2 || p.age < 19) return p.work
  if (p.work === '代人理账' && p.home === 3 && p.sex === '男' && p.skill >= 4)
    return '佐理文书'
  if (p.work === '田间劳作' && account(s).assets >= 2 && p.practice >= 5) return '管田'
  if (p.work === '习艺' && p.practice >= 4) return '织作'
  if (
    p.work === '随家行商' &&
    account(s).cash >= 18 &&
    p.practice >= 4 &&
    s.env.trade > 0.8
  )
    return '经营货担'
  if (p.work === '经营货担' && account(s).debt > 25) return '随家行商'
  return p.work
}
