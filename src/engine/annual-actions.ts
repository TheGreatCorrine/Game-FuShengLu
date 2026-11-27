import { meetTrader, traderChoices, visitTrader, settleTrader } from './employer.ts'
import { eligible, bindCandidate } from '../content/western-han/events.ts'
import { marriageSummary } from './people.ts'
import { rules } from '../data.ts'
import { date } from '../content/western-han/date.ts'
import { authority } from './legal.ts'
import { currentCandidate, keyFor } from './domain.ts'
import { protagonist, type Life, type Relative } from './people.ts'
import { random } from './rng.ts'

type Kind = 'introduction' | 'inquiry' | 'interview'
export type ActionChoice = { kind: Kind; target: string; subject: string; label: string }
export type AnnualCommand = Pick<ActionChoice,'kind'|'target'|'subject'> & { id:string; year:number }
type Receipt = AnnualCommand & { accepted:boolean; text:string; candidate?:string }
export type Interview = { employer:string; job:string; year:number; until:number; status:'open'|'attended'|'expired'|'interrupted' }
export type ActionYear = { year:number; closed:boolean; receipts:Receipt[]; interviews:Interview[] }

export function actionsLeft(s: Life) {
  const a=s.annual
  return a && a.year===s.year && !a.closed ? 2-a.receipts.filter(r=>r.year===s.year).length : 0
}
export function annualPhase(s: Life) {
  if (protagonist(s).dead) return 'dead'
  if (s.pending) return 'event'
  if (actionsLeft(s)>0) return 'actions'
  return 'finished'
}
function reachable(s:Life, id:string): Relative | undefined {
  const n=s.people[id]
  if(n?.kind==='relative' && n.alive && n.house===protagonist(s).residence && n.age>=18 && !n.acute && n.health>=35) return n
}
export function openActionYear(s:Life) {
  const p=protagonist(s)
  if (s.annual?.year===s.year || (!s.annual && (p.dead || p.age<18))) return
  const a=s.annual ??= {year:s.year,closed:false,receipts:[],interviews:[]}
  a.year=s.year
  a.closed=p.dead
  settleInterviews(s)
}
export function settleInterviews(s:Life) {
  const p=protagonist(s)
  for(const o of s.annual?.interviews??[]){
    if(o.status!=='open') continue
    const person=s.people[o.employer]
    if(person?.kind==='contact') { settleTrader(s,person,o); continue }
    if(p.dead || !reachable(s,o.employer)) o.status='interrupted'
    else if(s.year>o.until) o.status='expired'
    else continue
    s.chronicle.push({age:p.age,year:s.year,text:o.job+(o.status==='expired'?'的面谈已过约期。':'的面谈因人事变动未能成行。')})
  }
}
export function introductionConstraint(s:Life) {
  if(s.candidateId) return '已有议亲对象，须先等这桩事有结果。'
  const p=protagonist(s), status=marriageSummary(s)
  if(status==='married' || status==='remarried') return '已有配偶。'
  if(p.age<rules.marriageAge || p.age>(status==='widowed'?rules.family.widowAgeLimit:34)) return '眼下不在可请家人引见的年岁。'
  if(!eligible(s).some(e=>e.id==='wedding')) return '上一次议亲后，家人还要再等些时候。'
  return ''
}

// A known co-resident who works this trade acts as the hiring contact at the local market.
function trades(s:Life,n:Relative) {
  const p=protagonist(s), jobs:string[]=[]
  if(n.work==='耕作'){
    if(p.home===1) jobs.push('帮佃户运租粮')
    else if(s.env.harvest>=0.9) jobs.push('帮忙分拣谷种')
  }
  if(n.work==='贩运'){
    jobs.push('照看货担')
    if(p.home===2 && p.practice>=2) jobs.push('替熟客核货')
  }
  if(n.work==='织作') jobs.push('整理布匹')
  if(n.work==='文书' && (p.training==='学成' || p.skill>=3)) jobs.push('抄写货单')
  if(n.work==='文书' && p.home===3) jobs.push('向书铺送简')
  return jobs
}
export function availableActions(s:Life): ActionChoice[] {
  if(annualPhase(s)!=='actions') return []
  const p=protagonist(s), a=s.annual!, offers:ActionChoice[]=[]
  const head=authority(s,p.residence)
  const intro=!introductionConstraint(s)
  const situation=p.residence+'/'+(s.households[p.residence].debt>0?'debt':'clear')
  for(const id of s.residentOrder){
    const n=reachable(s,id)
    if(!n) continue
    const named=n.role+' '+n.name
    if(intro && (head===id || (head===s.playerId && s.parentIds[p.id].includes(id))) &&
      !a.receipts.some(r=>r.kind==='introduction' && r.target===id && (r.year===s.year || (!r.accepted && r.subject===situation))))
      offers.push({kind:'introduction',target:id,subject:situation,label:'托'+named+'引见'})
    if(p.acute || p.health<35 || s.careYear===s.year) continue
    for(const o of a.interviews.filter(o=>o.employer===id && o.status==='open' && o.until>=s.year))
      offers.push({kind:'interview',target:id,subject:o.job,label:'去本地集市面谈：'+o.job+'（'+n.name+'，'+date(o.until)+'年底前）'})
    for(const job of trades(s,n)){
      if(a.interviews.some(o=>o.employer===id && o.job===job && o.status==='open') ||
        a.receipts.some(r=>r.year===s.year && r.target===id && r.kind==='inquiry' && r.subject===job)) continue
      offers.push({kind:'inquiry',target:id,subject:job,label:'随'+named+'到本地集市问工：'+job})
    }
  }
  return offers.concat(traderChoices(s))
}
export function submitAnnual(s:Life,c:AnnualCommand): {state:Life;result:Readonly<Receipt>} {
  const saved=s.annual?.receipts.find(r=>r.id===c.id)
  if(saved){
    if(saved.year!==c.year || saved.kind!==c.kind || saved.target!==c.target || saved.subject!==c.subject)
      throw Error('行动标识已用于另一项请求')
    return {state:s,result:{...saved}}
  }
  if(!c.id.trim() || c.year!==s.year || !availableActions(s).some(o=>o.target===c.target && o.kind===c.kind && o.subject===c.subject))
    throw Error('这项行动已不可用')
  const state=structuredClone(s), a=state.annual!, p=protagonist(state)
  const person=state.people[c.target]
  let accepted=true, text=''
  if(person.kind==='contact') {
    const visit=visitTrader(state,person,c)
    accepted=visit.accepted
    text=visit.text
  }else {
    const n=reachable(state,c.target)!
    const draw=random(state.seed,['annual',c.year,c.kind,keyFor(state,n.id),c.subject].join('/'))
    if(c.kind==='introduction'){
      accepted=draw<0.45+0.25*state.towardPlayer[n.id].trust
      if(accepted){
        bindCandidate(state)
        const candidate=currentCandidate(state)!
        candidate.money=0
        state.pending='wedding'
        state.wedding.state='attempted'
        text=n.name+'替你约到'+candidate.name+'，你们还得各自拿主意。'
      }else text=n.name+(state.households[p.residence].debt?'说家里还欠着钱，想先料理家计。':'说眼下没有合适的人可介绍。')
    }else if(c.kind==='inquiry'){
      accepted=draw<0.6
      if(accepted) a.interviews.push({employer:n.id,job:c.subject,year:s.year,until:s.year+1,status:'open'})
      text=n.name+(accepted?'约你最迟明年年底到集市面谈「'+c.subject+'」，届时再议。':'说「'+c.subject+'」眼下已有人手，今年不再招人。')
    }else{
      const o=a.interviews.find(o=>o.status==='open' && o.employer===n.id && o.job===c.subject)!
      o.status='attended'
      text='你依约和'+n.name+'谈了「'+o.job+'」的活计，尚未约定开工或工钱。'
    }
    if(c.kind==='interview') text+=meetTrader(state,n,c.subject)
  }
  const result:Receipt={...(c.kind==='introduction' && accepted ? {candidate:state.candidateId!} : {}),id:c.id,year:c.year,kind:c.kind,target:c.target,subject:c.subject,accepted,text}
  a.receipts.push(result)
  state.chronicle.push({age:p.age,year:s.year,text,actors:[p.id,c.target]})
  return {state,result:{...result}}
}
