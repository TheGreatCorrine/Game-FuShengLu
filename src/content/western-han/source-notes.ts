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
}]
