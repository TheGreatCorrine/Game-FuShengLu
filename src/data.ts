import type { LegalRuleset } from './engine/legal.ts'
// Dates use positive BCE labels here. The engine clock uses astronomical years.
export const regions = ['关中', '河东', '江南'] as const
export const homes = [
  {
    name: '自耕户',
    work: '耕作',
    coins: 55,
    income: 18,
    books: 1,
    asset: '薄田',
    prestige: 2,
  },
  {
    name: '佃作户',
    work: '耕作',
    coins: 20,
    income: 15,
    books: 0,
    asset: '农具',
    prestige: 1,
  },
  {
    name: '行商之家',
    work: '贩运',
    coins: 90,
    income: 23,
    books: 2,
    asset: '货担',
    prestige: 2,
  },
  {
    name: '吏员之家',
    work: '文书',
    coins: 78,
    income: 21,
    books: 3,
    asset: '书简',
    prestige: 4,
  },
]
const legalRules: LegalRuleset = {
  id: 'western-han-wudi-provisional-v1',
  reserve: 8,
  loanSize: 8,
  term: 3,
  needsAssent: (sex, dependent, lender) =>
    dependent && lender < (sex === '女' ? 0.4 : 0.22),
  eligible: (s, id) => [
    ...(!s.dead && (id === 'father' || id === 'mother') ? ['player'] : []),
    ...s.npcs.filter((n) => n.alive && n.parents.includes(id)).map((n) => n.id),
  ],
  recover: Math.min,
  divide: (value, ids) =>
    ids.map(
      (_, i) => Math.floor(value / ids.length) + Number(i < value % ids.length),
    ),
}
export const rules = {
  dynasty: '西汉',
  legalRules,
  birthBCE: [141, 140, 139, 138],
  weights: [
    [5, 3, 2, 2],
    [5, 4, 3, 1],
    [4, 5, 2, 1],
  ],
  legal: '编户自由民',
  marriageAge: 20,
  family: {
    spacing: 3,
    chance: 0.17,
    lastParentAge: 41,
    remarryWait: 3,
    widowAgeLimit: 52,
  },
  currency: '钱',
}
export const history = [
  {
    id: 'qilian',
    from: 121,
    to: 121,
    title: '霍去病出击河西',
    source: '史记·卫将军骠骑列传',
    confidence: '纪年可考',
    load: [3, 1, 0],
    market: '西去的货车回来得迟，脚钱也涨了。',
  },
  {
    id: 'mobei',
    from: 119,
    to: 119,
    title: '漠北之战',
    source: '汉书·卫青霍去病传',
    confidence: '纪年可考',
    load: [2, 4, 0],
    market: '北路运粮吃紧，集上买粟要多付几钱。',
  },
]
export type Action =
  | 'learn'
  | 'work'
  | 'bond'
  | 'save'
  | 'marry'
  | 'career'
  | 'aid'
  | 'decline'
  | 'petition'
  | 'takeLoan'
  | 'pass'
  | 'buyTool'
  | 'payLoan'
  | 'extend'
  | 'gift'
  | 'halfDays'
  | 'split'
  | 'apprentice'
  | 'stake'
  | 'trial'
  | 'object'
  | 'medicineFee'
  | 'nurse'
  | 'pledge'
  | 'meet'
  | 'waitPlan'
  | 'trialSkill'
type Scene = {
  id: string
  min: number
  max: number
  weight: number
  title: string
  body: string
  choices: [string, Action][]
  gate?: 'books' | 'kin' | 'trained' | 'single' | 'trade'
}
const everyday: Record<string, [string, Action][]> = {
  grain: [
    ['替家人把谷拣净', 'bond'],
    ['替邻户搬粟挣工钱', 'work'],
  ],
  letters: [
    ['临写简上的字', 'learn'],
    ['替人送简挣脚钱', 'work'],
  ],
  market: [
    ['替货担领路', 'work'],
    ['回家收好家用钱', 'save'],
  ],
  loom: [
    ['替邻家绕线取酬', 'work'],
    ['先练整经的手法', 'trialSkill'],
  ],
  cart: [
    ['随车押送货担', 'work'],
    ['留下修整车具', 'trialSkill'],
  ],
  roof: [
    ['陪亲人补好漏处', 'bond'],
    ['替邻家换茅草取酬', 'work'],
  ],
  store: [
    ['替人搬运秋粮', 'work'],
    ['留下来学量谷', 'trialSkill'],
  ],
  medicine: [
    ['用五钱请人看病伤', 'medicineFee'],
    ['自己留下守候', 'nurse'],
    ['依亲人心意，让其静养', 'pass'],
  ],
  ledger: [
    ['接下核账的活', 'career'],
    ['借旧简练习校数', 'trialSkill'],
  ],
  tool: [
    ['花六钱换新器', 'buyTool'],
    ['磨好手中的旧器', 'trialSkill'],
  ],
  feast: [
    ['陪长辈坐一回', 'bond'],
    ['替人备宴挣工钱', 'work'],
  ],
  measure: [
    ['接受量谷的雇请', 'work'],
    ['观摩如何校正量器', 'trialSkill'],
  ],
  winter: [
    ['替邻人修门取酬', 'work'],
    ['修补自家门扇', 'trialSkill'],
  ],
  teach: [
    ['替乡人抄简取酬', 'work'],
    ['陪后生校读木简', 'trialSkill'],
  ],
  visit: [
    ['留下陪亲人叙旧', 'bond'],
    ['接下归途的捎货差事', 'work'],
  ],
}
export const scenes: Scene[] = [
  {
    id: 'siblingPlan',
    min: 13,
    max: 45,
    weight: 5,
    title: '手足想另过',
    body: '',
    choices: [
      ['添四钱，帮忙另立门户', 'split'],
      ['介绍织活，留家试做', 'apprentice'],
      ['请对方先攒一季', 'waitPlan'],
    ],
  },
  {
    id: 'spousePlan',
    min: 20,
    max: 70,
    weight: 7,
    title: '换一种生计',
    body: '',
    choices: [
      ['出三钱买线', 'stake'],
      ['替对方分担家务，试做一季', 'trial'],
      ['说明顾虑，请对方再想想', 'object'],
    ],
  },
  {
    id: 'studyConflict',
    min: 16,
    max: 17,
    weight: 10,
    title: '课读到一半',
    body: '',
    choices: [
      ['商量改读半日', 'halfDays'],
      ['收起书简回家做活', 'work'],
    ],
  },

  {
    id: 'personalLoan',
    min: 16,
    max: 68,
    weight: 4,
    title: '市上的借契',
    body: '手边的钱紧，你可以向市上出借的人问一笔短借。契上会写你的名字。',
    choices: [
      ['借八钱周转', 'takeLoan'],
      ['暂且作罢', 'pass'],
    ],
  },
  {
    id: 'collect',
    min: 16,
    max: 100,
    weight: 8,
    title: '借期已到',
    body: '出借人带着你的借契来核账，问今日能还多少。',
    choices: [
      ['拿私钱偿还', 'payLoan'],
      ['商量宽限', 'extend'],
    ],
  },
  {
    id: 'demand',
    min: 20,
    max: 85,
    weight: 5,
    title: '旧户的账',
    body: '来人说旧家欠了钱，要你替家里还。你看了他的账，借主写的是旧户。',
    choices: [
      ['请他找原户核账', 'pass'],
      ['自愿代还一些', 'gift'],
    ],
  },
  {
    id: 'equip',
    min: 16,
    max: 60,
    weight: 2,
    title: '置办工具',
    body: '集上有件趁手的工具，值六钱。你掂量着自己的荷包。',
    choices: [
      ['用私钱置办', 'buyTool'],
      ['先用旧的', 'pass'],
    ],
  },

  {
    id: 'letterHome',
    min: 20,
    max: 90,
    weight: 9,
    title: '家中来信',
    body: '旧家捎信，说日常用度已经接续不上。你手中的钱，能否匀出些送回去？',
    choices: [
      ['送去手头余钱', 'aid'],
      ['说明眼下难处', 'decline'],
      ['约定明年捎钱', 'pledge'],
    ],
  },
  {
    id: 'relief',
    min: 16,
    max: 85,
    weight: 6,
    title: '灯下商量',
    body: '一家的进项抵不住开销。你想同掌家的亲人商量，请对方动用私蓄。',
    choices: [
      ['开口相求', 'petition'],
      ['暂不动亲人的钱', 'decline'],
    ],
  },

  {
    id: 'turn',
    min: 15,
    max: 15,
    weight: 1,
    title: '明春的去处',
    body: '地里的活等着人手。邻家也传来消息，有人愿意带一个孩子识简记数。若去，少的那双手谁来补？',
    choices: [
      ['请求随师识字', 'learn'],
      ['留下分担生计', 'work'],
      ['早间做活，午后习字', 'halfDays'],
    ],
  },
  {
    id: 'offer',
    min: 25,
    max: 38,
    weight: 4,
    gate: 'trained',
    title: '一束待理的账简',
    body: '旧日读过的字派上了用场。里中有人托你核账，也有人劝你守着原来的生计。',
    choices: [
      ['接下账简', 'career'],
      ['守着旧业', 'work'],
    ],
  },
  {
    id: 'wedding',
    min: 20,
    max: 52,
    weight: 3,
    gate: 'single',
    title: '托人问意',
    body: '相识的人家托人来问你的意思。两家来往，日后也要共同承担开销。',
    choices: [
      ['请媒人回话', 'marry'],
      ['先同对方商量婚后用度', 'meet'],
      ['暂缓回帖', 'pass'],
    ],
  },
  ...(
    [
      [
        'grain',
        7,
        14,
        '归仓',
        '粟粒撒在席边，你想跟家人收拾，还是留下听邻人讲市上的事？',
        'kin',
      ],
      [
        'letters',
        8,
        14,
        '描字',
        '一枚废简还留着墨迹。有人愿意教你辨认。',
        'books',
      ],
      [
        'market',
        10,
        14,
        '赶集',
        '赶集的人缺个帮手，你也可以替家中看守门户。',
        '',
      ],
      [
        'loom',
        16,
        26,
        '机杼声',
        '邻家愿把空出的织机借用几日，先要备好丝线。',
        '',
      ],
      [
        'cart',
        17,
        38,
        '结伴行路',
        '一队货车在路口招人。同行能挣脚钱，家里也还有事。',
        'trade',
      ],
      [
        'roof',
        18,
        60,
        '夜雨漏屋',
        '雨水沿着椽子滴下。家人盘算着请人换草。',
        'kin',
      ],
      [
        'store',
        19,
        56,
        '秋后余粮',
        '入冬前，里中有人收粮，也有人打算多存一些。',
        '',
      ],
      [
        'medicine',
        20,
        65,
        '亲人染恙',
        '家里有人倦怠，想请你陪着歇两日。',
        'kin',
      ],
      [
        'ledger',
        22,
        57,
        '校简',
        '市上有人请你看看货账。几行数目得费些功夫。',
        'trained',
      ],
      [
        'tool',
        24,
        62,
        '修换旧器',
        '手里的旧工具磨钝了，邻人说能赊你一件。',
        '',
      ],
      ['feast', 27, 67, '亲族小聚', '族人捎话来，请你带些吃食去相聚。', 'kin'],
      [
        'measure',
        30,
        68,
        '量谷',
        '新收的谷子要过量，主人来问谁能帮上一日。',
        '',
      ],
      ['winter', 35, 72, '过冬', '风从门缝钻进来。趁天还亮，还能做件事。', ''],
      [
        'teach',
        40,
        75,
        '后生求教',
        '一个孩子拿着写歪的木简来，请你指点。',
        'trained',
      ],
      ['visit', 48, 80, '归访', '亲人想起旧事，邀你留坐半日。', 'kin'],
    ] as const
  ).map(
    ([id, min, max, title, body, gate]): Scene => ({
      id,
      min,
      max,
      title,
      body,
      weight: 1,
      gate: gate || undefined,
      choices: everyday[id],
    }),
  ),
]
