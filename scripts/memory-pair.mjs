import { memoryPair } from './relationship-fixture.mjs'
for (let i = 0; i < 200; i++) {
  const p = memoryPair('memory' + i)
  if (p.outcomes[0].debt !== p.outcomes[1].debt) {
    console.log(JSON.stringify(p, null, 2))
    break
  }
}
