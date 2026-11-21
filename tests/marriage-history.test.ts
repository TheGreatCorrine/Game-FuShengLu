import { expect, it } from 'vitest'
import { generate, validatePeople } from '../src/engine/life.ts'
import { birthSibling, endUnion, formUnion, kinContext, partnerOf, register } from '../src/engine/domain.ts'
import { authority } from '../src/content/western-han/authority.ts'
import { random } from '../src/engine/rng.ts'
import { developFamily, kin } from '../src/engine/family.ts'

it('uses the current spouse for succession while retaining ended NPC marriages', () => {
  const life = generate('npc-union-history')
  const sibling = birthSibling(life)!
  sibling.house = 'sibling'
  sibling.acute = '病中'
  life.households.sibling = {cash:8,assets:0,debt:0}
  life.heads.sibling = null
  const addSpouse = (key: string) => {
    const template = kin(kinContext(life),'手足的伴侣',28,key)
    template.house = 'sibling'
    return register(life,template,[]).id
  }
  const former = addSpouse('former'), current = addSpouse('current')
  formUnion(life,sibling.id,former)
  endUnion(life,sibling.id,'ended')
  formUnion(life,sibling.id,current)
  validatePeople(life)
  expect(partnerOf(life,sibling.id)).toBe(current)
  expect(partnerOf(life,former)).toBeNull()
  expect(authority(life,'sibling')).toBe(current)
  // A prior union remains in the family record. The existing one-child sibling
  // storyline may only introduce a child with the active spouse.
  sibling.age = 28
  sibling.acute = ''
  life.year += 20
  while (random(life.seed,'sibChild'+life.year) >= 0.12) life.year++
  const priorChild = kin(kinContext(life),'手足的孩子',8,'niece')
  priorChild.house = sibling.house!
  const withPriorChild = structuredClone(life)
  register(withPriorChild,priorChild,[sibling.id,former])
  developFamily(withPriorChild)
  expect(Object.values(withPriorChild.parentIds).filter(ids => ids.includes(sibling.id))).toHaveLength(1)
  developFamily(life)
  expect(Object.values(life.parentIds).filter(ids => ids.includes(sibling.id))).toEqual([[sibling.id,current]])
  expect(life.marriages.map(u => u.end?.cause ?? 'active')).toEqual(['ended','active'])
})
