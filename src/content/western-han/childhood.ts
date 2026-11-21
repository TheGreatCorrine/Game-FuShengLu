import { account } from '../../engine/accounts.ts'
import { keyFor, player, residents, type Game, type Person } from '../../engine/domain.ts'
import { random } from '../../engine/rng.ts'
import type { Action, Scene } from './catalog.ts'

type Lesson = 'hands' | 'letters' | 'company'
type Option = [label: string, lesson: Lesson, result: string]
type ChildhoodScene = Scene & {
  requirement: (s: Game, n: Person) => boolean
  outcomes: [Option, Option]
}

function scene(id: string, min: number, max: number, title: string, body: string,
  first: Option, second: Option, requirement: ChildhoodScene['requirement'] = () => true): ChildhoodScene {
  return {id, min, max, title, body, requirement, outcomes:[first,second], weight:1,
    choices:[[first[0],'childFirst'],[second[0],'childSecond']]}
}
export const childhoodScenes = [
  scene('childCord',4,6,'一截短绳','把短绳绕在指上，又松开一个结让你瞧。',
    ['照着绕一个结','hands','你拆了三回，总算把两头系在一起。'],['请对方把手伸过来，一人拉一头','company','你们把绳绷成一张小弓，约好下回还这样玩。']),
  scene('childStones',4,6,'席上的石子','拨来几颗石子，在席边空出一块地方。',
    ['拿小石子摆出家门前的路','hands','你把门槛也摆了出来，自己走了一遍才挪对位置。'],['藏起一颗，让对方猜','company','你摊开空手逗人猜，笑声把门外的人也招来了。']),
  scene('childReeds',4,6,'水边的苇叶','带你在浅水边挑苇叶，有的已经裂了口。',
    ['把完整的叶子拢齐','hands','你摸出叶边的豁口，把扎手的一片剔了出去。'],['挑两片叶子一起放入水沟','company','两片叶子一前一后漂过桥脚，你们追着看了好远。'],s => s.region === 2),
  scene('childEar',7,10,'席边拣谷','把晒过的谷穗铺开，叫你先拣一小把。',
    ['捻开谷粒，分出空壳','hands','你把轻重两堆推开，抓错的几穗又亲手分了一遍。'],['同家人轮流拣，让对方歇手','company','你接过还没拣完的那一捧，让家人松了松手腕。'],s => player(s).home < 2),
  scene('childBundle',7,10,'货担上的结','解下货担，让你看松结和紧结各系在什么地方。',
    ['重新绑好容易滑落的那包','hands','货包提起又放下，直到绳头不再打滑。'],['替家人认清谁来取哪一包','company','你挨个认了来人，下次再遇见也喊得出称呼。'],s => player(s).home === 2),
  scene('childSlip',7,10,'用过的木简','翻出一枚旧简，用指尖在席上写了自己的姓。',
    ['请对方慢些，在地上照着写','letters','你把姓写歪了两次，第三回终于认出了原样。'],['请对方讲讲简上这个人的来历','company','你记住了名字，也记住家人说起故人时忽然放轻的声音。'],
    (s,n) => player(s).home !== 1 && account(s).cash >= 3 && n.goal === '授业' && n.age >= 15),
  scene('childVisit',7,10,'门口的约','要去邻家还一只借来的篮子，问你愿不愿同行。',
    ['沿途认一认下回该走的岔路','hands','回来时换你引路，路口的槐树成了记号。'],['把篮子递给主人，留下听一会儿','company','你听完了两家借篮子的缘由；往后路过，也愿先打招呼。']),
  scene('childMeasure',11,14,'空斗的分量','让你试着用空斗平量一小堆粮。多刮一下，斗口便露了底。',
    ['一斗斗重来，把两次的数对上','hands','你校过两回，分清了手慢和量错的差别。'],['请家人执斗，自己照应接粮的人','company','有人漏接，你先扶正了袋口，这回配合得齐整。']),
  scene('childList',11,14,'抹去的那一笔','找出旧简上几行残字，问你能否从头辨认。',
    ['试着补出认得的字','letters','你辨出了旧字，把容易认混的一笔单独记下。'],['请家人说出意思，替人传话','company','你复述一遍，直到家人点头才肯出门。'],
    (s,n) => !!lessonWith(s,n.id,'letters')),
  scene('childRepair',11,14,'散开的篮底','把裂开的提篮翻过来，给你留了个坐处。',
    ['接过篾条，自己补完','hands','你拆掉最松的一圈，重新压紧，提篮终于承得住东西。'],['按住篮沿，让家人腾出两手','company','你们各守一头，终于把散开的篮底收了回去。'],
    s => account(s).debt > 0 || account(s).cash < 25),
  scene('childErrand',11,14,'托给你的话','要你把口信带去邻家，特意顿了一下，等你自己开口。',
    ['把要办的几件事排好次序','hands','对方临时改了约，你照着次序办完才回去复命。'],['先问清对方近况，再传口信','company','回来时你还带着邻人的一句问候，家人留心听完。'],
    (s,n) => !!lessonWith(s,n.id,'company')),
]
const scenesById = new Map(childhoodScenes.map(e => [e.id,e]))
export const childhoodScene = (id: string) => scenesById.get(id)

function lessonWith(s: Game, id: string, lesson: Lesson) {
  return s.ledger.find(e => e.fact === 'childhood/'+lesson && e.actors?.[1] === id)
}
export function companion(s: Game, id: string) {
  const scene = childhoodScene(id)
  if (!scene) return
  const p = player(s)
  return residents(s).filter(n => n.alive && !n.acute && n.house === p.residence &&
    n.age >= Math.max(5,p.age) && scene.requirement(s,n))
    .sort((a,b) => random(s.seed,id+keyFor(s,a.id)) - random(s.seed,id+keyFor(s,b.id)))[0]
}
export function childhoodPause(s: Game, pool: Scene[]) {
  const age = player(s).age
  if (age < 4 || age > 14) return
  // One early interaction, then two separate windows in each later band.
  const start = age <= 6 ? 4 : age <= 8 ? 7 : age <= 10 ? 9 : age <= 12 ? 11 : 13
  if (age !== start + Math.floor(random(s.seed,'childhood/window/'+start)*(start===4?3:2))) return
  const options = pool.filter(e => scenesById.has(e.id))
  const score = (id: string) => random(s.seed,'childhood/scene/'+age+'/'+id)
  return options.sort((a,b) => score(a.id)-score(b.id))[0]?.id
}
export function preparation(s: Game, lesson: 'letters' | 'hands') {
  const p = player(s)
  // A recent lesson with somebody still present can become an introduction.
  for (let i=s.ledger.length-1; i>=0; i--) {
    const entry = s.ledger[i]
    if (entry.age < 7) continue
    if (entry.fact !== 'childhood/'+lesson) continue
    const mentor = residents(s).find(n => n.id === entry.actors?.[1] && n.alive &&
      !n.acute && n.house === p.residence && n.age >= 15)
    if (mentor) return {mentor,entry}
  }
}
export function preparedChoice(s: Game): [string, Action][] {
  const choices: [string, Action][] = []
  const reader = preparation(s,'letters'), worker = preparation(s,'hands')
  if (reader) choices.push(['拿旧字请'+reader.mentor.name+'指点，试着随师习读','childStudy'])
  if (worker) choices.push(['请'+worker.mentor.name+'带着做熟悉的活','childCraft'])
  return choices
}

export function childhoodNote(s: Game): string | undefined {
  const p = player(s)
  if (p.age >= 1 && p.age <= 3) {
    const kin = residents(s).filter(n => n.alive && !n.acute && n.house === p.residence && n.age >= 8)
    const n = kin[Math.floor(random(s.seed,'childhood/care/'+p.age)*kin.length)]
    if (!n) return
    if (p.age === 1) return p.acute ? n.name+'把你抱在膝上。你难受得睡不稳，醒来时那只手还托着你。' : n.name+'伏在席边喊你。你扶着那只手坐稳，伸手去摸衣襟上的结。'
    if (p.age === 2) return n.name+['收起晒粮的草席。你把漏下的一粒粟攥了许久。','蹲在门边补篮，你也把掉下的一根篾条往回递。','从货担解下一小段绳。你拖着它，总想跟着出门。','把一枚木简移开。你还记得它敲在案上的声音。'][p.home]
    return n.name+'听见你隔着门叫人，故意只应一声。你照着那声音，又清清楚楚喊了一遍。'
  }
  if (p.age === 40) {
    const turn = s.ledger.find(e => e.cause === 'turn' &&
      (e.decision?.endsWith(':childStudy') || e.decision?.endsWith(':childCraft')))
    if (turn) {
      const mentor = residents(s).find(n => n.id === turn.actors?.[1])
      if (!mentor) return
      const path = turn.decision!.endsWith(':childCraft') ? '接过了手上的活'
        : turn.fact === '习读' ? '得以随师认字' : '提了习读的心愿，那年却没能入学'
      return '如今'+p.work+'，你还记得十五岁那次商量：'+mentor.name+'提起你小时候学过的东西，你'+path+'。'
    }
  }
}
