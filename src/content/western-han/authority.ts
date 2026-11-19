import type { Kin, State } from '../../engine/types.ts'

export function authority(s: State, house: string) {
  const capable = (n: Kin) =>
    n.alive && n.house === house && n.age >= 15 && n.health >= 35 && !n.acute
  const adults = s.npcs.filter(capable)
  if (house.startsWith('kin')) {
    const head = [s.heads[house], house + 'elder0', house + 'elder1'].find(
      (id) => adults.some((n) => n.id === id),
    )
    if (head) return head
  }
  if (house === 'birth') {
    const parent = ['father', 'mother']
      .map((id) => adults.find((n) => n.id === id))
      .find(Boolean)
    if (parent) return parent.id
  }
  if (
    house === s.residence &&
    !s.dead &&
    s.age >= 16 &&
    s.health >= 35 &&
    !s.acute
  )
    return 'player'
  // Named successors by household role, independent of age ranking.
  const successors =
    house === 'birth'
      ? ['sibling', 'sibPartner']
      : house === 'sibling'
        ? ['sibling', 'sibPartner']
        : [house + 'elder0', house + 'elder1', s.spouse]
  return (
    successors.find((id) => adults.some((n) => n.id === id)) ??
    adults.find((n) => n.role === '孩子' || n.role === '手足的孩子')?.id ??
    null
  )
}
