"""Summarize newline-delimited output from phase2a1.mjs. Read from stdin."""
import sys,json
from collections import Counter
from statistics import median,quantiles
rows=[json.loads(line) for line in sys.stdin]
def med(xs):
    values=list(xs)
    return median(values) if values else '—'
def pct(a,b): return f'{100*a/b:.1f}%' if b else '—'
def table(header, rows):
    for row in [header,['---']*len(header),*rows]: print('| '+' | '.join(map(str,row))+' |')
    print()
print('# 固定种子诊断\n\nquality0–599，每种策略复用同一批出生。年龄快照为当岁决策后仍存活者。金额单位为游戏钱。初婚年龄仅计实际成婚者。\n')
for policy in dict.fromkeys(r['policy'] for r in rows):
    group=[r for r in rows if r['policy']==policy]
    print('## '+policy+'\n')
    t=[]
    for age in ['5','15','25','40','60']:
        a=[r['ages'][age] for r in group if age in r['ages']]
        t.append([age,len(a),pct(sum(x[1]>0 for x in a),len(a)),quantiles([x[0]-x[1] for x in a],n=4),med(x[5] for x in a),med(x[6] for x in a)])
    table(['年龄','存活','家户负债','现金减欠账 Q1/中位/Q3','识字技能中位','实作中位'],t)
    t=[]
    for label,subset in [('全部',group)]+[(s,[r for r in group if r['sex']==s]) for s in ['女','男']]+[(s,[r for r in group if r['origin']==i]) for i,s in enumerate(['自耕','佃作','行商','吏员'])]:
        elig=sum('eligible' in r for r in subset)
        p=[r['proposals'][0] for r in subset if r['proposals']]
        m=[r['unions'][0] for r in subset if r['unions']]
        a=[r['ages']['25'] for r in subset if '25' in r['ages']]
        t.append([label,elig,len(p),med(p),sum(len(r['attempts'])-len(r['unions']) for r in subset),len(m),pct(len(m),elig),med(m),pct(sum(x[1]>0 for x in a),len(a)),pct(sum(x[4]=='学成' for x in a),len(a))])
    table(['组','活到可婚','曾收提议','首议中位岁','回帖失败次数','曾婚','曾婚/可婚','初婚中位岁','25岁负债','25岁学成'],t)
    episodes=sum(r['episodes'] for r in group)
    print('同户欠账段共 %s 段，期间还清 %s 段。每人最长欠账段中位 %s 年。丧偶 %s 次，再婚 %s 次。死亡年龄十分位/中位/九十分位 %s。'% (episodes,sum(r['recovered'] for r in group),med(r['longest'] for r in group),sum(r['widowed'] for r in group),sum(max(0,len(r['unions'])-1) for r in group),[quantiles([r['death'] for r in group],n=10)[i] for i in (0,4,8)]))
    print('\n每生中位数：病年 %s，健康低于35的年数 %s，年度职业变动 %s，有至少两个选项的决定 %s，见过不同事件 %s。无病亲事件 %s，重复动作 %s。\n'%tuple([med(r[k] for r in group) for k in ('ill','incapacity','changes','choices')]+[med(len(r['events']) for r in group),sum(r['invalid'] for r in group),sum(r['duplicates'] for r in group)]))
    a=[(r,r['ages']['40']) for r in group if '40' in r['ages']]
    for label,f in [('有少老家属',lambda r,x:x[7]>0),('无少老家属',lambda r,x:x[7]==0),('健康低于35',lambda r,x:x[8]<35),('其余健康',lambda r,x:x[8]>=35),('迁离出生户',lambda r,x:x[11]!='birth'),('仍居出生户',lambda r,x:x[11]=='birth'),('资质下四分之一',lambda r,x:r['talent']<.25),('资质上四分之一',lambda r,x:r['talent']>=.75)]:
        xs=[x for r,x in a if f(r,x)]
        print(f'- 40岁{label}（n={len(xs)}）：家户年收入中位 {med(x[9] for x in xs)}，欠账比例 {pct(sum(x[1]>0 for x in xs),len(xs))}，学成比例 {pct(sum(x[4]=="学成" for x in xs),len(xs))}。')
    print()
