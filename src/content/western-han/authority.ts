import { inLawParents, birthSibling, parentsOf, partnerOf, player, playerId, residents, siblingMate, type Game } from '../../engine/domain.ts'

export function authority(s: Game, house: string) {
  const p = player(s), pid = playerId(s)
  const adults = residents(s).filter(n =>
    n.alive && n.house === house && n.age >= 15 && n.health >= 35 && !n.acute)
  const capable = (ids: (string|null|undefined)[]) =>
    ids.find(id => adults.some(n => n.id === id))
  const elders = inLawParents(s,house)
  if (house.startsWith('kin')) {
    const head = capable([s.heads[house], ...elders])
    if (head) return head
  }
  if (house === 'birth') {
    const head = capable(parentsOf(s,pid))
    if (head) return head
  }
  if (house === p.residence && !p.dead && p.age >= 16 && p.health >= 35 && !p.acute)
    return pid
  const sibling = birthSibling(s)
  const successors = house === 'birth' || house === 'sibling'
    ? [sibling?.id, siblingMate(s,sibling)?.id]
    : [...elders,partnerOf(s,pid)]
  return capable(successors) ?? adults.find(n => n.role === '孩子' || n.role === '手足的孩子')?.id ?? null
}
