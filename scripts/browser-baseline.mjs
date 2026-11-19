// node scripts/browser-baseline.mjs /path/to/Stage2-checkout [chromium]
import { build } from 'esbuild'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const baseline = process.argv[2]
if (!baseline) throw Error('Provide a Stage 2 checkout')
const chromium = process.argv[3] || 'chromium'
const output = process.env.BENCHMARK_HTML_DIR
const dir = output ? resolve(output) : mkdtempSync(join(tmpdir(), 'fushenglu-browser-'))
mkdirSync(dir,{recursive:true})
try {
  for (const [globalName, root] of [['stage2', baseline], ['stage3', '.']]) {
    await build({stdin:{contents:`export * from './src/engine/life.ts'
      export {eligible} from './src/engine.ts'
      export {collectPeople} from './src/engine/people.ts'`, resolveDir:resolve(root)},
      bundle:true, format:'iife', globalName, outfile:join(dir,globalName+'.js')})
  }
  writeFileSync(join(dir,'index.html'),`<!doctype html><pre id="result"></pre>
<script src="stage2.js"></script><script src="stage3.js"></script><script>
try {
  const fixtures = {}
  for(let i=0; Object.keys(fixtures).length<3 && i<600; i++) {
    let s=stage2.confirmName(stage2.generate('quality'+i),'宁')
    while(!s.people[s.playerId].dead) {
      const p=s.people[s.playerId]
      if(s.pending) {
        const action=stage2.eligible(stage2.legacyPeopleView(s)).find(e=>e.id===s.pending).choices[0][1]
        if(!fixtures.choice && p.age>=15) fixtures.choice={s,action}
        s=stage2.decide(s,action)
      } else {
        if(p.age===10 && !fixtures.annual) fixtures.annual={s}
        if(p.age===65 && !fixtures.late) fixtures.late={s}
        s=stage2.advance(s)
      }
    }
  }
  if(Object.keys(fixtures).length!==3) throw Error('Missing benchmark fixture')
  const rows=[]
  for(const [fixture,{s,action}] of Object.entries(fixtures)) {
    const flat=stage3.legacyPeopleView(s)
    const command=api=>action?api.decide(s,action):api.advance(s)
    const methods={stage2:()=>command(stage2),stage3:()=>command(stage3),
      project:()=>stage3.legacyPeopleView(s),collect:()=>stage3.collectPeople(flat,s),
      cloneLife:()=>structuredClone(s),cloneFlat:()=>structuredClone(flat)}
    const samples=Object.fromEntries(Object.keys(methods).map(k=>[k,[]]))
    const entries=Object.entries(methods)
    for(let batch=-3;batch<21;batch++) {
      for(let j=0;j<entries.length;j++) {
        const [name,fn]=entries[(batch+entries.length+j)%entries.length]
        const start=performance.now()
        for(let k=0;k<32;k++) fn()
        if(batch>=0) samples[name].push((performance.now()-start)/32)
      }
    }
    for(const v of Object.values(samples)) v.sort((a,b)=>a-b)
    rows.push({fixture,seed:s.seed,age:s.people[s.playerId].age,action,people:Object.keys(s.people).length,
      times:Object.fromEntries(Object.entries(samples).map(([k,v])=>[k,[v[10],v[19]]]))})
  }
  result.textContent=JSON.stringify({browser:navigator.userAgent,rows})
} catch(e) { result.textContent='ERROR '+e.stack }
</script>`)
  if (!output) {
    const html=execFileSync(chromium,['--headless','--no-sandbox','--disable-dev-shm-usage','--disable-gpu',
      '--user-data-dir='+join(dir,'profile'),'--dump-dom',pathToFileURL(join(dir,'index.html')).href],
      {encoding:'utf8',stdio:['ignore','pipe','ignore'],timeout:120000})
    const result=html.match(/<pre id="result">([^<]*)<\/pre>/)?.[1]
    if(!result?.startsWith('{')) throw Error(result || 'Browser returned no samples')
    console.log(execFileSync(chromium,['--version'],{encoding:'utf8'}).trim())
    console.log(JSON.stringify(JSON.parse(result),null,2))
  }
} finally { if (!output) rmSync(dir,{recursive:true,force:true}) }
