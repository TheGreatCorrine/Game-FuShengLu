import { account } from './accounts.ts'
import { canonical, clearCandidate, currentCandidate, keyFor, parentsOf, partnerOf, player, playerId, residents, type Game } from './domain.ts'
import { helpChance, joinFamily, remember } from './family.ts'
import { authority, outstanding } from './legal.ts'
import { appointment, conclude, hasReply, releaseCandidate, willing } from './negotiations.ts'
import { marriageSummary } from './people.ts'
import { rules } from '../data.ts'
import { random } from './rng.ts'
import type { MarriageAgreement } from './types.ts'

export function agreement(s: Game) {
  const row=s.negotiations?.at(-1)
  return row?.agreement && !row.agreement.closed ? row.agreement : undefined
}
function parties(s: Game) {
  const candidate=currentCandidate(s), p=player(s)
  if (!candidate?.alive || candidate.age < rules.marriageAge || p.dead || partnerOf(s,playerId(s)) || partnerOf(s,candidate.id))
    throw Error('Marriage requires living, unpartnered participants')
  return candidate
}
// Both an introduction and a scheduled reply enter through this operation.
export function acceptMarriage(s: Game, discuss: boolean) {
  const n=parties(s)
  if (appointment(s)) throw Error('Still waiting for a reply')
  if (agreement(s)) throw Error('Marriage already agreed')
  const age=player(s).age
  const status=canonical(s) ? marriageSummary(s) : s.marriage
  if (age<rules.marriageAge || age>(status==='widowed'?rules.family.widowAgeLimit:34))
    throw Error('Outside the marriage introduction window')
  const draw=random(s.seed,'weddingresult'+s.wedding.attempts)
  const reply=hasReply(s)
  if (!reply && !willing(s,n,draw)) return conclude(s,n,'refused')
  if (!reply) conclude(s,n,'willing')
  s.negotiations!.at(-1)!.agreement={since:s.year,next:s.year}
  if (!discuss && account(s).cash>=6) return celebrate(s,6)
  return n.name+'也愿成婚。'+(account(s).cash<6?'家中凑不齐六钱，':'')+'两人约定一道商量婚礼和住处。'
}
function terms(s: Game) {
  const a=agreement(s)
  if (!a || a.next>s.year || s.negotiations!.at(-1)!.person!==parties(s).id)
    throw Error('No current marriage arrangement')
  return a
}
export function careRelative(s: Game) {
  const ids=parentsOf(s,playerId(s))
  return residents(s).find(n=>ids.includes(n.id) && n.alive && n.house===player(s).residence)
}
export function arrangeCare(s: Game) {
  const a=terms(s), n=parties(s), elder=careRelative(s)
  if (!elder || a.askedCare) throw Error('No available care arrangement')
  a.askedCare=true
  const head=residents(s).find(k=>k.id===authority(s,player(s).residence))
  const draw=(id:string)=>random(s.seed,'stay/'+keyFor(s,id)+'/'+a.since)
  if (draw(n.id)>helpChance(s,n)) return n.name+'还要顾自己家里，不愿答应留在你家。婚约仍在。'
  if (head && draw(head.id)>helpChance(s,head)) return head.name+'说家里安置不开。两人商定另议住处。'
  a.careFor=elder.id
  return n.name+'同意婚后留居本户，两人约定成家后的第一年陪护'+elder.name+'。'
}
export function postponeWedding(s: Game) {
  terms(s).next=s.year+1
  return '两人把婚约留着，约好明年再议。'
}
export function celebrate(s: Game, price: 2|6, requestGift=false) {
  const a=terms(s), n=parties(s), p=player(s), book=account(s)
  if (price !== 2 && price !== 6) throw Error('Invalid ceremony price')
  const gap=Math.max(0,price-book.cash)
  if (gap && !requestGift) throw Error('Ceremony is not funded')
  if (price === 2 && a.simpleTerms !== 'accepted') {
    if (a.simpleTerms === 'declined') throw Error('Candidate declined a simple ceremony')
    const draw=random(s.seed,'simple-ceremony/'+keyFor(s,n.id)+'/'+a.since)
    // An authored preference, stable across retries and independent of either balance.
    if (draw >= 0.8 + 0.15*n.generosity) {
      a.simpleTerms='declined'
      return n.name+'说更愿依常礼成家，想等日后凑齐六钱。两人的婚约仍在。'
    }
    a.simpleTerms='accepted'
  }
  let donor
  if (gap && requestGift) {
    if (a.askedGift===s.year) throw Error('Already asked for help this year')
    a.askedGift=s.year
    const kin=residents(s).filter(k=>k.alive && k.age>=16 && k.house===p.residence)
    donor=kin.find(k=>k.money-outstanding(s,k.id)>=gap &&
      random(s.seed,'wedding-gift/'+keyFor(s,k.id)+'/'+keyFor(s,n.id)+'/'+s.year)<helpChance(s,k))
    if (!donor) return '问过家人，这回没有人能应下差额。各家的钱都没动，婚约仍在。'
  }
  const cash=price-gap
  book.cash-=cash
  if (donor) donor.money-=gap
  a.receipt={year:s.year,house:p.residence,cash,gift:gap,...(donor?{donor:donor.id}:{})}
  a.closed='married'
  a.endedYear=s.year
  joinFamily(s,n,!!a.careFor && !a.careResult)
  clearCandidate(s)
  return n.name+'与你成婚。本户出了'+cash+'钱'+(donor?'，'+donor.name+'自愿从私蓄添了'+gap+'钱':'')+'。'
}
export function endAgreement(s: Game, reason: Exclude<MarriageAgreement['closed'],'married'|undefined>) {
  const a=agreement(s), n=currentCandidate(s)
  if (!a || !n) throw Error('Missing agreed candidate')
  a.closed=reason
  a.endedYear=s.year
  return releaseCandidate(s,n,reason)
}
export function annualArrangement(s: Game) {
  const a=agreement(s), n=currentCandidate(s)
  if (!a || !n || s.year<a.next) return
  // An independent change of plans, never conditional on household cash.
  if (s.year-a.since>=2 && random(s.seed,'plans/'+keyFor(s,n.id)+'/'+s.year)<0.12)
    return endAgreement(s,'withdrawn')
  s.pending='arrangements'
  if (a.careFor && !a.careResult && !residents(s).some(k=>k.id===a.careFor && k.alive && k.house===player(s).residence)) {
    a.careResult='ended'
    return '原来约好陪护的亲人已不在本户，两人重新商量住处，婚约仍在。'
  }
}
export function fulfillCare(s: Game) {
  for (const row of s.negotiations??[]) {
    const a=row.agreement
    if (!a?.careFor || !a.receipt || a.careResult || s.year<=a.receipt.year) continue
    const elder=residents(s).find(k=>k.id===a.careFor)
    if (elder?.alive && !player(s).dead && partnerOf(s,playerId(s))===row.person && elder.house===player(s).residence) {
      remember(s,elder,'weddingCare',0.08)
      a.careResult='visited'
      return '依照婚前的约定，你们陪护了'+elder.name+'，料理家务。'
    }
    a.careResult='ended'
    return '家人境况已变，婚前约好的这次陪护未能成行。'
  }
}
