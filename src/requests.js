/* ══════════ 依頼と信用 ══════════
   ROADMAP §12。材積は条件に使わない。同時受注3件。

   声で仕組みを教える（§12.2）。
   何を求めるかだけでなく、誰がどう喋るかも5人ぶん違える。

     棟梁のすが … 幼馴染。とても活発だが、父の死をまだ引きずっている。**数**を言う
     材木屋のおかみ … 声が大きく怪力で天然。他の依頼主の噂を教えてくれる。**値**を言う
     家具屋の佐吉 … まじめで口数は少ないが根は優しい。新婚。**木そのもの**を見る
     山の持ち主   … 祖父っ子。山が少し怖い。少しずつ動物に興味を持ち始める
     神主        … 神秘的な青年。古風な物言いで、**そなた**と呼ぶ                     */

/* 未実装の仕組み。false の間、それに依存する依頼は出さない（§12.1 の require の一種） */
const SYSTEMS={dry:true,craft:true,sake:true,shrine:true};

const CLIENTS={
  builder:{key:'builder',name:'大工の棟梁',
    intro:`あ――ほんとに帰ってきた！　噂は本当だったんだ。\n子どもの頃からの顔なじみだろ、水くさい挨拶はナシな。\n\nうちも父さんが死んでから棟梁を継いでさ。あんたと同じだ、そういうとこ。\n湿っぽいのは柄じゃないから、パーッといくぞ。まず檜の一等を三本、十五日で頼めるか？\n……あ、珍しい菓子があったら今度持ってきてくれよ。好物なんだ。`},
  dealer:{key:'dealer',name:'材木屋',
    intro:`はっはっは！　あんたが噂の人か！……ってあら、声大きかった？　地声なのよ、堪忍してね。\n\nこう見えて丸太一本くらい肩に担げるのよ。びっくりした？　よく言われるの。\nさてと――材はまとめて欲しいのよねぇ。まずは楢を一本、持ってきてくれる？　値は太けりゃ太いだけつくから。\n\nそうそう、棟梁のあの子、けっこう頑張ってるのよ。\n……ってわたしがお酒飲みたいだけか。あはは。`},
  sakichi:{key:'sakichi',name:'家具屋の佐吉',
    intro:`……この楢、どこで伐った。\n悪い、責めてるんじゃない。ただの癖だ。\n\n木は挽いてはじめて何になるか決まる。丸太のままじゃ、何も見えん。\n二本、持ってきてくれ。\n\n……師匠にはよく言われたよ、お前は遊びがないと。木にしか興味がないと。\n最近は少し変わった。女房が、花を見ると喜ぶんでな。`},
  owner:{key:'owner',name:'山の持ち主',
    intro:`きみが伐っているの、ぼくの山なんだ。\n……ああ、怒ってないよ。祖父がそうさせていたし。\n\n正直に言うと、ぼくは山があまり得意じゃない。\n何が出るかわからないし……少し、怖いんだ。祖父はいつも平気そうだったけど。\n\nひとつ頼みたい。あの雑木林、荒れているだろう。手を入れてみてほしい。\nお金は出さない。……ぼく、お金の使い方をよく知らないんだ。祖父の本ばかり読んで育ったから。`},
  kannushi:{key:'kannushi',name:'神主',
    intro:`……そなたが、戻られた人か。\n\nわたくしは、この地の生まれではありません。前の神主どのに連れられて、ここへ参りました。\n世間のことには、いまだ疎いままで……よく笑われます。\n\n社が倒れたのは、あの震災でございます。けれど、今日は材の話をしに来たのではありません。\n\n五本。事故なく伐ってごらんなさい。木を倒すのに、急ぐ理由がどこにありましょう。\n\n……ああ、そうそう。古い品を見かけましたら、ぜひわたくしに。骨董の類が、好きなものですから。`}
};

/* give.kind
   deliver    … 木を納める。parts[] の条件をそれぞれ満たす本数
   safe-fell  … 事故なく N本伐る
   thin       … 直径 maxD 未満を N本伐る（納めない。間伐）
   kamiday    … 山の神の日を N度守る
   all-S-day  … その日伐った木がすべてSの日を N度（minFells 本以上伐った日のみ）
   care       … forest の手入れ度が level 以上
   care-multi … forests すべてが level 以上
   roadworks  … 道の手入れを通算 N回
   kamidana   … 小さな神棚を建て、お神酒を奉納する
   shrine     … 社を五段階すべて完成させる                                  */
const REQUESTS=[
  /* ── 大工の棟梁（すが・幼馴染） ── 元気なタメ口。父の死は直接言わず、要所ににじませる */
  {id:'builder-1',client:'builder',title:'檜の一等を三本',
   text:'まず、檜の一等以上を三本揃えてくれる？　十五日あれば大丈夫。\n無理はすんなよ、幼馴染のよしみで多めに待ってやるから。',
   doneText:'早いな、さすが。……お互い、いろいろ大変だったよな。\nこれからは一緒に頑張ろうぜ。',
   failText:'間に合わなかったか。まあ、山はどこにも逃げないし、気にすんな。',
   give:{kind:'deliver',parts:[{species:'hinoki',grade:'一等',need:3}]},
   days:15,pay:60000,unlocks:['miyama','doghouse','client:dealer']},

  {id:'builder-2',client:'builder',title:'梁にする杉を二本',
   text:'梁に使う。太さ四十超えの杉を二本、六日で頼む。細いのはダメだぞ。',
   doneText:'太さの目、あるじゃん。……そうだ、山向こうに秋田犬を譲りたい人がいるんだけど、会ってみる？',
   failText:'太いのは体力食うもんな。次でいいから、また頼むわ。',
   give:{kind:'deliver',parts:[{species:'sugi',minD:0.40,need:2}]},
   days:6,pay:50000,unlocks:['akita'],require:{buildings:['shed']}},

  {id:'builder-3',client:'builder',title:'雑に伐らないで',
   text:'本数はどうでもいい、雑に伐るなよ。B評価以上を四本、八日で。樹種も品等も問わない。',
   doneText:'切り口見りゃわかるんだよね、丁寧かどうか。……工房建てる話、乗るか？',
   failText:'急いだだろ。急いだ木は切り口でバレるんだよ、知ってた？',
   give:{kind:'deliver',parts:[{minRank:'B',need:4}]},
   days:8,pay:80000,unlocks:['workshop-1']},

  {id:'builder-4',client:'builder',title:'杉と檜、二本ずつ',
   text:'杉の一等を二本、檜の一等も二本。二十日でいい、まとめて頼む。',
   doneText:'助かったよ、ほんと。\n……今度、うまい菓子でも見つけたら持ってきてくれよ。柄にもないこと言った礼だ。',
   failText:'四本は四本、数えてから受けてくれよな。',
   give:{kind:'deliver',parts:[
     {species:'sugi',grade:'一等',need:2},{species:'hinoki',grade:'一等',need:2}]},
   days:20,pay:100000,require:{buildings:['shed']}},

  /* ── 材木屋のおかみ ── 声が大きく怪力で天然。噂話とお酒好き */
  {id:'dealer-1',client:'dealer',title:'楢を一本',
   text:'楢を一本、値は問わないから。床材を探してる人がいてね、硬い木だから細くても値になるのよ。',
   doneText:'よし来た！……ちょっと、力入れすぎた？　ごめんごめん。\n棟梁があんたの工房の話してたわよ。わたしからも口利いておくから。',
   failText:'あららー、期日過ぎちゃった。まあいいわ、お酒でも飲んで忘れましょ。',
   give:{kind:'deliver',parts:[{species:'nara',need:1}]},
   days:10,pay:45000,unlocks:['workshop-2']},

  {id:'dealer-2',client:'dealer',title:'楢の一等を二本',
   text:'楢の一等以上を二本。……家具屋が欲しがってんのよ、会わせよっか？',
   doneText:'佐吉さんに渡しとくわ。あの人、無口だけど根はいい人よ。\n花が好きな奥さんもらったばっかりでね、幸せそうだったわ。',
   failText:'楢は重いもんね。まあ次があるわ、気にしない気にしない。',
   give:{kind:'deliver',parts:[{species:'nara',grade:'一等',need:2}]},
   days:12,pay:170000,unlocks:['client:sakichi']},

  {id:'dealer-3',client:'dealer',title:'太いものを三本',
   text:'直径四十五を超えるもの、三本。樹種は気にしなくていいわ。太いのは太いだけ値がつくの。',
   doneText:'いい品ね！……ああそうだ、山を読む犬を連れてる人がいるのよ。甲斐犬、知ってる？',
   failText:'太い木は一日に何本も倒せないもんね。日数、読み間違えたか。',
   give:{kind:'deliver',parts:[{minD:0.45,need:3}]},
   days:12,pay:110000,unlocks:['kai'],require:{forests:[3]}},

  {id:'dealer-4',client:'dealer',title:'寝かせた檜を三本',
   text:'檜の一等を、十日寝かせてから三本。二十五日で。乾いた材は値が変わるの、知ってた？',
   doneText:'これが乾き材の値よ！　覚えときな。……お礼にお酒、奢ってもいいのよ？',
   failText:'乾かすには日数が要るのよ。受けてから伐ったんじゃ、間に合わないわよ。',
   give:{kind:'deliver',parts:[{species:'hinoki',grade:'一等',dried:true,need:3}]},
   days:25,pay:130000,needs:'dry',require:{buildings:['shed']}},

  /* ── 家具屋の佐吉 ── まじめで寡黙、根は優しい。新婚 */
  {id:'sakichi-1',client:'sakichi',title:'まず見せてくれ',
   text:'楢の一等以上を二本。丸太のままでいい。……まず、見せてくれ。',
   doneText:'……いい木だ。どこで伐ったか、覚えておけ。',
   failText:'急がんでいい。急いだ木は挽けばわかる。',
   give:{kind:'deliver',parts:[{species:'nara',grade:'一等',need:2}]},
   days:14,pay:180000},

  {id:'sakichi-2',client:'sakichi',title:'板に挽いてくれ',
   text:'板に挽いてくれ。楢を二枚。挽けば木目が見える。丸太のままじゃ何も見えん。',
   doneText:'……この目なら、家具になる。作り方を教えよう。\n……女房が喜びそうだ、こういう木目は。',
   failText:'挽くには工房と、日を一つ使う覚悟が要る。',
   give:{kind:'deliver',parts:[{species:'nara',processed:1,need:2}]},
   days:18,pay:240000,unlocks:['furniture'],needs:'craft',require:{buildings:['workshop']}},

  {id:'sakichi-3',client:'sakichi',title:'座卓を一つ',
   text:'座卓を一つ。乾かした楢で。それと、檜扇を二つ。乾くまで待つのも仕事だ。二十五日で持ってこい。',
   doneText:'……上手いもんだ。山のぼっちゃんに、あんたの名を言っておく。\n……この扇、女房への土産にしようかな。',
   failText:'乾かして、挽いて、削る。日が足りなかったな。',
   give:{kind:'deliver',parts:[
     {species:'nara',furniture:'座卓',dried:true,need:1},
     {species:'hinoki',furniture:'檜扇',need:2}]},
   days:25,pay:320000,needs:'craft',require:{buildings:['workshop']}},

  /* ── 山の持ち主（祖父っ子） ── 山が少し怖い→少しずつ動物に興味を持つ */
  {id:'owner-1',client:'owner',title:'雑木林に手を入れる',
   text:'あの雑木林、手入れ度を六十まで上げてほしい。\n手入れ度が高いほど、一等や特等の木が出やすくなって、売値も上がる。ただ、手を入れなければ毎朝ひとつずつ下がる。\nお金は出さない。……ぼく、お金の使い方をよく知らないんだ。',
   doneText:'……見ていたよ。これで一等や特等の木が出やすくなって、売値も上がる。砥石ならうちの蔵にある。安く回すよ。\n\n……この間、林で小鳥を見た。祖父の本に載っていた種類だった。少し、山も悪くないのかもしれない。',
   give:{kind:'care',forest:0,level:60},days:null,pay:0,unlocks:['cheap-stone']},

  {id:'owner-2',client:'owner',title:'道をならす',
   text:'道をならしてほしい。二度でいい。……そのあと、見せたい山があるんだ。',
   doneText:'雪の峰へ入っていいよ。あそこの木は、目が詰んでいる。\n……祖父の代からある山なんだ。少しだけ、歩いてみようかな。きみと一緒なら。',
   give:{kind:'roadworks',need:2},days:null,pay:0,unlocks:['snow'],
   require:{forests:[3]}},

  {id:'owner-3',client:'owner',title:'細いのを抜く',
   text:'細いのを六本抜いてほしい。直径二十五を下回るもの。二十日で。\n……お金にはならないよ。それでもやってくれる？',
   doneText:'日が入るようになった。残った木が太くなる。\n\n……このごろ、山で動物をよく見るようになった。怖いより、気になる方が増えてきた。',
   failText:'お金にならない仕事だからね。後回しになるのは、わかるよ。',
   give:{kind:'thin',maxD:0.25,need:6},days:20,pay:30000},

  {id:'owner-4',client:'owner',title:'三つの林を保つ',
   text:'三つの林、どれも五十を下回らないように。……ぼくは見ているだけだけど。',
   doneText:'……よくやった。名工の斧を打つ人に、きみの名を伝えたよ。\n\n今度、山の動物を見に行ってみようと思う。……付き合ってくれる？　祖父の本で読んだだけじゃ、わからないこともあるから。',
   give:{kind:'care-multi',forests:[0,1,2],level:50},days:null,pay:0,unlocks:['master']},

  /* ── 神主 ── 古風な物言い。そなたと呼ぶ */
  {id:'kannushi-1',client:'kannushi',title:'事故なく五本',
   text:'五本。事故なく伐ってごらんなさい。\n木を倒すのに、急ぐ理由がどこにありましょう。',
   doneText:'結構です。……苗を植えることを、お教えいたしましょう。',
   give:{kind:'safe-fell',need:5},days:null,pay:0,unlocks:['sapling','sake']},

  {id:'kannushi-2',client:'kannushi',title:'一日、山を休ませる',
   text:'一度、山を休ませてごらんなさい。\nどこかで一日、そなたが山へ入らずに過ごせますか。\n（依頼を受けたあと、一日山へ入らなければ達成）',
   doneText:'休ませましたね。山は、見ておられます。',
   give:{kind:'kamiday',need:1},days:null,pay:0,unlocks:['sake']},

  {id:'kannushi-3',client:'kannushi',title:'山を祀る場所',
   text:'人の手が入らない林は、夜明けごとに手入れがひとつ落ちてまいります。\n家に小さな神棚を設え、お神酒を供えてはいただけませんか。',
   doneText:'山を思う場所ができましたね。\n神棚をさらに整える方法を、お教えいたしましょう。',
   give:{kind:'kamidana',need:1},days:null,pay:0,unlocks:['kamidana-2'],
   needs:'sake'},

  {id:'kannushi-4',client:'kannushi',title:'一日、山に礼を尽くす',
   text:'一日、山に礼を尽くしてごらんなさい。苗を植えるくらい最高の判定で、二本以上。\nその日にそなたが伐る木を、すべてS評価にできますでしょうか。',
   doneText:'そういう日が、山を変えるのでございます。',
   give:{kind:'all-S-day',minFells:2,need:1},days:null,pay:0,unlocks:['sake']},

  {id:'kannushi-5',client:'kannushi',title:'社の材を納める',
   text:'社の材を。段階ごとに、お持ちくださいませ。',
   doneText:'……社が戻りました。祭りの支度を、始めましょう。',
   give:{kind:'shrine'},days:null,pay:0,unlocks:['miyadaiku'],needs:'shrine'}
];

/* ══════════ 頼み事（全依頼達成後の逆依頼） ══════════
   その依頼主の依頼をすべて終えたときだけ解禁。夕方の枠は使わず、
   お金＋木材で少しだけ手伝ってもらう。金は「好物の差し入れ」と言い換えて渡す
   （生々しい金額を直接見せない）。使うと中2日休み（world.js の FAVOR_COOLDOWN）。
   神主は依頼そのものに期限が無く性質が違うため対象外。                       */
const FAVORS={
  builder:{client:'builder',title:'かち割ってもらう',gift:'菓子代',cost:25000,
    flavor:'数を揃えたいなら、割っちまえばいい。品は落ちるけどな。'},
  dealer:{client:'dealer',title:'急ぎ乾かしてもらう',gift:'酒代',cost:35000,
    flavor:'うちの窯で急がせるわ。まる乾きとはいかないけどね。'},
  sakichi:{client:'sakichi',title:'板に挽いてもらう',gift:'花代',cost:30000,
    flavor:'同じ種を三本持ってこい。……手が空いてる日ならな。'},
  owner:{client:'owner',title:'山の主の威風',gift:'本代',cost:30000,
    flavor:'……いいよ、少しだけ。祖父の山だから、無理はきくんだ。'}
};

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
  if(g.kind==='kamidana')
    return {now:(WORLD.kamidana?.level||0)>=1?1:0,max:1};
  if(g.kind==='shrine')
    return {now:WORLD.shrine?.stage||0,max:5};
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
  if(id==='kannushi-5')WORLD.shrine.started=true;
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
  if(key==='sake'){
    WORLD.inv.sake=(WORLD.inv.sake||0)+1;
    WORLD.unlocks.sake=true;
  }
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
