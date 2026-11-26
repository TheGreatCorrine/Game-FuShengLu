import { useState } from 'react'
import type { Action } from './data.ts'
import type { PlayerObservation } from './engine/observation.ts'

type Props = {
  annual?: { year:number; left:number; choices:string[]; constraint:string; last?:string; act:(index:number)=>void; end:()=>void }

  observation: PlayerObservation
  confirm: (name:string) => void
  choose: (action:Action) => void
  advance: () => void
  skip: () => void
  restart: () => void
}
export function PlayerView({observation:s, confirm, choose, advance, skip, restart, annual}: Props) {
  const [name, rename] = useState('')
  const [selection, select] = useState<{year:number;label:string}|null>(null)
  const chosen = annual && selection?.year===annual.year ? annual.choices.indexOf(selection.label) : -1
  return (
    <>
      <header>
        <h1>浮生录</h1>
        <span>
          {s.dynasty}　/　{s.region}
        </span>
      </header>
      {s.phase === 'birth' ? (
        <section>
          <h2>初生</h2>
          <label>
            朝代　
            <select>
              <option>{s.period}</option>
            </select>
          </label>
          <p>
            {s.birth}，你生于{s.region}一户{s.origin}。家中姓
            {s.surname}，添了一个{s.sex === '女' ? '女儿' : '儿子'}。
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (name.trim()) confirm(name)
            }}
          >
            <label>
              取名　{s.surname}{' '}
              <input
                value={name}
                maxLength={8}
                placeholder="输入名"
                onChange={(e) => rename(e.target.value)}
              />
            </label>
            <button disabled={!name.trim()}>落名，开始此生</button>
          </form>
          <small>落名后不可改。刷新页面将另起一生。</small>
        </section>
      ) : (
        <>
          <section>
            <small>
              {s.year}　·　{s.age} 岁
            </small>
            <h2>{s.surname + s.name}</h2>
            <p>
              {s.sex}　·　{s.origin}　·　{s.work}　·　{s.legal}
            </p>
            <p>
              身体
              {s.condition}｜　{s.resources}
            </p>
            <details><summary>查看家计</summary><p>荷包 {s.purse} 钱　｜　家中 {s.cash} 钱　｜　家户欠债{' '}
              {s.debt} 钱　｜　个人契债 {s.personalDebt} 钱</p></details>
            {s.scene ? (
              <article>
                <small>人生抉择</small>
                <h3>{s.scene.title}</h3>
                {s.scene.body
                  .split('\n')
                  .map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                {s.scene.choices.map(([label, a]) => (
                  <button key={a} onClick={() => choose(a)}>
                    {label}
                  </button>
                ))}
              </article>
            ) : annual ? (
              <article>
                <h3>今年的打算 · 还可行动 {annual.left} 次</h3>
                {annual.last && <p>{annual.last}</p>}
                {annual.constraint && <p>{annual.constraint}</p>}
                {chosen<0 ? annual.choices.map(label=><button key={label} onClick={()=>select({year:annual.year,label})}>{label}</button>) :
                  <><p>{annual.choices[chosen]}。实际提出请求或赴约用一次行动。</p>
                    <button onClick={()=>{select(null);annual.act(chosen)}}>确定前往</button>
                    <button onClick={()=>select(null)}>再想想</button></>}
                {!annual.choices.length && <p>眼下没有可托付的人或可赴的约。</p>}
                <button onClick={annual.end}>结束本年行动</button>
                <button onClick={skip}>略过主动行动，行至下次事件</button>
              </article>
            ) : !s.dead ? (
              <>
                <button onClick={advance}>过一年</button>
                <button onClick={skip}>行至下一次抉择</button>
              </>
            ) : (
              <h3>此生终章 · 享年 {s.age}</h3>
            )}
          </section>
          {s.ending && (
            <section>
              <h2>回看此生</h2>
              <p>
                出生于{s.region}。
                {s.age >= 15 ? '晚近的生计：' + s.work + '。' : '年幼离世。'}
                {s.ending.training && '十五岁以后，你走过的路：' + s.ending.training + '。'}
              </p>
              {s.ending.history.map((text, i) => <p key={i}>{text}</p>)}
              {s.ending.turns
                .map((e, i) => (
                  <p key={i}>
                    {e.age} 岁　{e.text}
                  </p>
                ))}
            </section>
          )}
          {(
            [
              ['当地见闻', s.news],
              ['人生纪事', s.chronicle],
            ] as const
          ).map(([title, rows]) => (
            <section key={title}>
              <h2>{title}</h2>
              {rows.length ? (
                [...rows].reverse().map((e, i) => (
                  <p key={i}>
                    <small>{e.age} 岁</small>　{e.text}
                  </p>
                ))
              ) : (
                <p>这一年尚无记事。</p>
              )}
            </section>
          ))}
          <details>
            <summary>亲属 · {s.relatives.length}</summary>
            <p>
              {s.residence}·{s.marriage}
            </p>
            {s.relatives.map((n) => (
              <p key={n.id}>
                {n.sameHouse ? '同户' : '另户'}　{n.role}　{n.name}
                　{n.age} 岁　
                {n.activity}　{n.memory}
              </p>
            ))}
          </details>
        </>
      )}
      <footer>
        <button onClick={() => { restart(); rename('') }}>另起一生</button>
      </footer>
    </>
  )
}
