const WORLD={day:1,money:0,stamina:100,carry:0,moves:0,at:-1};
WORLD.lastForest=0;
const AXES={
  old:{id:'old',name:'使い古しの手斧',power:1.0,weight:0,price:0},
  splitter:{id:'splitter',name:'薪割り斧',power:1.5,weight:1,price:18000},
  felling:{id:'felling',name:'伐採斧',power:1.8,weight:1,price:45000},
  double:{id:'double',name:'両刃斧',power:2.2,weight:2,price:120000},
  master:{id:'master',name:'名工の斧',power:2.0,weight:0,price:400000,locked:true}
};
const GOODS={
  bento:{name:'弁当',price:800},feed:{name:'犬の餌',price:300},
  stone:{name:'砥石',price:400},wedge:{name:'楔',price:2000},
  salve:{name:'膏薬',price:1500},
  /* 山守のお香を置き換えた（ROADMAP §11.5）。
     お香は ¥3,000 で手入れ度+4/本、つまり体力20の枝打ちをお金で迂回できてしまい、
     憲法2（体力は1本の通貨）を崩していた。苗は払うものが腕前になる。 */
  sapling:{name:'苗',price:1200,locked:'sapling'}
};

/* ══════════ 犬（ROADMAP §11.7） ══════════
   3頭とも山へ連れて行け、能力も全部使える。
   ただし夜に一緒に遊べるのは1頭だけ。なつき度60で二段目が開く。
   ボーダーコリーは廃止した（役が他の3頭に配り直されている）。 */
const DOGS={
  shiba:{key:'shiba',name:'柴犬',price:40000,role:'見立ての犬',
    s1:'木の潜在性質を ◎ ○ ！ で示す。なつき度が低いとたまに間違える',
    s2:'間違えなくなる。見られる木が 16本 → 20本。依頼に合う木を吠える'},
  akita:{key:'akita',name:'秋田犬',price:70000,role:'力の犬',unlock:'akita',
    s1:'物置の保管枠 ＋6',
    s2:'保管枠 ＋10。<b class="ok">斧の重さ −1</b>（1日に伐れる本数が増える）'},
  kai:{key:'kai',name:'甲斐犬',price:90000,role:'山を読む犬',unlock:'kai',
    s1:'翌日どの林が当たりかを予報する',
    s2:'夕方に山菜・きのこを採ってくる。<b class="ok">夕方の枠を使わない</b>'}
};
const BOND_STAGE2=60;          // ここから二段目
const BOND_DOMA_CAP=59;        // 土間に入れるだけでは越えられない壁
const hasDog=k=>!!WORLD.dogs?.[k];
const dogBond=k=>WORLD.dogs?.[k]?.bond??0;
const dogStage=k=>!hasDog(k)?0:(dogBond(k)>=BOND_STAGE2?2:1);
const dogCount=()=>Object.keys(WORLD.dogs||{}).length;
const anyDog=()=>dogCount()>0;

/* 夜明けのなつき度。餌が足りなければ全頭下がる */
function advanceBonds(){
  const n=dogCount(); if(!n)return null;
  const want=WORLD.auto.feed?n:0;
  const fed=Math.min(want,WORLD.inv.feed);
  WORLD.inv.feed-=fed;
  const short=want>0&&fed<n;
  const stageUps=[];
  for(const k in WORLD.dogs){
    const d=WORLD.dogs[k];
    const before=d.bond;
    let v=before;
    if(short)v-=5;
    else{
      /* 餌と土間は放っておいても効くぶん。どちらも 59 で止まる。
         60の壁は世話でしか越えられない（ROADMAP §11.7）。
         これが「夜に一緒に遊べるのは1頭だけ」という選択を守る */
      let passive=0;
      if(fed>=n&&n>0)passive+=1;
      if(WORLD.buildings.doma)passive+=1;
      if(passive&&v<BOND_DOMA_CAP)v=Math.min(BOND_DOMA_CAP,v+passive);
    }
    /* 「遊ぶ」の +5 は選んだその場で反映済み。ここでは二重加算しない。 */
    d.bond=clamp(v,0,100);
    if(before<BOND_STAGE2&&d.bond>=BOND_STAGE2)stageUps.push(k);
  }
  const tended=WORLD.dogCare; WORLD.dogCare=null;
  return {fed,want,short,tended,stageUps};
}

/* ══════════ 乾燥（ROADMAP §11.3） ══════════
   効果は2つ。①品等が1段上がる ②家具・道具の前提になる。
   長いと計画ではなく予言になるので、依頼の期限（5〜14日）と同じ時間尺に揃えた。 */
const DRY_DAYS={sugi:7,hinoki:10,nara:14};
const nextGrade=g=>({'三等':'二等','二等':'一等','一等':'特等'}[g]||g);
const dryTotal=log=>DRY_DAYS[log.species]??10;
const dryLeft=log=>log.dried?0
  :Math.max(0,dryTotal(log)-(WORLD.day-(log.since??WORLD.day)));
function advanceDrying(){
  for(const log of WORLD.lumber||[]){
    if(log.dried)continue;
    if(log.since==null){log.since=WORLD.day;continue}
    if(WORLD.day-log.since>=dryTotal(log)){log.dried=true;log.grade=nextGrade(log.grade)}
  }
}
Object.assign(WORLD,{
  axe:'old',ownedAxes:['old'],
  inv:{bento:0,feed:0,stone:0,wedge:0,salve:0,sapling:0,sake:0},
  auto:{bento:true,feed:true},lumber:[],
  buildings:{shed:false,doghouse:false,hearth:false,workshop:false,doma:false},
  dogs:{},                // {shiba:{bond:0}, …}
  dogCare:null,           // 今夜一緒に遊んだ1頭
  travelPaidToday:[],     // 今日すでに移動体力を払った林
  mascot:null,            // 昼に映す犬
  storyFlags:{shrineResolve:false,careLesson:false,sakeMigrated:false},
  kamidana:{level:0},
  shrine:{started:false,stage:0,submitted:[[],[],[],[],[]],paid:[false,false,false,false,false]},
  ending:{completed:false,day:null,viewed:false},
  unlocks:{doghouse:false,workshop:false,miyama:false,snow:false,master:false},
  morning:{carry:0,bento:0},
  stands:{},pendingCut:null
});
/* 依頼と信用（ROADMAP §12）。同時受注は3件 */
Object.assign(WORLD,{
  requests:[],            // 受注中
  requestsDone:[],        // 達成した依頼の id
  requestsFailed:[],      // 期限切れにした依頼の id
  requestLog:[],          // 済んだこと（新しい順）
  pendingRequestResults:[], // 依頼タブでまだ見せていない達成結果
  credit:{builder:0,dealer:0,sakichi:0,owner:0,kannushi:0},
  metClients:[],          // 自己紹介を出した相手
  forestsSeen:[],         // 訪れた林の id（山の持ち主の登場条件）
  today:{fells:0,esses:0,keptKamiDay:false,essForests:[]}
});

/* ══════════ 苗（ROADMAP §11.5） ══════════
   Sを取った本数だけ、その林に植わる。夕方の枠は使わない。
   毎朝の更新は stock しか増やさないので、苗だけが maxStock を押し上げる。 */
function plantSaplings(){
  const out=[];
  for(const fid of WORLD.today.essForests||[]){
    if(WORLD.inv.sapling<1)break;
    const f=FORESTS[fid]; if(!f)continue;
    WORLD.inv.sapling--;
    f.maxStock+=1; f.stock+=1; f.care=Math.min(100,f.care+3);
    const hit=out.find(o=>o.forest===fid);
    if(hit)hit.n++; else out.push({forest:fid,n:1});
  }
  return out;
}
/* 旧セーブは requests を持たない。読み込み後に必ず通す */
function normalizeWorld(){
  const d={requests:[],requestsDone:[],requestsFailed:[],requestLog:[],
    pendingRequestResults:[],metClients:[],forestsSeen:[],travelPaidToday:[]};
  for(const k in d)if(!Array.isArray(WORLD[k]))WORLD[k]=d[k];
  WORLD.credit={builder:0,dealer:0,sakichi:0,owner:0,kannushi:0,...(WORLD.credit||{})};
  WORLD.unlocks={doghouse:false,workshop:false,miyama:false,snow:false,master:false,
    ...(WORLD.unlocks||{})};
  WORLD.today={fells:0,esses:0,keptKamiDay:false,essForests:[],...(WORLD.today||{})};
  if(!Array.isArray(WORLD.today.essForests))WORLD.today.essForests=[];
  /* 山守のお香は廃止して苗に置き換えた（ROADMAP §11.5） */
  WORLD.inv={bento:0,feed:0,stone:0,wedge:0,salve:0,sapling:0,sake:0,...(WORLD.inv||{})};
  delete WORLD.inv.incense; delete WORLD.auto?.incense; delete WORLD.incenseRun;
  WORLD.buildings={shed:false,doghouse:false,hearth:false,workshop:false,doma:false,
    ...(WORLD.buildings||{})};
  WORLD.storyFlags={shrineResolve:false,careLesson:false,sakeMigrated:false,...(WORLD.storyFlags||{})};
  WORLD.kamidana={level:0,...(WORLD.kamidana||{})};
  /* お神酒実装前に神主1・2・4を達成した記録にも、未使用分を一度だけ補う。 */
  if(!WORLD.storyFlags.sakeMigrated){
    const earned=['kannushi-1','kannushi-2','kannushi-4']
      .filter(id=>(WORLD.requestsDone||[]).includes(id)).length;
    WORLD.inv.sake=Math.max(WORLD.inv.sake||0,Math.max(0,earned-(WORLD.kamidana.level||0)));
    WORLD.storyFlags.sakeMigrated=true;
  }
  const shrine=WORLD.shrine||{};
  WORLD.shrine={
    started:!!shrine.started,
    stage:clamp(Number(shrine.stage)||0,0,5),
    submitted:Array.from({length:5},(_,i)=>Array.isArray(shrine.submitted?.[i])?shrine.submitted[i]:[]),
    paid:Array.from({length:5},(_,i)=>!!shrine.paid?.[i])
  };
  WORLD.ending={completed:false,day:null,viewed:false,...(WORLD.ending||{})};
  /* 旧セーブの WORLD.dog（'shiba' か true）を3頭形式へ移す */
  if(typeof WORLD.dogs!=='object'||WORLD.dogs===null)WORLD.dogs={};
  if(WORLD.dog&&!WORLD.dogs.shiba)WORLD.dogs.shiba={bond:0};
  delete WORLD.dog;
  for(const k in WORLD.dogs)if(typeof WORLD.dogs[k]?.bond!=='number')WORLD.dogs[k]={bond:0};
  if(!WORLD.mascot||!WORLD.dogs[WORLD.mascot])WORLD.mascot=Object.keys(WORLD.dogs)[0]||null;
  if(!WORLD.dogs[WORLD.dogCare])WORLD.dogCare=null;
  /* 倉庫の材に乾燥の起点が無ければ今日から数える */
  for(const log of WORLD.lumber||[]){
    if(log.since==null)log.since=WORLD.day;
    if(log.bornGrade==null)log.bornGrade=log.grade;
    if(log.dried==null)log.dried=false;
    if(log.processed==null)log.processed=0;
    if(log.furniture==null)log.furniture=null;
    /* 旧版や不正な文字列値も含め、true のときだけ保持扱いにする。 */
    log.held=log.held===true;
  }
  /* v2 の単体 request を新形式へ移す */
  if(WORLD.request){
    const r=WORLD.request;
    if(r.status==='complete'&&!WORLD.requestsDone.includes('builder-1'))
      WORLD.requestsDone.push('builder-1');
    else if(r.status==='failed'&&!WORLD.requestsFailed.includes('builder-1'))
      WORLD.requestsFailed.push('builder-1');
    else if(r.status==='active')
      WORLD.requests.push({id:'builder-1',client:'builder',accepted:WORLD.day,
        deadline:r.deadline??WORLD.day+7,progress:[r.progress||0],
        submitted:r.submitted||[]});
    if(!WORLD.metClients.includes('builder'))WORLD.metClients.push('builder');
    delete WORLD.request;
  }
  /* 新しい最低期限より短い受注中依頼は、旧セーブでも自動的に延長する。 */
  if(typeof reqDef==='function'&&typeof requestMinimumDays==='function'){
    for(const r of WORLD.requests){
      const days=requestMinimumDays(reqDef(r.id));
      if(days&&r.accepted!=null)r.deadline=Math.max(r.deadline??0,r.accepted+days);
    }
  }
}
const FORESTS=[
  {id:0,name:'近くの雑木林',mix:{sugi:6,hinoki:2,nara:2},stock:70,maxStock:90,
   avgD:0.34,care:25,travelBase:5,roadWorks:0,lastVisit:-99,stumps:[],unlocked:true,price:0,
   note:'家から歩いてすぐ。手入れはされていない。'},
  {id:1,name:'東の沢',mix:{sugi:7,hinoki:3,nara:0},stock:100,maxStock:120,
   avgD:0.38,care:45,travelBase:10,roadWorks:0,lastVisit:-99,stumps:[],unlocked:true,price:0,
   note:'沢沿いの杉山。以前から少しずつ手が入っている。'},
  {id:2,name:'奥山',mix:{sugi:4,hinoki:4,nara:2},stock:126,maxStock:140,
   avgD:0.42,care:35,travelBase:15,roadWorks:0,lastVisit:-99,stumps:[],unlocked:true,price:0,
   note:'遠いが本数が多い。道が悪い。'},
  {id:3,name:'深山',mix:{sugi:0,hinoki:5,nara:5},stock:150,maxStock:160,
   avgD:0.47,care:55,travelBase:20,roadWorks:0,lastVisit:-99,stumps:[],unlocked:false,price:80000,requires:'miyama',
   note:'檜と楢の壮齢林。手つかずに近い。'},
  {id:4,name:'雪の峰',mix:{sugi:0,hinoki:4,nara:6},stock:172,maxStock:180,
   avgD:0.52,care:65,travelBase:25,roadWorks:0,lastVisit:-99,stumps:[],unlocked:false,price:200000,requires:'snow',
   note:'目の詰んだ良材が眠る。ただしあまりに遠い。'}
];
const travelCost=f=>Math.max(Math.min(f.travelBase,10),f.travelBase-f.roadWorks*5);
const travelPay=f=>{
  const i=FORESTS.indexOf(f);
  if(i>=0&&(WORLD.travelPaidToday||[]).includes(i))return 0;
  return Math.max(0,travelCost(f)-(WORLD.moves===0?5:0));
};

function dailyGrowth(){
  for(const f of FORESTS){
    f.stock=Math.min(f.maxStock,f.stock+(f.care>=70?2:1));
    f.avgD=Math.min(0.62,f.avgD+0.002*(1+f.care/100));
    f.care=Math.max(0,f.care-1);
  }
}
/* 神棚は全林の自然な荒れを緩める。通常は毎朝 care -1。
   一段目は2日に一度+1、二段目は毎日+1、三段目は毎日+2。 */
function applyKamidanaCare(){
  const level=WORLD.kamidana?.level||0;
  const add=level>=3?2:level>=2?1:level===1&&WORLD.day%2===0?1:0;
  if(add)for(const f of FORESTS)f.care=Math.min(100,f.care+add);
  return {level,add,net:add-1};
}
function effCare(f){return f.care*(0.5+0.5*(f.stock/f.maxStock))}
function gradeRange(f){
  const ce=effCare(f);
  const sMin=30+ce*0.50, sMax=55+ce*0.45;
  const kMin=Math.max(0,40-ce*0.4), kMax=85-ce*0.55;
  const gMin=sMin*0.6+(100-kMax)*0.4, gMax=sMax*0.6+(100-kMin)*0.4;
  const a=gradeOf(gMin).name, b=gradeOf(gMax).name;
  return a===b?a:`${a} 〜 ${b}`;
}
function stockState(f){
  const r=f.stock/f.maxStock;
  return r>=0.70?{n:'健全',c:'ok'}:r>=0.40?{n:'疎になった',c:'mid'}:{n:'荒れた',c:'ng'};
}

function prepareDailyStands(){
  const pending=WORLD.pendingCut;
  const carried=pending&&WORLD.stands?.[pending.forestId]?.[pending.treeIndex];
  WORLD.stands={};
  for(const f of FORESTS)WORLD.stands[f.id]=generateStand(f);
  if(carried)WORLD.stands[pending.forestId][pending.treeIndex]=carried;
}
function ensureDailyStands(){
  if(!WORLD.stands||FORESTS.some(f=>!Array.isArray(WORLD.stands[f.id])||WORLD.stands[f.id].length<16))
    prepareDailyStands();
}

/* ══════════ 木の生成 ══════════ */
