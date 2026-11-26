// Optional local acceptance harness. Supply an installed Playwright module and browser.
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createServer, preview } from 'vite'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const dev = await createServer({server:{host:'127.0.0.1',port:0}})
await dev.listen()
const prod = await preview({preview:{host:'127.0.0.1',port:0}})
const local = server => 'http://127.0.0.1:' + server.httpServer.address().port
const modes = {development:local(dev), production:local(prod), offline:pathToFileURL(resolve('PLAY.html')).href}

async function play(mode, url) {
  const browser = await chromium.launch({
    executablePath:process.env.CHROMIUM_PATH || undefined,
    args:process.env.CHROMIUM_ARGS ? JSON.parse(process.env.CHROMIUM_ARGS) : [],
  })
  try {
    const page = await browser.newPage()
    page.setDefaultTimeout(5000)
    const errors = [], network = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('request', req => { if (/^https?:/.test(req.url())) network.push(req.url()) })
    if (mode === 'offline') await page.context().setOffline(true)
    // Production exposes no seed control. Fix only the browser entropy used at birth.
    if (mode !== 'development') await page.addInitScript(() => {
      const original = crypto.getRandomValues.bind(crypto)
      crypto.getRandomValues = array => {
        if (array instanceof Uint32Array && array.length === 1) { array[0]=1; return array }
        return original(array)
      }
    })
    await page.goto(url)
    const button = name => page.getByRole('button',{name,exact:true})
    const debug = page.locator('summary').filter({hasText:'开发者调试'})
    if (mode === 'development') {
      await debug.click()
      await page.getByLabel('指定种子').fill('1')
      await button('按种子生成').click()
      await debug.click()
    } else assert.equal(await debug.count(),0)
    await page.getByRole('heading',{name:'初生'}).waitFor()
    assert.ok(await button('落名，开始此生').isDisabled())
    await page.getByPlaceholder('输入名').fill('宁')
    await button('落名，开始此生').click()
    await page.locator('summary').filter({hasText:'查看家计'}).click()
    await page.getByText(/荷包 .*个人契债/).waitFor()
    await page.locator('summary').filter({hasText:'亲属'}).click()
    await page.getByText('居于出生之家·未婚').waitFor()
    await button('过一年').click()
    await page.locator('section > small').filter({hasText:/·\s*1 岁/}).waitFor()
    const decisions = []
    let married = false, widowed = false
    while (decisions.length < 100) {
      if (await button('行至下一次抉择').count()) await button('行至下一次抉择').click()
      const skipOptional = button('略过主动行动，行至下次事件')
      if (await skipOptional.count()) await skipOptional.click()
      if (await page.getByRole('heading',{name:/此生终章/}).count()) break
      const age = Number((await page.locator('section > small').first().innerText()).match(/(\d+) 岁/)[1])
      const choice = page.locator('article button').first()
      decisions.push([age,await choice.innerText()])
      assert.equal(await button('过一年').count(),0)
      await choice.click()
      const visible = await page.locator('body').innerText()
      assert.doesNotMatch(visible,/legacyKeys|towardPlayer|vulnerability|回看此生/)
      if (age === 34) married = visible.includes('与姻亲同住·已婚')
      if (age === 67) widowed = visible.includes('与姻亲同住·丧偶')
    }
    await page.getByRole('heading',{name:'此生终章 · 享年 74'}).waitFor()
    await page.getByRole('heading',{name:'回看此生'}).waitFor()
    assert.match(await page.locator('body').innerText(),/史记/)
    assert.equal(await button('行至下一次抉择').count(),0)
    assert.equal(decisions.length,21)
    assert.deepEqual(decisions.slice(0,2),[[5,'照着绕一个结'],[7,'沿途认一认下回该走的岔路']])
    assert.deepEqual(decisions.find(([age])=>age===15),[15,'请求随师识字'])
    assert.ok(married && widowed)
    await button('另起一生').click()
    await page.getByRole('heading',{name:'初生'}).waitFor()
    assert.ok(await button('落名，开始此生').isDisabled())
    assert.deepEqual(errors,[])
    if (mode === 'offline') assert.deepEqual(network,[])
    console.log(JSON.stringify({mode,browser:browser.version(),decisions,married,widowed,death:74,restart:true,errors,httpRequests:network.length}))
    return decisions
  } finally { await browser.close() }
}

try {
  let reference
  for (const [mode,url] of Object.entries(modes)) {
    const decisions = await play(mode,url)
    if (reference) assert.deepEqual(decisions,reference)
    reference = decisions
  }
} finally {
  await dev.close()
  await new Promise(resolve => prod.httpServer.close(resolve))
}
