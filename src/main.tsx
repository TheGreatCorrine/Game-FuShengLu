import { outstanding } from './engine/legal.ts'
import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  advance,
  confirmName,
  date,
  decide,
  eligible,
  narrative,
  participant,
  generate,
  skip,
} from './engine.ts'
import { history, homes, regions, rules, scenes } from './data.ts'
import './style.css'
const fresh = () =>
  generate(String(crypto.getRandomValues(new Uint32Array(1))[0]))
function App() {
  const [s, set] = useState(fresh),
    [name, rename] = useState(''),
    [seed, setSeed] = useState('')
  const home = homes[s.home],
    scene = eligible(s).find((e) => e.id === s.pending)
  function restart() {
    set(fresh())
    rename('')
  }
  return (
    <main
      style={
        {
          '--ink': ['#645039', '#634858', '#315c54'][s.region],
        } as React.CSSProperties
      }
    >
      <header>
        <h1>浮生录</h1>
        <span>
          {rules.dynasty}　/　{regions[s.region]}
        </span>
      </header>
      {!s.name ? (
        <section>
          <h2>初生</h2>
          <label>
            朝代　
            <select>
              <option>西汉 · 武帝时期出生</option>
            </select>
          </label>
          <p>
            {date(s.birth)}，你生于{regions[s.region]}一户{home.name}。家中姓
            {s.surname}，添了一个{s.sex === '女' ? '女儿' : '儿子'}。
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (name.trim()) set(confirmName(s, name))
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
              {date(s.year)}　·　{s.age} 岁
            </small>
            <h2>{s.surname + s.name}</h2>
            <p>
              {s.sex}　·　{home.name}　·　{s.work}　·　{rules.legal}
            </p>
            <p>
              身体
              {s.dead
                ? '已故'
                : s.acute ||
                  (s.health > 65 ? '康健' : s.health > 30 ? '尚可' : '衰弱')}
              　｜　{s.debt > 0 ? '家中尚有欠账' : s.cash < s.expenses ? '家中余钱不多' : '家中有些余钱'}
            </p>
            <details><summary>查看家计</summary><p>荷包 {s.purse} 钱　｜　家中 {s.cash} 钱　｜　家户欠债{' '}
              {s.debt} 钱　｜　个人契债 {outstanding(s, 'player')} 钱</p></details>
            {scene ? (
              <article>
                <small>人生抉择</small>
                <h3>{scene.title}</h3>
                {narrative(s, scene.id, scene.body)
                  .split('\n')
                  .map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                {scene.choices.map(([label, a]) => (
                  <button key={a} onClick={() => set(decide(s, a))}>
                    {label}
                  </button>
                ))}
              </article>
            ) : !s.dead ? (
              <>
                <button onClick={() => set(advance(s))}>过一年</button>
                <button onClick={() => set(skip(s))}>行至下一次抉择</button>
              </>
            ) : (
              <h3>此生终章 · 享年 {s.age}</h3>
            )}
          </section>
          {s.dead && (
            <section>
              <h2>回看此生</h2>
              <p>
                出生于{regions[s.region]}。
                {s.age >= 15 ? '晚近的生计：' + s.work + '。' : '年幼离世。'}
                {s.training && '十五岁以后，你走过的路：' + s.training + '。'}
              </p>
              {s.exposure.map((x) => {
                const h = history.find((e) => e.id === x.id)!
                return (
                  <p key={x.id}>
                    {date(1 - h.from)} · {h.title}（{h.source}）。
                    {x.load
                      ? '本户额外支出 ' + x.cost + ' 钱。'
                      : '此地未计入直接损失。'}
                    {x.heard ? '当年听见了地方消息。' : '当年未获消息。'}
                  </p>
                )
              })}
              {s.ledger
                .filter((e) => e.cause === 'turn')
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
            <summary>亲属 · {s.npcs.length}</summary>
            <p>
              {s.residence === 'birth'
                ? '居于出生之家'
                : s.residence === 'independent'
                  ? '已另立门户'
                  : '与姻亲同住'}
              　·　
              {
                {
                  never: '未婚',
                  married: '已婚',
                  widowed: '丧偶',
                  remarried: '再婚',
                  ended: '此生婚姻已终',
                }[s.marriage]
              }
            </p>
            {s.npcs.map((n) => (
              <p key={n.id}>
                {n.house === s.residence ? '同户' : '另户'}　{n.role}　{n.name}
                　{n.age} 岁　
                {n.alive ? n.position || n.work : '已故'}　{n.memories.at(-1)}
              </p>
            ))}
          </details>
        </>
      )}
      <footer>
        <button onClick={restart}>另起一生</button>
      </footer>
      {import.meta.env.DEV && (
        <details>
          <summary>开发者调试 · 含隐藏信息</summary>
          <input
            aria-label="指定种子"
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
          />
          <button
            onClick={() => {
              set(generate(seed))
              rename('')
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
      )}
    </main>
  )
}
createRoot(document.getElementById('root')!).render(<App />)
