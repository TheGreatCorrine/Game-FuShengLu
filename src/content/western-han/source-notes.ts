// Editorial context only. No simulation, observation or NPC-knowledge dependency.
type SourceNote = {
  scenes: readonly string[]
  source: string
  reference: string
  url: string
  period: string
  classification: 'documented fact' | 'contextual historical evidence' | 'fictionalized interpretation'
  note: string
  applicability: string
}

export const sourceNotes: readonly SourceNote[] = [{
  scenes: ['wedding','weddingReply'],
  source: '《汉书》', reference: '卷二《惠帝纪》，六年条',
  url: 'https://www.donglishuzhai.net/chapter/814.html',
  period: '西汉惠帝六年',
  classification: 'contextual historical evidence',
  note: '惠帝六年记有十五岁以上至三十岁女子未嫁的赋税规定。',
  applicability: '此条只说明惠帝时的制度干预。武帝时期人物的婚议、约期及对话均为演绎；本条不能证明其时仍施行同一规定，也不足以推定实际初婚年龄。',
}, {
  scenes: ['arrangements'],
  source: 'Anne Behnke Kinney, Husbands and Wives in Qin and Han-Dynasty Bamboo Legal Texts',
  reference: 'Journal of Chinese History 6 (2022), 225–245',
  url: 'https://doi.org/10.1017/jch.2021.23',
  period: '秦至汉初，张家山简牍所见制度及个案',
  classification: 'contextual historical evidence',
  note: '作者从法律和案例讨论妻、寡妇与户主的权利，提示家内权威因人和境况而异。',
  applicability: '不能给出武帝时某户的婚礼报价、议亲程序、当事人的同意概率或照护年限。',
}, {
  scenes: ['arrangements'],
  source: '《浮生录》婚议设计',
  reference: 'Phase 2B.2-B',
  url: 'docs/design/12_MARRIAGE_ARRANGEMENTS_STAGE_B.md',
  period: '西汉武帝时期模拟场景',
  classification: 'fictionalized interpretation',
  note: '六钱常礼、两钱简礼、亲人补差和一年照护均为可审查的游戏设定。',
  applicability: '金额、选择及概率没有作为物价史料或西汉人口统计使用。',
}]
