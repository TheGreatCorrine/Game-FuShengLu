import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { actionsLeft, annualPhase, availableActions, introductionConstraint, submitAnnual } from './engine/annual-actions.ts'
import * as life from './engine/life.ts'
import { eligible, participant } from './engine.ts'
import type { Life } from './engine/people.ts'
import { observePlayer } from './engine/observation.ts'
import { PlayerView } from './PlayerView.tsx'
import './style.css'

function Debug({state, generate}: {state:Life; generate:(seed:string)=>void}) {
  const [seed,setSeed] = useState('')
  const s = life.legacyPeopleView(state)
  return (
        <details>
          <summary>开发者调试 · 含隐藏信息</summary>
          <input
            aria-label="指定种子"
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
          />
          <button
            onClick={() => {
              generate(seed)
            }}
          >
            按种子生成
          </button>
          <pre>
            {JSON.stringify(
              {
                participant: s.pending ? participant(s, s.pending)?.id : null,
                eligible: eligible(s).map((e) => e.id),
                state: s,
              },
              null,
              2,
            )}
          </pre>
        </details>
  )
}
const fresh = () => life.generate(String(crypto.getRandomValues(new Uint32Array(1))[0]))
function App() {
  const [state,set] = useState(fresh)
  const [generation, resetForm] = useState(0)
  const observation = observePlayer(state)
  const choices=availableActions(state)
  const annual=annualPhase(state)==='actions' ? {
    year:state.year, left:actionsLeft(state), choices:choices.map(o=>o.label), constraint:introductionConstraint(state),
    last:state.annual?.receipts.filter(r=>r.year===state.year).at(-1)?.text,
    act:(index:number)=>{
      const option=choices[index]
      const command={...option,year:state.year,id:JSON.stringify([state.year,option.kind,option.target,option.subject])}
      set(current=>submitAnnual(current,command).state)
    },
    end:()=>set(life.endActionYear)
  } : undefined
  const style = { '--ink': ['#645039', '#634858', '#315c54'][observation.regionIndex] } as React.CSSProperties
  return <main style={style}>
    <PlayerView key={generation} observation={observation} annual={annual}
      confirm={name => set(life.confirmName(state, name))}
      choose={action => set(life.decide(state, action))}
      advance={() => set(life.nextPlayableYear(state))}
      skip={() => set(annual ? life.skip(state) : life.skipToChoice(state))}
      restart={() => set(fresh())}
    />
    {import.meta.env.DEV && <Debug state={state} generate={seed => {
      set(life.generate(seed))
      resetForm(generation + 1)
    }} />}
  </main>
}
createRoot(document.getElementById('root')!).render(<App />)
