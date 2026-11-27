import { protagonist, type Life, type Relative } from './people.ts'
import type { ActionChoice, AnnualCommand, Interview } from './annual-actions.ts'
import { random } from './rng.ts'
import { date } from '../content/western-han/date.ts'

const shop = 'guanzhong-cloth-stall'
const market = '关中本地布市'
const nextShipment = '等下一批布到市'
const readList = '能读货单，或等下一批布到市'
type Outcome = 'introduced'|'applied'|'refused'|'invited'|'message'|'met'|'missed'
type Encounter = { opportunity:string; year:number; location:string; via:string; source:string;
  outcome:Outcome; text:string; condition?:string }
export type Contact = {kind:'contact'; id:string; name:string; shop:string; alive:boolean;
  location:string; history:Encounter[]}

export function employer(s:Life) {
  return Object.values(s.people).find((p):p is Contact=>p.kind==='contact' && p.shop===shop)
}
function remember(s:Life,n:Contact,origin:Pick<Encounter,'via'|'source'>,opportunity:string,outcome:Outcome,text:string,condition?:string) {
  n.history.push({via:origin.via,source:origin.source,location:market,year:s.year,opportunity,outcome,text,...(condition?{condition}:{})})
}
function notice(s:Life,n:Contact,text:string) {
  s.chronicle.push({year:s.year,age:protagonist(s).age,text,actors:[s.playerId,n.id]})
}
export function meetTrader(s:Life,guide:Relative,job:string) {
  if(s.region!==0 || !['整理布匹','照看货担'].includes(job)) return ''
  let n=employer(s)
  if(!n) {
    const id='p'+s.nextPerson
    if(Object.hasOwn(s.people,id) || Object.values(s.legacyKeys).includes(shop)) throw Error('Duplicate employer identity')
    s.nextPerson++
    n={kind:'contact',id,shop,name:'张平',alive:true,location:market,history:[]}
    s.people[id]=n
    s.legacyKeys[id]=shop
  }
  if(!n.alive || n.location!==market || n.history.some(e=>e.outcome==='introduced' && e.via===guide.id && e.source===job)) return ''
  const text=guide.name+'在'+market+'替你引见布贩'+n.name+'。'
  remember(s,n,{source:job,via:guide.id},[shop,s.year,s.legacyKeys[guide.id],job].join('/'),'introduced',text)
  return text
}
function currentRoute(s:Life,n:Contact) {
  const p=protagonist(s)
  return n.history.find(e=>{
    const guide=s.people[e.via]
    return e.outcome==='introduced' && guide?.kind==='relative' && guide.alive && guide.house===p.residence
  })
}
export function marketReachable(s:Life,n:Contact) {
  return n.alive && n.location===market && s.region===0 && Boolean(currentRoute(s,n))
}
const qualified=(s:Life)=>protagonist(s).skill>=3 || protagonist(s).training==='学成'
const shipment=(year:number)=>shop+'/lot/'+Math.floor(year/2)
export function traderChoices(s:Life):ActionChoice[] {
  const n=employer(s), p=protagonist(s)
  if(!n || !marketReachable(s,n) || p.dead || p.acute || p.health<35 || s.careYear===s.year) return []
  const open=s.annual!.interviews.find(o=>o.employer===n.id && o.status==='open')
  if(open) return s.year===open.until?[{kind:'interview',target:n.id,subject:open.job,label:'到布市赴'+n.name+'之约（'+date(open.until)+'年底前）'}]:[]
  const lot=shipment(s.year)
  const last=[...n.history].reverse().find(e=>e.outcome==='applied' && e.opportunity.startsWith(lot+'/'))
  if(last && !(qualified(s) && last.opportunity.endsWith('/搬布') && n.history.some(e=>e.opportunity===last.opportunity && e.outcome==='refused'))) return []
  const task=qualified(s)?'核货单':'搬布'
  return [{kind:'inquiry',target:n.id,subject:lot+'/'+task,label:'向布贩'+n.name+'问这批布的活：'+task}]
}
export function visitTrader(s:Life,n:Contact,c:AnnualCommand) {
  if(c.kind==='interview'){
    const o=s.annual!.interviews.find(o=>o.employer===n.id && o.job===c.subject && o.status==='open')!
    o.status='attended'
    const text=n.name+'认出你，取出上回来问的那批布的货单，和你谈过验布的规矩。'
    remember(s,n,invitation(n,c.subject),c.subject,'met',text)
    return {accepted:true,text}
  }
  const origin=currentRoute(s,n)!
  const prior=[...n.history].reverse().find(e=>e.outcome==='refused' || e.outcome==='met')
  const recall=prior?.outcome==='refused'?'上回说过「'+prior.condition+'」。':prior?'上回已经一起看过货单。':''
  remember(s,n,origin,c.subject,'applied','你当面询问这批布的活。')
  const accepted=random(s.seed,c.subject+'/vacancy')<(qualified(s)?0.65:0.35)
  const condition=qualified(s)?nextShipment:readList
  const text=n.name+'说：'+recall+(accepted?'这批布还要点验，约你'+date(s.year+1)+'到布市见面。':'这批人手已足。'+condition+'再来问。')
  remember(s,n,origin,c.subject,accepted?'invited':'refused',text,accepted?'明年到布市面谈':condition)
  if(accepted) s.annual!.interviews.push({employer:n.id,job:c.subject,year:s.year,until:s.year+1,status:'open'})
  return {accepted,text}
}
function invitation(n:Contact,opportunity:string) {
  const invite=n.history.find(e=>e.opportunity===opportunity && e.outcome==='invited')
  if(!invite) throw Error('Missing employer invitation')
  return invite
}
export function settleTrader(s:Life,n:Contact,o:Interview) {
  const p=protagonist(s), due=s.year===o.until
  let text=''
  if(p.dead || !marketReachable(s,n)) {
    o.status='interrupted'
    text='你与'+n.name+'的布市之约因失去联系而中断。'
  }else if(due && s.careYear===s.year) {
    o.status='interrupted'
    text='你要留家照护亲人，错过了与'+n.name+'约好的布市面谈。'
  }else if(s.year>o.until) {
    o.status='expired'
    text='与'+n.name+'约好的布市面谈已过期。'
  }
  if(text) {
    remember(s,n,invitation(n,o.job),o.job,'missed',text)
  }else if(due && !n.history.some(e=>e.opportunity===o.job && e.outcome==='message')){
    text=n.name+'捎话提醒：今年可依约到布市面谈。'
    remember(s,n,invitation(n,o.job),o.job,'message',text)
  }
  if(text) notice(s,n,text)
}
