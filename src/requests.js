/* ══════════ 依頼と信用 ══════════
   ROADMAP §12。材積は条件に使わない。同時受注3件。

   声で仕組みを教える（§12.2）。
   何を求めるかだけでなく、誰がどう喋るかも5人ぶん違える。

     棟梁のすが … 若い女。去年、父の跡を継いだ。短い命令形。**数**を言う
     材木屋のおかみ … 中年の女。敬語だが冷たい。**値**を言う
     家具屋の佐吉 … 老いた職人。ぽつぽつと。**木そのもの**を見る
     山の持ち主   … 若い当主（ぼっちゃん）。丁寧で世間知らず。**金を出さないと明言する**
     神主        … 年若く、静か。一番短く、**問いで終わる**                        */

/* 未実装の仕組み。false の間、それに依存する依頼は出さない（§12.1 の require の一種） */
const SYSTEMS={dry:true,craft:true,sake:false,shrine:false};

const CLIENTS={
  builder:{key:'builder',name:'大工の棟梁',
    intro:`帰ってきてくれたんだね。\nあなたのお父さんがいなくなってから、山のことまで手が回らなかった。\n\nお父さんの代わりになってくれて助かる。\nまず、檜の一等を三本お願いできる？　十五日あれば大丈夫。`},
  dealer:{key:'dealer',name:'材木屋',
    intro:`噂は聞いています。棟梁が若いのを使っていると。\n\nわたしは材を買うだけ。目利きはしません。\n値のつくものを、まとまった数で。\n……太いものは、太いだけで値がつきます。そこは覚えておいて。`},
  sakichi:{key:'sakichi',name:'家具屋の佐吉',
    intro:`……この楢、どこで伐った。\nああ、いや。責めてるんじゃない。\n\n木は、挽いてはじめて何になるか決まる。\n丸太のままじゃ、何も見えん。二本、持ってきてくれ。`},
  owner:{key:'owner',name:'山の持ち主',
    intro:`きみが伐っているの、ぼくの山なんだ。\n……ああ、怒ってないよ。きみのお父さんにも、そうさせていたし。\n\nひとつ頼みたい。あの雑木林、荒れているだろう。\n手を入れてみてほしい。お金は出さない。\n……ぼく、お金の使い方をよく知らないんだ。`},
  kannushi:{key:'kannushi',name:'神主',
    intro:`……あなたが、帰ってきた人。\n\n社が倒れたのは、あの震災です。\nけれど、材の話をしに来たのではありません。\n\n五本。事故なく伐ってごらんなさい。\n木を倒すのに、急ぐ理由はないでしょう。`}
};

/* give.kind
   deliver    … 木を納める。parts[] の条件をそれぞれ満たす本数
   safe-fell  … 事故なく N本伐る
   thin       … 直径 maxD 未満を N本伐る（納めない。間伐）
   kamiday    … 山の神の日を N度守る
   all-S-day  … その日伐った木がすべてSの日を N度（minFells 本以上伐った日のみ）
   care       … forest の手入れ度が level 以上
   care-multi … forests すべてが level 以上
   roadworks  … 道の手入れを通算 N回                                        */
const REQUESTS=[
  /* ── 大工の棟梁（すが・若い女） ── 短い命令形。数を言う */
  {id:'builder-1',client:'builder',title:'檜の一等を三本',
   text:'まず、檜の一等以上を三本お願いできる？\n十五日あれば大丈夫。無理はしないで。',
   doneText:'助かった。丁寧に伐ってくれたんだね。\n深山へ入る話と、犬小屋のことも通しておいたよ。',
   failText:'間に合わなかったね。でも、山で無理をしないほうが大事。',
   give:{kind:'deliver',parts:[{species:'hinoki',grade:'一等',need:3}]},
   days:15,pay:60000,unlocks:['miyama','doghouse','client:dealer']},

  {id:'builder-2',client:'builder',title:'梁にする杉を二本',
   text:'梁にする。直径四十を超える杉を二本。六日。\n細いのは要らない。',
   doneText:'太いのを見る目はあるらしい。\n……山向こうに秋田犬を譲りたい人がいる。話す？',
   failText:'太いのは体力を食う。無理はしないで。',
   give:{kind:'deliver',parts:[{species:'sugi',minD:0.40,need:2}]},
   days:6,pay:50000,unlocks:['akita'],require:{buildings:['shed']}},

  {id:'builder-3',client:'builder',title:'雑に伐らないで',
   text:'数はいい。雑に伐らないで。\nB以上で四本。八日。樹種も品等も問わない。',
   doneText:'切り口を見ればわかる。丁寧だね。\n……工房を建てる話、乗る？',
   failText:'急いだね。急いだ木は、切り口に出る。',
   give:{kind:'deliver',parts:[{minRank:'B',need:4}]},
   days:8,pay:80000,unlocks:['workshop-1']},

  {id:'builder-4',client:'builder',title:'杉と檜、二本ずつ',
   text:'杉の一等を二本、檜の一等を二本。二十日。',
   doneText:'助かった。……父が見たら、なんて言うかな。',
   failText:'四本は四本。数えてから受けて。',
   give:{kind:'deliver',parts:[
     {species:'sugi',grade:'一等',need:2},{species:'hinoki',grade:'一等',need:2}]},
   days:20,pay:100000,require:{buildings:['shed']}},

  /* ── 材木屋のおかみ（中年の女） ── 敬語だが冷たい。値を言う */
  {id:'dealer-1',client:'dealer',title:'楢を一本',
   text:'楢を一本。品等は問いません。\n床材を探している方がいます。硬い木ですから、細くても値になります。',
   doneText:'結構です。……棟梁が工房の話をしていましたね。わたしからも口を利きます。',
   failText:'期日は期日です。次は材を確かめてからお受けください。',
   give:{kind:'deliver',parts:[{species:'nara',need:1}]},
   days:10,pay:45000,unlocks:['workshop-2']},

  {id:'dealer-2',client:'dealer',title:'楢の一等を二本',
   text:'楢の一等以上を二本。\n……家具屋が欲しがっています。会わせましょうか。',
   doneText:'佐吉さんに渡しておきます。腕は確かですが、気難しい人ですよ。',
   failText:'楢は重い。体力の計算を誤りましたね。',
   give:{kind:'deliver',parts:[{species:'nara',grade:'一等',need:2}]},
   days:12,pay:170000,unlocks:['client:sakichi']},

  {id:'dealer-3',client:'dealer',title:'太いものを三本',
   text:'直径四十五を超えるもの、三本。樹種は問いません。\n太いものは、太いだけで値がつきます。',
   doneText:'良い品でした。……山を歩く犬を探していると聞きました。甲斐の犬です。',
   failText:'太い木は一日で二本も倒せません。日数の読みが甘いですね。',
   give:{kind:'deliver',parts:[{minD:0.45,need:3}]},
   days:12,pay:110000,unlocks:['kai'],require:{forests:[3]}},

  {id:'dealer-4',client:'dealer',title:'寝かせた檜を三本',
   text:'檜の一等を、十日寝かせてから。三本。二十五日で。\n乾いた材は値が変わります。ご存じでしょう。',
   doneText:'これが乾き材の値です。覚えておいてください。',
   failText:'乾かすには日数が要ります。受けてから伐っては間に合いません。',
   give:{kind:'deliver',parts:[{species:'hinoki',grade:'一等',dried:true,need:3}]},
   days:25,pay:130000,needs:'dry',require:{buildings:['shed']}},

  /* ── 家具屋の佐吉 ── 木そのものを見る */
  {id:'sakichi-1',client:'sakichi',title:'まず見せてくれ',
   text:'楢の一等以上を二本。丸太のままでいい。\n……まず、見せてくれ。',
   doneText:'……いい木だ。どこで伐ったか、覚えておけ。',
   failText:'急がんでいい。急いだ木は挽けばわかる。',
   give:{kind:'deliver',parts:[{species:'nara',grade:'一等',need:2}]},
   days:14,pay:180000},

  {id:'sakichi-2',client:'sakichi',title:'板に挽いてくれ',
   text:'板に挽いてくれ。楢を二枚。\n挽けば、木目が見える。丸太のままじゃ何も見えん。',
   doneText:'……この目なら、家具になる。作り方を教えよう。',
   failText:'挽くには工房と、日を一つ使う覚悟が要る。',
   give:{kind:'deliver',parts:[{species:'nara',processed:1,need:2}]},
   days:18,pay:240000,unlocks:['furniture'],needs:'craft',require:{buildings:['workshop']}},

  {id:'sakichi-3',client:'sakichi',title:'座卓を一つ',
   text:'座卓を一つ。乾かした楢で。\nそれと、檜のまな板を二枚。乾くまで待つのも仕事だ。二十五日で持ってこい。',
   doneText:'……上手いもんだ。山のぼっちゃんに、あんたの名を言っておく。',
   failText:'乾かして、挽いて、削る。日が足りなかったな。',
   give:{kind:'deliver',parts:[
     {species:'nara',furniture:'座卓',dried:true,need:1},
     {species:'hinoki',furniture:'まな板',need:2}]},
   days:25,pay:320000,needs:'craft',require:{buildings:['workshop']}},

  /* ── 山の持ち主（若い当主・ぼっちゃん） ── 丁寧で世間知らず。金を出さないと明言する */
  {id:'owner-1',client:'owner',title:'雑木林に手を入れる',
   text:'あの雑木林、手入れ度を六十まで上げてほしい。\nお金は出さない。……ぼく、お金の使い方をよく知らないんだ。',
   doneText:'……見ていたよ。砥石ならうちの蔵にある。安く回すよ。',
   give:{kind:'care',forest:0,level:60},days:null,pay:0,unlocks:['cheap-stone']},

  {id:'owner-2',client:'owner',title:'道をならす',
   text:'道をならしてほしい。二度でいい。\n……そのあと、見せたい山があるんだ。',
   doneText:'雪の峰へ入っていいよ。あそこの木は、目が詰んでいる。',
   give:{kind:'roadworks',need:2},days:null,pay:0,unlocks:['snow'],
   require:{forests:[3]}},

  {id:'owner-3',client:'owner',title:'細いのを抜く',
   text:'細いのを六本抜いてほしい。直径二十五を下回るもの。二十日で。\n……お金にはならないよ。それでもやってくれる？',
   doneText:'日が入るようになった。残った木が太くなる。',
   failText:'お金にならない仕事だからね。後回しになるのは、わかるよ。',
   give:{kind:'thin',maxD:0.25,need:6},days:20,pay:30000},

  {id:'owner-4',client:'owner',title:'三つの林を保つ',
   text:'三つの林、どれも五十を下回らないように。\n……ぼくは見ているだけだけど。',
   doneText:'……よくやった。名工の斧を打つ人に、きみの名を伝えたよ。',
   give:{kind:'care-multi',forests:[0,1,2],level:50},days:null,pay:0,unlocks:['master']},

  /* ── 神主 ── 問いで終わる */
  {id:'kannushi-1',client:'kannushi',title:'事故なく五本',
   text:'五本。事故なく伐ってごらんなさい。\n木を倒すのに、急ぐ理由はないでしょう。',
   doneText:'結構です。……苗を植えることを、お教えしましょう。',
   give:{kind:'safe-fell',need:5},days:null,pay:0,unlocks:['sapling','sake']},

  {id:'kannushi-2',client:'kannushi',title:'一日、山を休ませる',
   text:'一度、山を休ませてごらんなさい。\nどこかで一日、山へ入らずに過ごせますか。\n（依頼を受けたあと、一日山へ入らなければ達成）',
   doneText:'休ませましたね。山は見ています。',
   give:{kind:'kamiday',need:1},days:null,pay:0,unlocks:['sake']},

  {id:'kannushi-3',client:'kannushi',title:'大木に供える',
   text:'直径五十を超える木に、お神酒を供えてから伐ってごらんなさい。',
   doneText:'大きな木には、大きな礼を。',
   give:{kind:'offering',minD:0.50,need:1},days:null,pay:0,unlocks:['sake'],
   needs:'sake',require:{forests:[3]}},

  {id:'kannushi-4',client:'kannushi',title:'一日、山に礼を尽くす',
   text:'一日、山に礼を尽くす。\n苗を植えるくらい最高判定で。二本以上。\nその日に伐る木を、すべてS評価にできますか。',
   doneText:'そういう日が、山を変えるのです。\n……紀州の犬を貸しましょう。神の使いです。',
   give:{kind:'all-S-day',minFells:2,need:1},days:null,pay:0,unlocks:['sake','kishu']},

  {id:'kannushi-5',client:'kannushi',title:'社の材を納める',
   text:'社の材を。段階ごとに、お持ちください。',
   doneText:'……宮大工を呼びましょう。本殿は、あの人でなければ。',
   give:{kind:'shrine'},days:null,pay:0,unlocks:['miyadaiku'],needs:'shrine'}
];

const reqDef=id=>REQUESTS.find(r=>r.id===id);
const clientName=k=>CLIENTS[k]?.name||k;
/* 一等指定は1本5日。乾燥指定は、その依頼で最長の乾燥日数を一度加える。
   元の期限がこれより長い場合は短くしない。 */
function requestMinimumDays(d){
  if(!d||d.give?.kind!=='deliver')return d?.days||0;
  const parts=d.give.parts||[];
  const firstGrade=parts.reduce((n,p)=>n+(p.grade==='一等'?(p.need||0):0),0);
  const dryExtra=Math.max(0,...parts.filter(p=>p.dried)
    .map(p=>DRY_DAYS[p.species]||0));
  return Math.max(d.days||0,firstGrade*5+dryExtra);
}
/* 夜の依頼カードに添える小さなシルエット。無ければ何も出さない */
const clientAvatar=k=>`<img class="client-avatar" src="assets/client-${k}.png" alt=""
  onerror="this.remove()">`;
const gradeRank=g=>({'特等':3,'一等':2,'二等':1,'三等':0}[g]??0);
const RANK_ORDER={S:4,A:3,B:2,C:1,D:0};

/* ── 納品条件の照合 ──
   木（伐倒直後の T）でも、倉庫の材でも同じ形で判定できるようにする */
function partMatches(p,t){
  const sp=t.id||t.species;
  if(p.species&&sp!==p.species)return false;
  if(p.grade&&gradeRank(t.grade)<gradeRank(p.grade))return false;
  if(p.minD!=null&&!(t.D>=p.minD))return false;
  if(p.maxD!=null&&!(t.D<p.maxD))return false;
  if(p.minRank&&(RANK_ORDER[t.rank]??-1)<RANK_ORDER[p.minRank])return false;
  if(p.dried&&!t.dried)return false;
  if(p.processed!=null&&(t.processed||0)<p.processed)return false;
  if(p.furniture&&t.furniture!==p.furniture)return false;
  return true;
}
/* この木がその依頼のどの part を進められるか。無ければ −1 */
function partIndexFor(req,t){
  const d=reqDef(req.id); if(!d||d.give.kind!=='deliver')return -1;
  return d.give.parts.findIndex((p,i)=>req.progress[i]<p.need&&partMatches(p,t));
}
/* 受注中のどれかに合う木か（見立て一覧の ★） */
const requestMatches=t=>(WORLD.requests||[]).some(r=>partIndexFor(r,t)>=0);
const requestMatchCount=t=>(WORLD.requests||[]).filter(r=>partIndexFor(r,t)>=0).length;

/* ── 進捗 ── */
function reqProgress(req){
  const d=reqDef(req.id),g=d.give;
  if(g.kind==='deliver')
    return {now:req.progress.reduce((a,b)=>a+b,0),max:g.parts.reduce((a,p)=>a+p.need,0)};
  if(g.kind==='care'){const f=FORESTS[g.forest];
    return {now:Math.round(f.care),max:g.level}}
  if(g.kind==='care-multi'){
    const low=Math.min(...g.forests.map(i=>FORESTS[i].care));
    return {now:Math.round(low),max:g.level}}
  if(g.kind==='roadworks'){
    return {now:FORESTS.reduce((a,f)=>a+f.roadWorks,0),max:g.need}}
  return {now:req.progress,max:g.need||1};
}
const reqDone=req=>{const p=reqProgress(req);return p.now>=p.max};

function reqProgressText(req){
  const d=reqDef(req.id),g=d.give,p=reqProgress(req);
  if(g.kind==='care'||g.kind==='care-multi')
    return `${d.title}　${p.now} / ${p.max}`;
  const stars=p.max<=6
    ? '★'.repeat(Math.min(p.now,p.max))+'☆'.repeat(Math.max(0,p.max-p.now))
    : `${p.now} / ${p.max}`;
  return `${d.title}　${stars}`;
}

/* ── 出せるか ── */
function requireOK(d){
  const q=d.require; if(d.needs&&!SYSTEMS[d.needs])return false;
  if(!q)return true;
  if(q.buildings&&!q.buildings.every(b=>WORLD.buildings[b]))return false;
  if(q.forests&&!q.forests.every(i=>FORESTS[i]?.unlocked))return false;
  if(q.credit&&!Object.entries(q.credit).every(([c,n])=>(WORLD.credit[c]||0)>=n))return false;
  return true;
}
const clientMet=k=>(WORLD.metClients||[]).includes(k);
function clientVisible(k){
  if(k==='builder')return true;
  if(k==='kannushi')return WORLD.day>=5;
  if(clientMet(k))return true;
  if(k==='dealer')return !!WORLD.unlocks['client:dealer'];
  if(k==='sakichi')return !!WORLD.unlocks['client:sakichi'];
  if(k==='owner')return (WORLD.forestsSeen||[]).length>=2;
  return false;
}
/* その依頼主から次に頼まれている1件。無ければ null */
function pendingRequest(k){
  if(!clientVisible(k))return null;
  if((WORLD.requests||[]).some(r=>r.client===k))return null;   // 受注中は1人1件
  if((WORLD.credit[k]||0)<0)return null;                       // 信用を落とすと来ない
  return REQUESTS.find(d=>d.client===k
    &&!(WORLD.requestsDone||[]).includes(d.id)
    &&!(WORLD.requestsFailed||[]).includes(d.id)
    &&requireOK(d))||null;
}
const anyPending=()=>Object.keys(CLIENTS).some(k=>pendingRequest(k));
const canAcceptMore=()=>(WORLD.requests||[]).length<3;

/* ── 受ける・納める ── */
function acceptRequest(id){
  const d=reqDef(id); if(!d||!canAcceptMore())return false;
  const days=requestMinimumDays(d);
  WORLD.requests.push({id,client:d.client,
    accepted:WORLD.day,deadline:days?WORLD.day+days:null,
    progress:d.give.kind==='deliver'?d.give.parts.map(()=>0):0,
    submitted:[]});
  if(!WORLD.metClients.includes(d.client))WORLD.metClients.push(d.client);
  return true;
}
/* 木（または倉庫の材）を納める。納めた依頼を返す */
function deliverToRequest(t,reqId=null){
  for(const r of WORLD.requests){
    if(reqId&&r.id!==reqId)continue;
    const i=partIndexFor(r,t); if(i<0)continue;
    r.progress[i]++; r.submitted.push(logFromTree(t));
    if(reqDone(r))completeRequest(r);
    return r;
  }
  return null;
}
function completeRequest(r){
  const d=reqDef(r.id);
  WORLD.money+=d.pay||0;
  WORLD.credit[r.client]=(WORLD.credit[r.client]||0)+1;
  WORLD.requestsDone.push(r.id);
  (d.unlocks||[]).forEach(applyUnlock);
  WORLD.requests=WORLD.requests.filter(x=>x!==r);
  WORLD.requestLog.unshift({id:r.id,day:WORLD.day,ok:true});
  WORLD.pendingRequestResults??=[];
  WORLD.pendingRequestResults.push({id:r.id,day:WORLD.day});
}
function expireRequests(){
  return [...(WORLD.requests||[])].filter(r=>r.deadline!=null&&WORLD.day>r.deadline);
}

/* ── 解禁 ──
   工房と名工の斧はここまで到達不能で ¥520,000 が死んでいた（§11.9） */
const WORKSHOP_KEYS=['workshop-1','workshop-2'];
function applyUnlock(key){
  WORLD.unlocks[key]=true;
  if(key==='miyama')WORLD.unlocks.miyama=true;
  if(key==='snow')WORLD.unlocks.snow=true;
  if(key==='master')WORLD.unlocks.master=true;
  /* 工房は棟梁3と材木屋1の両方が要る */
  if(WORKSHOP_KEYS.includes(key)&&WORKSHOP_KEYS.every(k=>WORLD.unlocks[k]))
    WORLD.unlocks.workshop=true;
}

/* ── 行い型の記録 ──
   伐倒が終わるたびに呼ぶ。事故なし・間伐・その日の会心を数える */
function noteFell(info){
  WORLD.today.fells++;
  if(info.rank==='S'){
    WORLD.today.esses++;
    /* 苗はSを取った林に植わる。どの林だったかを覚える（ROADMAP §11.5） */
    WORLD.today.essForests??=[];
    if(WORLD.at>=0)WORLD.today.essForests.push(WORLD.at);
  }
  for(const r of WORLD.requests||[]){
    const g=reqDef(r.id).give;
    if(g.kind==='safe-fell'&&!info.accident)r.progress++;
    if(g.kind==='thin'&&info.D<g.maxD)r.progress++;
    if(g.kind==='offering'&&info.offered&&info.D>=g.minD)r.progress++;
    if(reqDone(r))completeRequest(r);
  }
}
/* 一日の終わり（夜明けの直前）に呼ぶ */
function noteDayEnd(){
  const t=WORLD.today;
  for(const r of [...(WORLD.requests||[])]){
    const g=reqDef(r.id).give;
    if(g.kind==='all-S-day'&&t.fells>=g.minFells&&t.esses===t.fells)r.progress++;
    if(g.kind==='kamiday'&&(WORLD.forestsToday||[]).length===0)r.progress++;
    if(reqDone(r))completeRequest(r);
  }
  /* 手入れ度と道は世界の状態から導くので、達成の取りこぼしをここで拾う */
  for(const r of [...(WORLD.requests||[])])if(reqDone(r))completeRequest(r);
}
const kamiDay=(d=WORLD.day)=>d%12===0;

/* ── 朝の帯（期限が近い順に最大2件） ── */
function requestLine(){
  const rs=[...(WORLD.requests||[])]
    .sort((a,b)=>(a.deadline??999)-(b.deadline??999)).slice(0,2);
  if(kamiDay())
    return '<s>今日は山の神の日。山へ入ってはならない。</s>';
  if(!rs.length)
    return anyPending()?'戸口に紙が挟まっている。夜に確かめられる。'
                       :'いまは頼まれていることがない。';
  return rs.map(r=>{
    const left=r.deadline==null?'':`　残り ${Math.max(0,r.deadline-WORLD.day+1)}日`;
    const near=r.deadline!=null&&r.deadline-WORLD.day+1<=2;
    const s=`${reqProgressText(r)}${left}`;
    return near?`<s>${s}</s>`:s;
  }).join('　／　');
}
