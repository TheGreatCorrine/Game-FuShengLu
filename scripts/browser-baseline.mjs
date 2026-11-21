// node scripts/browser-baseline.mjs /path/to/oracle-checkout [chromium|node]
import { build } from 'esbuild'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const baseline = process.argv[2]
if (!baseline) throw Error('Provide an oracle checkout')
const chromium = process.argv[3] || 'chromium'
const output = process.env.BENCHMARK_HTML_DIR
const dir = output ? resolve(output) : mkdtempSync(join(tmpdir(), 'fushenglu-browser-'))
mkdirSync(dir,{recursive:true})
try {
  for (const [globalName, root] of [['oracle', baseline], ['current', '.']]) {
    await build({stdin:{contents:`export * from './src/engine/life.ts'
      export {eligible} from './src/engine.ts'
      export {collectPeople} from './src/engine/people.ts'`, resolveDir:resolve(root)},
      bundle:true, format:'iife', globalName, outfile:join(dir,globalName+'.js')})
  }
  const measure = `
try {
  const fixtures = {}
  for(let i=0; Object.keys(fixtures).length<3 && i<600; i++) {
    let s=oracle.confirmName(oracle.generate('quality'+i),'宁')
    while(!s.people[s.playerId].dead) {
      const p=s.people[s.playerId]
      if(s.pending) {
        const action=oracle.eligible(oracle.legacyPeopleView(s)).find(e=>e.id===s.pending).choices[0][1]
        if(!fixtures.choice && p.age>=15) fixtures.choice={s,action}
        s=oracle.decide(s,action)
      } else {
        if(p.age===10 && !fixtures.annual) fixtures.annual={s}
        if(p.age===65 && !fixtures.late) fixtures.late={s}
        s=oracle.advance(s)
      }
    }
  }
  if(Object.keys(fixtures).length!==3) throw Error('Missing benchmark fixture')
  for (const population of [64,256]) {
    const s=structuredClone(fixtures.late.s)
    const source=s.residentOrder[0]
    while (Object.keys(s.people).length < population) {
      const id='p'+s.nextPerson++
      s.people[id]={...structuredClone(s.people[source]),id,house:s.people[s.playerId].residence,
        age:30, born:s.year-30, health:80, alive:true, acute:'', role:'同户人',memories:[]}
      s.legacyKeys[id]='bench'+id
      s.parentIds[id]=[]
      s.towardPlayer[id]={trust:0.5,closeness:0.5,conflict:0,history:[]}
      s.residentOrder.push(id)
    }
    current.validatePeople(s)
    fixtures['population'+population]={s}
  }
  const rows=[]
  for(const [fixture,{s,action}] of Object.entries(fixtures)) {
    const flat=current.legacyPeopleView(s)
    const command=api=>action?api.decide(s,action):api.advance(s)
    const ordered=value=>Array.isArray(value)?value.map(ordered):value && typeof value==='object'
      ? Object.fromEntries(Object.keys(value).sort().map(k=>[k,ordered(value[k])])) : value
    if (JSON.stringify(ordered(command(oracle)))!==JSON.stringify(ordered(command(current))))
      throw Error('Command divergence in benchmark '+fixture)
    const iterations=fixture==='population256'?2:fixture==='population64'?8:32
    const methods={oracle:()=>command(oracle),current:()=>command(current),
      project:()=>current.legacyPeopleView(s),collect:()=>current.collectPeople(flat,s),
      cloneLife:()=>structuredClone(s),cloneFlat:()=>structuredClone(flat)}
    const samples=Object.fromEntries(Object.keys(methods).map(k=>[k,[]]))
    const entries=Object.entries(methods)
    for(let batch=-3;batch<21;batch++) {
      for(let j=0;j<entries.length;j++) {
        const [name,fn]=entries[(batch+entries.length+j)%entries.length]
        const start=performance.now()
        for(let k=0;k<iterations;k++) fn()
        if(batch>=0) samples[name].push((performance.now()-start)/iterations)
      }
    }
    for(const v of Object.values(samples)) v.sort((a,b)=>a-b)
    rows.push({fixture,seed:s.seed,age:s.people[s.playerId].age,action,people:Object.keys(s.people).length,
      times:Object.fromEntries(Object.entries(samples).map(([k,v])=>[k,[v[10],v[19]]]))})
  }
  result.textContent=JSON.stringify({runtime:typeof navigator==="undefined"?"Node":navigator.userAgent,rows})
} catch(e) { result.textContent='ERROR '+e.stack }
`
  const htmlPage='<!doctype html><pre id="result"></pre><script src="oracle.js"></script><script src="current.js"></script><script>'+measure+'</script>'
  writeFileSync(join(dir,'index.html'),htmlPage)
  if (!output && chromium === 'node') {
    const {runInNewContext}=await import('node:vm')
    const {readFileSync}=await import('node:fs')
    const result={}
    const program=['oracle','current'].map(key=>readFileSync(join(dir,key+'.js'),'utf8')).join('\n')
    runInNewContext(program+'\n'+measure,{performance,structuredClone,result,navigator:{userAgent:process.version}})
    if (!result.textContent.startsWith('{')) throw Error(result.textContent)
    console.log(result.textContent)
  }
  if (!output && chromium !== 'node') {
    const html=execFileSync(chromium,['--headless','--no-sandbox','--disable-dev-shm-usage','--disable-gpu',
      '--user-data-dir='+join(dir,'profile'),'--dump-dom',pathToFileURL(join(dir,'index.html')).href],
      {encoding:'utf8',stdio:['ignore','pipe','ignore'],timeout:120000})
    const result=html.match(/<pre id="result">([^<]*)<\/pre>/)?.[1]
    if(!result?.startsWith('{')) throw Error(result || 'Browser returned no samples')
    console.log(execFileSync(chromium,['--version'],{encoding:'utf8'}).trim())
    console.log(JSON.stringify(JSON.parse(result),null,2))
  }
} finally { if (!output) rmSync(dir,{recursive:true,force:true}) }
