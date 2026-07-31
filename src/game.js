let SCREEN='map', T=null, S=null, sel=-1, stand=[], sortKey='price', sortDir=-1;
let mapChoice=0;
const FOREST_ART=i=>`assets/forest-${i}-${['near','stream','okuyama','miyama','snow'][i]}.png`;
const treeEst=t=>Math.max(5,Math.round(t.est/AXES[WORLD.axe].power/5)*5);
const treePotential=t=>t.potential||(t.defect?'rot':'normal');
const dogSense=t=>({rot:0,normal:1,fine:2}[treePotential(t)]);
const dogSenseMark=t=>({rot:'！',normal:'○',fine:'◎'}[treePotential(t)]);

/* ══════════ 犬のコマ送り ══════════
   assets/<犬>-animation/<状態>/0.png … を順に差し替える。
   コマ絵を持たない犬は1枚絵のまま。持っている犬だけ動く。 */
const DOG_ANIMS={
  idle:{frames:4,ms:420,loop:true},
  joy:{frames:6,ms:130,loop:false},
  inspect:{frames:5,ms:220,loop:false},
  fail:{frames:5,ms:240,loop:false},
  sleep:{frames:4,ms:520,loop:true}
};
let dogAnimToken=0,dogAnimTimer=null;
const dogFrame=(k,state,i)=>`assets/${k}-animation/${state}/${i}.png`;
const DOG_HAS_FRAMES={};
const DOG_HAS_SLEEP={};
for(const k of ['shiba','akita','kai','kishu']){
  const probe=new Image();
  probe.onload=()=>{
    DOG_HAS_FRAMES[k]=true;
    for(const [state,cfg] of Object.entries(DOG_ANIMS))
      for(let i=0;i<cfg.frames;i++){const im=new Image();im.src=dogFrame(k,state,i)}
    if(typeof mascotDog==='function'&&mascotDog()===k&&SCREEN!=='night')updateForestMascot();
  };
  probe.src=dogFrame(k,'idle',0);
  const sleepProbe=new Image();
  sleepProbe.onload=()=>{DOG_HAS_SLEEP[k]=true;if(SCREEN==='night')updateNightDog()};
  sleepProbe.src=dogFrame(k,'sleep',0);
}
function stopDogAnimation(){
  dogAnimToken++;
  if(dogAnimTimer){clearTimeout(dogAnimTimer);dogAnimTimer=null}
}
/* 動かせたら true。動かせなければ呼び元が1枚絵で処理する。
   loop を渡すと DOG_ANIMS の既定を上書きできる。
   「良い木を指している間」「結果が良い間」はずっと反応を続けたいので、
   見立てと結果画面はここで loop:true を渡して呼ぶ（1回で収まらないように）。 */
function playDogAnimation(state,{afterSrc=null,hold=false,loop=null}={}){
  const k=mascotDog();
  if(!k||!DOG_HAS_FRAMES[k]||!DOG_ANIMS[state])return false;
  const el=$('forest-mascot'),cfg=DOG_ANIMS[state],token=++dogAnimToken;
  const doLoop=loop!=null?loop:cfg.loop;
  if(dogAnimTimer)clearTimeout(dogAnimTimer);
  el.onerror=null;              /* 1枚絵の落とし込みと喧嘩させない */
  let i=0;
  const step=()=>{
    if(token!==dogAnimToken||mascotDog()!==k)return;
    el.src=dogFrame(k,state,i);
    i++;
    if(i<cfg.frames){dogAnimTimer=setTimeout(step,cfg.ms);return}
    if(doLoop){i=0;dogAnimTimer=setTimeout(step,cfg.ms);return}
    dogAnimTimer=null;
    if(afterSrc)el.src=afterSrc;
    else if(!hold)playDogAnimation('idle');
  };
  step();
  return true;
}
function newRun(tree){
  T=tree;
  S={phase:0,edge:100,swings:0,spin:0,
     lean0:rnd(-Math.PI,Math.PI),leanDeg:tree.leanBase,
     wind0:rnd(-Math.PI,Math.PI),windSpd:rnd(1.5,6.5),
     target0:rnd(-rad(40),rad(40)),
     face:'diag',nDiag:0,nHoriz:0,nAngle:55,
     backDepth:0,backHits:[],backH:3,skew:0,wedges:0,
     felling:false,fellAngle:0,fellVel:0,fellAz:0,actualErr:0,
     barber:false,over:false,done:false};
}
const notchDepth=()=>Math.min(S.nDiag,S.nHoriz);
const notchGap  =()=>Math.abs(S.nDiag-S.nHoriz);
const hingeRatio=()=>clamp(1-notchDepth()-S.backDepth,0,1);
const gapCm    =()=>notchGap()*T.D*100;   // 上下のずれを cm で

/* ══════════ 物理 ══════════ */

const GUIDE=[
'',
'',
''];

/* ══════════ 画面更新 ══════════ */
function topbar(){
  $('tb-day').textContent=WORLD.day;
  $('tb-money').innerHTML=yen(WORLD.money)+'<u> 円</u>';
  $('tb-sta').textContent=Math.round(WORLD.stamina);
  $('tb-sta').className=WORLD.stamina<25?'ng':'';
  $('tb-place').textContent=WORLD.at>=0?FORESTS[WORLD.at].name:'木こり';
  const on=SCREEN==='play';
  $('tb-edgw').classList.toggle('hide',!on);
  if(on)$('tb-edg').innerHTML=Math.round(S.edge)+'<u>%</u>';
}
function refresh(){
  topbar();
  if(SCREEN!=='play')return;
  ['p0','p1','p2'].forEach((id,i)=>{
    $(id).className='ph'+(i===S.phase?' on':i<S.phase?' done':'')});
  $('guide').innerHTML=GUIDE[Math.min(S.phase,2)];
  $('dialbox').classList.toggle('hide',S.phase!==0);
  $('cutbox').classList.toggle('hide',!(S.phase===1||S.phase===2));
  if(S.phase===0)drawDial();
  if(S.phase===1||S.phase===2)drawSection();
  drawEval(); updateWorld3();
}
function setEvalFolded(folded){
  const el=$('eval');
  const foldable=S&&S.phase>=1&&S.phase<=2;
  el.classList.toggle('foldable',foldable);
  el.classList.toggle('collapsed',foldable&&folded);
  $('eval-toggle').textContent=foldable&&!folded?'評価詳細 −':'評価詳細 ＋';
}
$('eval-toggle').onclick=()=>setEvalFolded(!$('eval').classList.contains('collapsed'));

/* ══════════ 操作盤 ══════════ */
function buildActs(){
  const a=$('acts');a.innerHTML='';a.className='';
  const B=(t,cls,fn,dis,parent=a)=>{const b=document.createElement('button');
    b.innerHTML=t;b.className=cls||'';b.onclick=fn;b.disabled=!!dis;parent.appendChild(b)};
  const ROW=(kind)=>{const row=document.createElement('div');row.className=`act-row ${kind}`;a.appendChild(row);return row};
  const GRP=(cap,mi,val,pl)=>{const g=document.createElement('div');g.className='grp';
    const c=document.createElement('span');c.className='cp';c.textContent=cap;
    const bm=document.createElement('button');bm.textContent='◀';bm.onclick=mi;
    const v=document.createElement('span');v.className='val';v.textContent=val;
    const bp=document.createElement('button');bp.textContent='▶';bp.onclick=pl;
    g.append(c,bm,v,bp);a.appendChild(g)};

  if(SCREEN==='forest'){
    const t=sel>=0?stand[sel]:null;
    B('この木を伐る','key',()=>startRun(),sel<0);
    B('見立て一覧','',()=>{drawList();$('listov').classList.remove('hide')});
    B('地図へ戻る','',()=>toMap());
    B('伐採を終える','',()=>toEvening());
    return;
  }
  if(SCREEN!=='play')return;
  if(S.phase===0){
    GRP('回す',()=>{S.spin-=rad(2);refresh();buildActs()},
        Math.round(deg(S.spin))+'°',()=>{S.spin+=rad(2);refresh();buildActs()});
    B('◀◀ 速く','',()=>{S.spin-=rad(10);refresh();buildActs()});
    B('速く ▶▶','',()=>{S.spin+=rad(10);refresh();buildActs()});
    B('この向きで切る','key',()=>goto(1));
  }
  if(S.phase===1){
    a.className='cut-actions';
    const top=ROW('two'),middle=ROW('one'),bottom=ROW('three');
    B('斜め切り △',S.face==='diag'?'sel':'',()=>{S.face='diag';buildActs()},false,top);
    B('水平切り ■',S.face==='horiz'?'sel':'',()=>{S.face='horiz';buildActs()},false,top);
    B('振る','key',swing,WORLD.stamina<swingCost(),middle);
    B(`研ぐ（砥石${WORLD.inv.stone}）`,'',sharpen,S.edge>96||WORLD.inv.stone<1,bottom);
    const nd=notchDepth();
    B('追い口へ →',nd>=0.22&&nd<=0.35?'key':'',()=>goto(2),false,bottom);
    B('明日に続く','',postponeCut,false,bottom);
  }
  if(S.phase===2){
    a.className='cut-actions';
    const top=ROW('split'),bottom=ROW('three');
    B('振る','key',swing,WORLD.stamina<swingCost(),top);
    B('倒す',hingeRatio()<=0.12?'key':'',()=>fell(false),false,top);
    B(`研ぐ（砥石${WORLD.inv.stone}）`,'',sharpen,S.edge>96||WORLD.inv.stone<1,bottom);
    B(`楔を打つ（楔${WORLD.inv.wedge}）`,'',useWedge,
      WORLD.inv.wedge<1||S.wedges>=2,bottom);
    B('明日に続く','',postponeCut,false,bottom);
  }
  if(S.phase!==1&&S.phase!==2)B('明日に続く','',postponeCut);
}
const say=h=>{$('say').innerHTML=h};

/* ══════════ 画面遷移 ══════════ */
function hideAll(){
  stopDogAnimation();
  ['mapov','listov','evov','nightov'].forEach(i=>$(i).classList.add('hide'));
  $('forest-mascot').classList.add('hide');
  $('result').classList.remove('show');
  ['eval','treecard','dialbox','cutbox','phase','gauge'].forEach(i=>$(i).classList.add('hide'));
  $('vg').classList.add('hide');
  /* 選択の輪は林のグリッド上の座標を持つ。伐倒中は木が原点へ移るので、
     消さないと輪だけ横に取り残される */
  ringSel.visible=false; ringHov.visible=false;
}
const STORY_QUEUE=[];
function showStory({label='',title='',body='',button='わかった',cancel=null,art=null,onConfirm=null}){
  if(!$('storyov').classList.contains('hide')){
    STORY_QUEUE.push({label,title,body,button,cancel,art,onConfirm});return;
  }
  $('story-label').textContent=label;
  $('story-title').textContent=title;
  $('story-body').textContent=body;
  $('story-ok').textContent=button;
  $('story-cancel').textContent=cancel||'';
  $('story-cancel').classList.toggle('hide',!cancel);
  const img=$('story-art');
  if(art){img.src=art;img.classList.remove('hide')}else{img.src='';img.classList.add('hide')}
  $('storyov').classList.remove('hide');
  const closeStory=run=>{
    $('storyov').classList.add('hide');
    if(run&&onConfirm)onConfirm();
    const next=STORY_QUEUE.shift();if(next)showStory(next);
  };
  $('story-ok').onclick=()=>closeStory(true);
  $('story-cancel').onclick=()=>closeStory(false);
}
function toMap(){
  SCREEN='map'; hideAll(); gaugeOff();
  updateForestMascot();
  standGrp.visible=false; stumpGrp.visible=false; pivot.visible=false;
  targetGrp.visible=false; predLine.visible=false; axe.visible=false;
  ringSel.visible=false; ringHov.visible=false;
  WORLD.at=-1; mapChoice=WORLD.lastForest??0;
  $('guide').innerHTML=''; say(''); $('acts').innerHTML='';
  $('map-h').innerHTML=`${WORLD.moves===0?'朝　—　どこへ行くか':'次はどこへ行くか'}<span class="daymark" aria-hidden="true"></span>`;
  const req=requestLine();
  /* 昨日Sを取った林に苗が植わったことを朝に知らせる */
  const planted=(WORLD.morning.planted||[])
    .map(p=>`${FORESTS[p.forest]?.name} に苗 ${p.n}本`).join('　');
  const seed=planted?`<br><g>${planted}</g>　残り本数と上限が増えた。`:'';
  $('map-sub').innerHTML=WORLD.moves===0
    ?`体力 100 ＋${WORLD.morning.carry} 繰り越し ＋${WORLD.morning.bento} 弁当 ＝ <b class="mn">${Math.round(WORLD.stamina)}</b><br>${req}${seed}`
    :`いまの体力 <b class="mn">${Math.round(WORLD.stamina)}</b>　—　移動するたびに体力を使う。`;
  drawMap(); previewForest(mapChoice); drawRecordSlots(); topbar();
  $('mapov').classList.remove('hide');
  showTutorial('map');
}
/* 甲斐犬の一段目 — 翌日どの林が当たりかを予報する。
   夜明けに全5林の16本が確定しているので、実値を読める（SPEC §16.2）。
   「たぶん良い」ではなく「本当に良い」を教える能力（ROADMAP §11.7）。 */
function forecastLine(f){
  if(!hasDog('kai'))return '';
  const list=WORLD.stands?.[f.id]; if(!Array.isArray(list))return '';
  const alive=list.filter(t=>!t.cut);
  const toku=alive.filter(t=>t.grade==='特等').length;
  const ichi=alive.filter(t=>t.grade==='一等').length;
  const score=toku*2+ichi;
  const mark=score>=6?'◎◎◎':score>=4?'◎◎':score>=2?'◎':'—';
  return `<div class="calc" style="text-align:left">
    <span class="mid">${DOGS.kai.name}</span>　${mark}
    　<span class="off">特等 ${toku}・一等 ${ichi}</span></div>`;
}
function previewForest(i){
  if(!FORESTS[i])return;
  $('map-bg').src=FOREST_ART(i);
  $('map-bg').className=`forest-scene tone-${i}`;
}
function drawMap(){
  $('mapcards').innerHTML=FORESTS.map((f,i)=>{
    if(!f.unlocked){
      /* 許可と所持金は別に見せる。混ぜると、金が足りているのに金額が赤くなって
         「金が足りない」と読まれてしまう */
      const permitted=!f.requires||WORLD.unlocks[f.requires];
      const affordable=WORLD.money>=f.price;
      const can=permitted&&affordable;
      const todo={miyama:'大工の棟梁の依頼を果たすと開く。',
                  snow:'山の持ち主に道をならすよう頼まれている。果たすと開く。'}[f.requires]
                 ||'まだ入る道がない。';
      return `<div class="fcard lock" data-preview="${i}"><h2>${f.name}</h2>
        <div class="mix">未踏の林</div>
        <div class="note">${f.note}</div>
        ${permitted?'':`<div class="note mid">${todo}</div>`}
        <div class="cost"><em>開くには</em><b class="${affordable?'':'ng'}">${yen(f.price)}</b></div>
        <div class="after">${affordable?'':'お金が足りない'}</div>
        <div style="margin-top:10px"><button data-buy="${i}" ${can?'':'disabled'}>この林を開く</button></div>
      </div>`}
    const st=stockState(f), tc=travelCost(f), cost=travelPay(f), ok=WORLD.stamina>=cost;
    const roadCut=f.travelBase-tc, mornCut=tc-cost;
    let calc='';
    if(roadCut>0||mornCut>0){
      calc=`基礎 ${f.travelBase}`;
      if(roadCut>0) calc+=` <u>− 道の手入れ ${roadCut}</u>`;
      if(mornCut>0) calc+=` <u>− 朝の1回目 ${mornCut}</u>`;
    }
    const gap=WORLD.day-f.lastVisit;
    const mixTotal=Object.values(f.mix).reduce((a,b)=>a+b,0);
    const mix=Object.entries(f.mix).filter(([,v])=>v>0)
      .map(([k,v])=>`${SPECIES[k].name} ${Math.round(v/mixTotal*100)}%`).join('　');
    return `<div class="fcard ${st.c==='ng'?'poor':''} ${mapChoice===i?'chosen':''}" data-go="${i}">
      <h2>${f.name}</h2><div class="mix">${mix}</div>
      <div class="fr"><span>手入れ度</span>
        <span class="meter"><i style="width:${f.care}%;background:${f.care>=70?'#7fa85c':f.care>=40?'#d4a94e':'#c04a32'}"></i></span></div>
      <div class="fr"><span>平均の太さ</span><b>${Math.round(f.avgD*100)}cm</b></div>
      <div class="fr"><span>残り本数</span><b class="${st.c}">${f.stock} / ${f.maxStock}</b></div>
      <div class="fr"><span>林の状態</span><b class="${st.c}">${st.n}</b></div>
      <div class="fore"><span class="lb">出る品等の目安</span><b>${gradeRange(f)}</b>${forecastLine(f)}</div>
      <div class="note">${gap>90?'まだ行ったことがない。':`前回から ${gap} 日`}${
        f.care>=60?'　枝打ちが効いてきている。':''}</div>
      <div class="cost"><em>移動に使う体力</em><b class="${ok?'':'ng'}">${cost>0?'−'+cost:'0'}</b></div>
      ${calc?`<div class="calc">${calc}</div>`:''}
      <div class="after">着いたとき 体力 <b class="${ok?'':'ng'}">${ok?Math.round(WORLD.stamina)-cost:'足りない'}</b></div>
    </div>`}).join('');
  $('mapcards').querySelectorAll('.fcard').forEach(el=>{
    const i=el.dataset.go??el.dataset.preview;
    if(i===undefined)return;
    el.onmouseenter=()=>previewForest(+i);
    el.onmouseleave=()=>previewForest(mapChoice);
  });
  $('mapcards').querySelectorAll('[data-go]').forEach(el=>el.onclick=()=>{
    mapChoice=+el.dataset.go; previewForest(mapChoice); drawMap()});
  $('mapcards').querySelectorAll('[data-buy]').forEach(el=>el.onclick=e=>{
    e.stopPropagation();
    const i=+el.dataset.buy, f=FORESTS[i];
    if((f.requires&&!WORLD.unlocks[f.requires])||WORLD.money<f.price)return;
    WORLD.money-=f.price; f.unlocked=true; mapChoice=i; previewForest(i); drawMap(); topbar()});
  const go=$('map-go'), f=FORESTS[mapChoice];
  go.disabled=!f||!f.unlocked||WORLD.stamina<travelPay(f);
}
function travel(i){
  const f=FORESTS[i];
  WORLD.stamina-=travelPay(f); WORLD.moves++; WORLD.at=i; WORLD.lastForest=i;
  /* 訪れた林を覚える。2つ目に入ると山の持ち主が現れる（ROADMAP §12.2） */
  WORLD.forestsSeen??=[]; if(!WORLD.forestsSeen.includes(i))WORLD.forestsSeen.push(i);
  WORLD.forestsToday??=[]; if(!WORLD.forestsToday.includes(i))WORLD.forestsToday.push(i);
  f.lastVisit=WORLD.day;
  ensureDailyStands();
  stand=WORLD.stands[i]; buildStand(f);
  soundBird();
  toForest();
  if(WORLD.pendingCut?.forestId===i)resumeCut();
}
function toForest(){
  SCREEN='forest'; hideAll();
  standGrp.visible=true; stumpGrp.visible=true; pivot.visible=false;
  targetGrp.visible=false; predLine.visible=false; axe.visible=false;
  $('treecard').classList.remove('hide');
  updateForestMascot();
  $('tc-empty').classList.remove('hide'); $('tc-body').classList.add('hide');
  $('guide').innerHTML='';
  say('');
  fitStand(); orb.az=0; orb.el=.22; orb.tgt.set(0,8,0);
  sel=-1; ringSel.visible=false;
  buildActs(); topbar();
  showTutorial('forest');
}
function startRun(){
  if(sel<0)return;
  SCREEN='play'; hideAll();
  updateForestMascot();
  newRun(stand[sel]); buildTree();
  standGrp.visible=false; stumpGrp.visible=false; pivot.visible=true;
  targetGrp.visible=true; predLine.visible=true;
  rend.domElement.style.cursor='default';
  $('eval').classList.remove('hide');
  $('phase').classList.remove('hide'); $('gauge').classList.remove('hide');
  orb.az=2.4; orb.el=.24; orb.r=46;
  goto(0);
  say('盤を回して、白い矢印を緑の印に重ねる。');
}
function resumeCut(){
  const p=WORLD.pendingCut;
  if(!p||p.forestId!==WORLD.at||!stand[p.treeIndex]||stand[p.treeIndex].cut)return;
  sel=p.treeIndex;T=stand[sel];S=JSON.parse(JSON.stringify(p.state));
  SCREEN='play';hideAll();updateForestMascot();buildTree();
  standGrp.visible=false;stumpGrp.visible=false;pivot.visible=true;
  targetGrp.visible=true;predLine.visible=true;
  rend.domElement.style.cursor='default';
  $('eval').classList.remove('hide');$('phase').classList.remove('hide');
  orb.az=2.4;orb.el=.24;orb.r=46;
  goto(S.phase);refresh();buildActs();
  say('昨日の切り口から続きを始める。');
}
function postponeCut(){
  if(SCREEN!=='play'||!S||S.phase>=3)return;
  showStory({label:'伐採を中断する',title:'明日に続けますか？',
    body:'切り口を養生して、今日は夕方へ進みます。\n明日は同じ木の続きから再開できます。',
    button:'明日に続ける',cancel:'切り続ける',onConfirm:()=>{
      WORLD.pendingCut={forestId:WORLD.at,treeIndex:sel,state:JSON.parse(JSON.stringify(S))};
      gaugeOff();say('切り口を養生した。明日、同じ木の続きを切れる。');
      setTimeout(toEvening,250);
    }});
}
function goto(ph){
  S.phase=ph; gaugeOff();
  if(ph===0){want.r=26;want.ty=7.5;$('vg').classList.add('hide')}
  if(ph===1){want.r=3.2;want.ty=.95;
    say('受け口を刻む。<b>斜め</b>と<b>水平</b>を交互に、同じ深さで出会わせる。');
    setTimeout(()=>{if(S.phase===1)gaugeOn(false)},350)}
  if(ph===2){want.r=3.2;want.ty=.95;
    say('追い口。縦のバーで<b>入れる高さ</b>を決める。緑の帯が適正。');
    setTimeout(()=>{if(S.phase===2)gaugeOn(true)},350)}
  buildActs(); refresh(); setEvalFolded(ph===1||ph===2);
  /* 向きを決める場面と、斧を入れる場面で一度ずつ */
  if(ph===0)showTutorial('aim');
  if(ph===1)showTutorial('cut');
}

/* ══════════ 斧 ══════════ */
function swing(){
  if(SCREEN!=='play')return;
  if((S.phase!==1&&S.phase!==2)||!gRun||gCool>0)return;
  if(WORLD.stamina<swingCost()){
    gaugeOff();say('<s>今日はもう斧を振れない。</s>「明日に続く」で切り口を養生する。');
    buildActs();return;
  }
  const q=quality(), h=gVert?curHeight():0;
  gaugeOff(); gCool=.42;
  soundChop();
  mascotReact(q===2?'critical':'chop');
  WORLD.stamina-=swingCost(); S.swings++;
  S.edge=Math.max(0,S.edge-3-T.knots/40);
  axeT=0; axeSide=S.phase===1?-1:1; axe.visible=true; spawnChips(axeSide);

  const base=(0.052+(S.edge/100)*0.016)*(0.40/T.D);
  const bite=base*POW[q]*AXES[WORLD.axe].power;
  const qs=q===2?'<g>会心</g>　':q===1?'':'<s>浅い</s>　';

  if(S.phase===1){
    if(S.face==='diag')S.nDiag=clamp(S.nDiag+bite,0,.55);
    else               S.nHoriz=clamp(S.nHoriz+bite,0,.55);
    if(q===0)S.skew+=rnd(-.08,.08);
    const d=notchDepth()*100, dcm=notchDepth()*T.D*100, gc=gapCm();
    let t;
    if(gc>3) t = S.nDiag>S.nHoriz
      ? `斜めが <b>${gc.toFixed(0)}cm</b> 先に行っている。次は<b>水平切り</b>。`
      : `水平が <b>${gc.toFixed(0)}cm</b> 先に行っている。次は<b>斜め切り</b>。`;
    else if(d<20)  t='<g>ぴたり合っている。</g>まだ浅い。';
    else if(d<=35) t='<g>ぴたり合って、適正な深さ。</g>追い口へ移れる。';
    else           t='<s>深追い。</s>ツルが取れなくなる。';
    say(`${qs}受け口 <b>${d.toFixed(0)}%</b>（${dcm.toFixed(0)}cm）<br>${t}`);
    setTimeout(()=>{if(S.phase===1)gaugeOn(false)},430);
  }else{
    const prev=S.backHits.length?S.backH:h;
    S.backHits.push(h);
    S.backH=S.backHits.reduce((a,b)=>a+b,0)/S.backHits.length;
    if(Math.abs(h-prev)>3){S.skew+=rnd(-.12,.12)}
    S.backDepth=clamp(S.backDepth+bite,0,.92);
    const hp=hingeRatio()*100;
    refresh();
    if(Phys.barberRisk()>.55){S.barber=true;fell(true);return}
    if(hp<=3||Phys.stressRatio()>1){S.over=hp<=3;fell(true);return}
    const wander=Math.abs(h-prev)>3?'<s>切り口が蛇行した。</s>':'';
    const t = hp>16?'まだ余裕がある。':hp>12?'もう少し。'
            : hp>=8?'<g>好機。今なら舵が効く。</g>':'<s>限界。すぐ倒せ。</s>';
    const hingeGuide=S.backHits.length>=2
      ?'<br><em class="hinge-guide">目標ツル（8〜12％）</em>':'';
    say(`${qs}高さ <b>${h>0?'+':''}${h.toFixed(1)}cm</b>　ツル <b>${hp.toFixed(0)}%</b><br>${wander}${t}${hingeGuide}`);
    setTimeout(()=>{if(S.phase===2)gaugeOn(true)},430);
  }
  refresh(); buildActs();
  if(WORLD.stamina<=0){WORLD.stamina=0;say('<s>今日はここまで。</s>切り口を養生して明日に続けられる。');buildActs()}
}
function sharpen(){
  if(WORLD.inv.stone<1)return;
  WORLD.inv.stone--; S.edge=100;
  say('砥石をあてた。<b>切れ味 100%</b>');
  refresh(); buildActs();
}
function useWedge(){
  if(S.phase!==2||S.wedges>=2||WORLD.inv.wedge<1)return;
  WORLD.inv.wedge--; S.wedges++;
  soundWedge();
  mascotReact('wedge');
  const err=Phys.predErr();
  say(`楔を ${S.wedges} 本打った。予想線が動いた。${err<=3?'<g>目標へ届く。</g>':'盤を回して白い矢印を緑へ近づける。'}`);
  refresh(); buildActs();
}

/* ══════════ 伐倒・結果 ══════════ */
function fell(forced){
  if(S.phase>=3)return;
  gaugeOff(); $('vg').classList.add('hide');
  S.phase=3; S.felling=true; S.done=false;
  soundFall();
  mascotReact('fall');
  if(!S.backHits.length)S.backH=0;
  if(!S.barber)S.barber=Phys.barberRisk()>.55;
  const dr=Phys.drift()+(S.barber?rnd(-1.1,1.1):0)+(S.over?rnd(-.5,.5):0);
  S.fellAz=dr; S.fellVel=.14;
  S.actualErr=Math.abs(deg(dr-Phys.targetAz()));
  want.r=30; want.ty=6.5;
  $('acts').innerHTML='';
  if(S.barber)say('<s>裂けた。</s>バーバーチェア — 受け口が浅いまま追い口を深追いした。');
  else if(S.over)say('<s>ツルを切りすぎた。</s>舵が無い。');
  else if(forced)say('木は自重で倒れていく。');
  else say('倒れる。');
  setTimeout(()=>{S.done=true;showResult()},3600);
}
const TIPS={
  dir:'倒す精度：予想（白）が目標（緑）に重なるよう調整してから切り始める。',
  hin:'ツルの幅：追い口は8〜12%で止める。10%を切ったらもう振らず「倒す」。',
  ntc:'受け口の深さ：直径の22〜35%。浅いと裂け、深いとツルが取れない。',
  ang:'受け口の開き：45〜70°。狭いと倒れる途中で受け口が閉じ、ツルが折れて舵を失う。',
  gap:'切り口の合わせ：断面図で線がはみ出している面が先行している側。'+
      '3cm以上ずれたら反対の面に持ち替える。両方が揃った深さまでしか木片は抜けない。',
  hgt:'追い口の高さ：縦バーの緑帯（+2〜+5cm）で止める。毎回そこを狙えば切り口も蛇行しない。',
  eff:'振った数：会心（黄の帯）で止めれば食い込みが1.5倍、外しても0.75倍は進む。狙う価値はある。'};

function showResult(){
  let total=0,rows='',worst=null,gap=-1;
  for(const c of CRIT){
    let v=c.get(); if(v===null||v===undefined)v=0;
    const s=c.score(v); total+=s;
    if(c.max-s>gap){gap=c.max-s;worst=c}
    rows+=`<div class="rrow"><span>${c.n}</span><b class="${c.state(v)}">${c.fmt(v)}</b><em>${s}/${c.max}</em></div>`;
  }
  if(S.barber)total=Math.round(total*.2);
  else if(S.over)total=Math.round(total*.7);
  const rank=total>=88?'S':total>=74?'A':total>=58?'B':total>=40?'C':'D';
  /* 結果画面が出ている間はずっと反応を続ける。事故ならずっと悲しみ、
     好成績ならずっと喜ぶ。コマ絵が無ければ従来の跳ね（1回きり）で代える */
  if(S.barber||S.over||rank==='D')playDogAnimation('fail',{loop:true});
  else if(total>=74&&!playDogAnimation('joy',{loop:true}))mascotReact('good');
  const mult=S.barber?.3:{S:2.0,A:1.5,B:1.15,C:.85,D:.6}[rank];
  const potential=treePotential(T);
  const hiddenMult=potential==='rot'?.55:potential==='fine'?1.25:1;
  const pay=Math.round(T.price*mult*hiddenMult/100)*100;

  $('rank').textContent=rank;
  $('rank').style.color=rank==='S'?'#d4a94e':rank==='D'?'#c04a32':'#e9e3d5';
  $('rsub').textContent=S.barber?'バーバーチェア — 材が裂けた'
    :S.over?'ツル切れ — 制御を失った':`${T.name}・${T.grade}　${total}点`;
  rows+=`<div class="rrow"><span>残り体力</span><b>${Math.max(0,Math.round(WORLD.stamina))}</b><em>—</em></div>`;
  if(T.defect)rows+=`<div class="rrow"><span class="ng">隠れ腐れ（伐って判明）</span><b class="ng">芯に空洞</b><em>×0.55</em></div>`;
  /* 犬がいないのに「犬の見立て通り」と出ていた。見立てた犬がいるときだけ言う */
  if(potential==='fine')rows+=`<div class="rrow"><span class="ok">芯が締まった良材</span><b class="ok">${
    hasDog('shiba')?'犬の見立て通り':'伐ってわかった'}</b><em>×1.25</em></div>`;
  $('rrows').innerHTML=rows;
  $('pay').innerHTML=yen(pay)+'<u> 円</u>';
  $('advice').textContent=T.defect
    ?(hasDog('shiba')?'柴犬は気づいていた。見立ての印を信じてよい。'
                     :'外からは見えない腐れだった。犬がいれば伐る前に気づけたはずだ。')
    :potential==='fine'?(hasDog('shiba')?'芯まで締まった良材だった。柴犬は伐る前から気づいていた。'
                                        :'芯まで締まった良材だった。外からは見えない。犬がいれば気づけた。')
    :S.barber?'受け口を直径の18%以上刻んでから追い口に入ること。浅いまま追うと幹が縦に裂け上がる。'
    :TIPS[worst.k];

  // 林への反映（売る・取っておく・依頼へ納めるの決定は下で行う）
  const f=FORESTS[WORLD.at];
  f.stock=Math.max(0,f.stock-1);
  f.avgD=clamp(f.avgD+(T.D<f.avgD?0.004:-0.006),0.18,0.62);
  if(f.stumps.length<24&&nodes[sel])
    f.stumps.push({x:nodes[sel].pos.x,z:nodes[sel].pos.z,r:T.D/2});
  if(nodes[sel]){nodes[sel].cut=true;nodes[sel].group.visible=false;
    if(nodes[sel].shadow)nodes[sel].shadow.visible=false}
  T.cut=true;
  if(WORLD.pendingCut?.forestId===WORLD.at&&WORLD.pendingCut.treeIndex===sel)WORLD.pendingCut=null;

  // 次の行動
  const ra=$('rActs'); ra.innerHTML='';
  const B=(t,cls,fn,dis)=>{const b=document.createElement('button');
    b.textContent=t;b.className=cls||'';b.onclick=fn;b.disabled=!!dis;ra.appendChild(b)};
  const cap=lumberCapacity();
  /* 採点を木に残す。納品条件（採点B以上）と倉庫の記録に使う */
  T.rank=rank;
  /* 行い型の依頼（事故なく／間伐／お神酒）と、その日の会心数を数える */
  noteFell({rank,accident:S.barber||S.over,D:T.D,offered:!!T.offered});
  let settled=false;
  const finish=(mode,next,reqId)=>{
    if(settled)return;
    if(mode==='sell')WORLD.money+=pay;
    if(mode==='keep')WORLD.lumber.push(logFromTree(T,pay,rank));
    if(mode==='request')deliverToRequest(T,reqId);
    settled=true;$('result').classList.remove('show');next();
  };
  B(`売る　${yen(pay)}円`,'key',()=>finish('sell',toForest));
  B(`取っておく　${WORLD.lumber.length}/${cap}`,'',()=>finish('keep',toForest),WORLD.lumber.length>=cap);
  /* 合う依頼が複数あることがあるので、相手ごとにボタンを出す */
  for(const r of WORLD.requests){
    if(partIndexFor(r,T)<0)continue;
    const p=reqProgress(r);
    B(`${clientName(r.client)}へ納める　${p.now+1}/${p.max}`,'',
      ()=>finish('request',toForest,r.id));
  }
  B('売って地図へ','',()=>finish('sell',toMap));
  B('売って伐採を終える','',()=>finish('sell',toEvening));
  if(total>=74)soundSuccess();
  $('result').classList.add('show');
  showTutorial('result');
}

/* ══════════ 木材・短期依頼 ══════════ */
/* 秋田犬は荷の犬。一段目 +6、二段目 +10（ROADMAP §11.7） */
const lumberCapacity=()=>(WORLD.buildings.shed?20:5)+({0:0,1:6,2:10}[dogStage('akita')]||0);
/* bornGrade … 伐ったときの品等。乾燥で grade が1段上がっても元が残る（ROADMAP §11.4）
   rank      … 採点。棟梁3「B以上で四本」の判定に使う
   D         … 直径。太さの依頼に使う                                        */
const logFromTree=(t,salePrice=0,rank=null)=>({
  id:t.id||t.species,species:t.id||t.species,name:t.name,
  grade:t.grade,bornGrade:t.bornGrade||t.grade,
  rank:rank||t.rank||null,D:t.D,volume:t.volume,
  dried:!!t.dried,processed:t.processed||0,furniture:t.furniture||null,
  salePrice:salePrice||t.salePrice||0});
function logSaleValue(log){
  const sp=SPECIES[log.species],gr=GRADES.find(x=>x.name===log.grade)||GRADES[GRADES.length-1];
  const born=GRADES.find(x=>x.name===(log.bornGrade||log.grade))||gr;
  /* 伐倒時の腕前・隠れ性質を含む価格は残し、乾燥で上がった品等の倍率差だけ加える。 */
  const base=log.salePrice
    ?Math.round(log.salePrice*(gr.mult/born.mult)/100)*100
    :Math.round(log.volume*sp.unit*gr.mult/100)*100;
  const furnitureMult={座卓:8,椅子:5,風呂桶:6,まな板:4,建具:5,箱:4};
  const mult=log.furniture?(furnitureMult[log.furniture]||4):(log.processed||0)>=1?1.6:1;
  return Math.round(base*mult/100)*100;
}
function deliverStoredLog(index){
  const log=WORLD.lumber[index];
  if(!log||!requestMatches(log))return;
  WORLD.lumber.splice(index,1);
  const r=deliverToRequest(log);
  nightMessage(`倉庫の木を${clientName(r?.client||'builder')}へ納めた。`);
  drawNight();topbar();
}
function sellStoredLog(index){
  const log=WORLD.lumber[index];if(!log)return;
  const value=logSaleValue(log);
  WORLD.lumber.splice(index,1);WORLD.money+=value;
  soundBuy();nightMessage(`${log.name}・${log.grade}を ${yen(value)}円で売った。`);
  drawNight();topbar();
}
/* まだ受けていない依頼が戸口にあるか。夜のタブを黄檗に光らせる条件 */
const newRequestWaiting=()=>anyPending()&&canAcceptMore();

/* ══════════ 夕方 ══════════ */
const CRAFT_PRODUCTS={
  nara:['座卓','椅子'],
  hinoki:['風呂桶','まな板'],
  sugi:['建具','箱']
};
const craftableLog=log=>(log.processed||0)===0||
  ((log.processed||0)===1&&log.dried&&WORLD.unlocks.furniture);
const craftableCount=()=>WORLD.buildings.workshop
  ?(WORLD.lumber||[]).filter(craftableLog).length:0;
function finishEveningAction(msg){
  $('evcards').innerHTML=`<div style="max-width:460px;text-align:center;font-size:13.5px;line-height:2">${msg}</div>`;
  $('ev-sub').innerHTML=`明日は体力 <b class="mn">${100+WORLD.carry}</b> で始まる。`;
  const b=document.createElement('button');b.className='key';
  b.textContent='夜・家へ';b.style.marginTop='24px';b.onclick=toNight;
  $('evcards').appendChild(b);topbar();
}
function processLumber(index,product=null){
  const log=WORLD.lumber[index];
  if(!log||WORLD.stamina<20||!WORLD.buildings.workshop)return;
  if((log.processed||0)===0){
    log.processed=1;WORLD.stamina-=20;
    finishEveningAction(`${log.name}・${log.grade}を板に挽いた。<br>
      売値は <b>${yen(logSaleValue(log))}円</b>。乾けば家具や道具にできる。`);
    return;
  }
  if(log.processed!==1||!log.dried||!WORLD.unlocks.furniture||
     !(CRAFT_PRODUCTS[log.species]||[]).includes(product))return;
  log.processed=2;log.furniture=product;WORLD.stamina-=20;
  finishEveningAction(`${log.name}の板を削り、<b>${product}</b>に仕上げた。<br>
    売値は <b>${yen(logSaleValue(log))}円</b>。`);
}
function drawCraftChoice(){
  $('ev-sub').innerHTML=`工房で加工する材を選ぶ。体力 <b class="mn">${Math.round(WORLD.stamina)}</b>　—　加工すると夕方が終わる。`;
  const cards=(WORLD.lumber||[]).map((log,i)=>{
    const stage=log.processed||0;
    const state=stage===0?'丸太':stage===1?'板':log.furniture||'仕上げ済み';
    if(stage>=2)return `<div class="ecard dis"><h3>${log.name}・${state}</h3>
      <div class="e">これ以上は加工できない。</div><div class="k">${yen(logSaleValue(log))}円</div></div>`;
    if(stage===1&&!log.dried)return `<div class="ecard dis"><h3>${log.name}・板</h3>
      <div class="e">家具にするには、乾燥が必要。</div><div class="k">あと ${dryLeft(log)}日</div></div>`;
    if(stage===1&&!WORLD.unlocks.furniture)return `<div class="ecard dis"><h3>${log.name}・板</h3>
      <div class="e">削って仕上げる方法を、まだ知らない。</div><div class="k">家具屋の佐吉に板を見せる</div></div>`;
    const actions=stage===0
      ?`<button data-process-log="${i}">板に挽く</button>`
      :(CRAFT_PRODUCTS[log.species]||[]).map(p=>
        `<button data-process-log="${i}" data-product="${p}">${p}にする</button>`).join('');
    return `<div class="ecard craftcard"><h3>${log.name}・${log.grade}</h3>
      <div class="c">${state}　→　${stage===0?'板':'家具・道具'}</div>
      <div class="e">${log.dried?'乾燥済み':'乾燥中'}　現在 ${yen(logSaleValue(log))}円</div>
      <div class="k">${actions}</div></div>`;
  }).join('');
  $('evcards').innerHTML=cards||'<div class="ecard dis"><h3>材がない</h3><div class="e">倉庫へ材を取っておこう。</div></div>';
  $('evcards').insertAdjacentHTML('beforeend','<button id="craft-back">夕方の選択へ戻る</button>');
  $('evcards').querySelectorAll('[data-process-log]').forEach(b=>b.onclick=()=>
    processLumber(+b.dataset.processLog,b.dataset.product||null));
  $('craft-back').onclick=toEvening;
}
const EVE=[
  {k:'rest',t:'早めに帰る',c:'体力 残り全部',
   e:'囲炉裏で足を伸ばす。残した体力の半分が明日に乗る。',
   ok:()=>true,
   kicker:()=>`明日 +${Math.min(WORLD.buildings.hearth?28:20,Math.floor(WORLD.stamina/2))}`,
   run(){const g=Math.min(WORLD.buildings.hearth?28:20,Math.floor(WORLD.stamina/2));
     WORLD.carry=g; return `囲炉裏で休んだ。明日の体力に <b>+${g}</b>。`}},
  {k:'forage',t:'山菜・きのこ',c:'体力 −10',
   e:'帰り道で探す。当たれば大きいが、何も採れない日もある。',
   ok:()=>WORLD.stamina>=10,
   kicker:()=>'明日 +0〜30',
   run(){WORLD.stamina-=10;
     const g=[0,5,5,10,10,15,15,20,25,30][ri(0,9)];
     WORLD.carry=g;
     return g===0?'今日は何も見つからなかった。明日の体力に <b>+0</b>。'
       :g>=25?`<g>大当たり。</g>籠がいっぱいになった。明日の体力に <b>+${g}</b>。`
       :`いくらか採れた。明日の体力に <b>+${g}</b>。`}},
  {k:'prune',t:'枝打ち',c:'体力 −20',
   e:'この林の枝を落として回る。今日は一円にもならないが、木の節が減っていく。',
   ok:()=>WORLD.stamina>=20&&WORLD.at>=0,
   kicker:()=>WORLD.at>=0?`${FORESTS[WORLD.at].name} 手入れ度 +8`:'林にいるときだけ',
   run(){WORLD.stamina-=20; const f=FORESTS[WORLD.at];
     f.care=Math.min(100,f.care+8);
     return `${f.name}の枝を落として回った。手入れ度 <b>${f.care}</b>。次に来るとき、節の少ない木が増えている。`}},
  {k:'road',t:'道の手入れ',c:'体力 −20',
   e:'この林への道をならす。通うのが恒久的に楽になる。',
   ok:()=>WORLD.at>=0&&WORLD.stamina>=20&&travelCost(FORESTS[WORLD.at])>10,
   kicker:()=>WORLD.at>=0?`移動 ${travelCost(FORESTS[WORLD.at])} → ${Math.max(10,travelCost(FORESTS[WORLD.at])-5)}`:'林にいるときだけ',
   run(){WORLD.stamina-=20; const f=FORESTS[WORLD.at];
     f.roadWorks++;
     return `${f.name}への道をならした。移動が <b>${travelCost(f)}</b> になった。`}},
  {k:'craft',t:'木を挽く／削る',c:'体力 −20',
   e:'工房で倉庫の材を板に挽く。乾いた板は家具や道具に仕上げられる。',
   ok:()=>WORLD.buildings.workshop&&WORLD.stamina>=20&&craftableCount()>0,
   kicker:()=>!WORLD.buildings.workshop?'工房が必要'
     :!WORLD.lumber.length?'倉庫に材がない'
     :craftableCount()?`加工できる材 ${craftableCount()}本`:'乾燥または作り方を待つ',
   run(){return null}}
];
function toEvening(){
  SCREEN='evening'; hideAll(); gaugeOff();
  standGrp.visible=false;stumpGrp.visible=false;pivot.visible=false;
  targetGrp.visible=false;predLine.visible=false;axe.visible=false;
  want.r=40; want.ty=9;
  const eveningForest=WORLD.lastForest??0;
  $('ev-bg').src=FOREST_ART(eveningForest);
  $('ev-bg').className=`forest-scene tone-${eveningForest}`;
  /* 甲斐犬の二段目 — 山菜・きのこを犬が採ってくる。夕方の枠を使わない。
     夕方の1枠は最希少資源なので、これを1つ空けるのが3頭で一番強い（ROADMAP §11.2） */
  let dogForage=0;
  if(dogStage('kai')>=2){
    dogForage=[0,0,5,5,10,10,10,15,15,15][ri(0,9)];
    WORLD.carry=Math.max(WORLD.carry,dogForage);
  }
  $('ev-sub').innerHTML=`${WORLD.day}日目が終わる。体力の残り <b class="mn">${Math.round(WORLD.stamina)}</b>　—　選べるのは<b>ひとつだけ</b>。`
    +(dogStage('kai')>=2?`<br><g>${DOGS.kai.name}が山菜を採ってきた　明日 +${dogForage}</g>　この一枠は使わない。`:'');
  $('evcards').innerHTML=EVE.map((e,i)=>{
    const ok=e.ok();
    /* 犬が採る日は、山菜の札に犬の印を出して「もう済んでいる」ことを示す */
    const byDog=e.k==='forage'&&dogStage('kai')>=2;
    return `<div class="ecard ${ok&&!byDog?'':'dis'}" ${ok&&!byDog?`data-e="${i}"`:''}>
      <h3>${byDog?'🐕 ':''}${e.t}</h3><div class="c">${byDog?'犬が行く':e.c}</div>
      <div class="e">${byDog?`${DOGS.kai.name}が帰り道で探してくる。こちらの体力も枠も使わない。`:e.e}</div>
      <div class="k">${byDog?`明日 +${dogForage}　済み`:e.kicker()}</div></div>`}).join('');
  $('evcards').querySelectorAll('[data-e]').forEach(el=>el.onclick=()=>{
    const e=EVE[+el.dataset.e];
    if(e.k==='craft'){drawCraftChoice();return}
    const msg=e.run();
    finishEveningAction(msg)});
  topbar();
  $('evov').classList.remove('hide');
  showTutorial('evening');
}
/* ══════════ 夜・家 ══════════ */
let NIGHT_TAB='tools';
function nightMessage(text,bad=false){
  $('nightmsg').textContent=text;
  $('nightmsg').className=bad?'ng':'';
}
function lumberCount(species){return WORLD.lumber.filter(x=>x.species===species).length}
function spendLumber(cost){
  for(const [species,count] of Object.entries(cost)){
    for(let n=0;n<count;n++){
      const i=WORLD.lumber.findIndex(x=>x.species===species);
      if(i>=0)WORLD.lumber.splice(i,1);
    }
  }
}
function toNight(){
  SCREEN='night'; hideAll(); NIGHT_TAB='tools'; nightMessage('');
  $('record-choice').classList.add('hide');
  $('record-choice').querySelectorAll('[data-manual-slot]').forEach(b=>b.textContent=recordText(b.dataset.manualSlot));
  $('nightov').classList.remove('hide'); drawNight(); topbar();soundNight();
  showTutorial('night');
}
/* 土間を直すと、犬が家の中（囲炉裏のそば）で眠る。 */
let nightDogTimer=null,nightDogRunToken=0;
function updateNightDog(){
  const el=$('night-dog'); if(!el)return;
  const k=mascotDog();
  const token=++nightDogRunToken;
  if(nightDogTimer){clearTimeout(nightDogTimer);nightDogTimer=null}
  if(!WORLD.buildings.doma||!k){el.classList.add('hide');el.src='';return}
  el.onerror=()=>{
    /* コマ画像が欠けても犬そのものは消さず、一枚絵に戻す。 */
    nightDogRunToken++;
    if(nightDogTimer){clearTimeout(nightDogTimer);nightDogTimer=null}
    el.onerror=null;el.classList.remove('hide');el.classList.add('framed');
    el.style.animation='none';el.style.transform='scaleX(-1)';
    el.src=dogArt(k,'mascot');
  };
  el.alt=`土間で休む${DOGS[k].name}`;
  el.classList.remove('hide');
  /* 柴犬だけ、起きている間は床を歩く。待機3回＋大喜び1回を2〜3セット後、
     その場で寝る。ほかの犬は最初から移動せず寝る。 */
  const sleep=()=>{
    if(token!==nightDogRunToken||mascotDog()!==k||!WORLD.buildings.doma)return;
    el.classList.add('framed');
    el.style.animation='none';
    el.style.transform='scaleX(-1)';
    if(!DOG_HAS_SLEEP[k]){el.src=dogArt(k,'mascot');return}
    /* 寝姿は1コマ目だけを使う。元画像のコマずれを完全に避け、静止させる。 */
    el.src=dogFrame(k,'sleep',0);
  };
  if(k!=='shiba'){sleep();return}
  el.classList.remove('framed');
  el.style.animation='';
  el.style.transform='';
  const repeats=2+(WORLD.day%2);
  const states=Array.from({length:repeats},()=>['idle','idle','idle','joy']).flat();
  let stateAt=0;
  const awakeState=()=>{
    if(token!==nightDogRunToken)return;
    if(stateAt>=states.length){sleep();return}
    const state=states[stateAt++],cfg=DOG_ANIMS[state];
    let f=0;
    const awakeFrame=()=>{
      if(token!==nightDogRunToken||mascotDog()!==k)return;
      el.src=dogFrame(k,state,f);f++;
      if(f<cfg.frames){nightDogTimer=setTimeout(awakeFrame,cfg.ms);return}
      nightDogTimer=setTimeout(awakeState,state==='joy'?650:300);
    };
    awakeFrame();
  };
  awakeState();
}
const TAB_ICONS={
  tools:'<path d="M5 15l6-6m-1-4l4-2 2 2-2 4-4-4zM3 17l3-3"/>',
  goods:'<path d="M6 3h6l1 3-1 11H6L5 6l1-3zM5 7h8"/>',
  lumber:'<path d="M3 6l7-3 7 3-7 3-7-3zm0 0v7l7 4 7-4V6M10 9v8"/>',
  dogs:'<path d="M6 9c-3-1-3-5-1-6l3 3h4l3-3c2 1 2 5-1 6v5c-2 3-6 3-8 0V9zM8 11h.1M12 11h.1M9 14h2"/>',
  build:'<path d="M3 9l7-6 7 6v8H3V9zm5 8v-5h4v5"/>',
  requests:'<path d="M5 3h10v14H5V3zm2 4h6M7 10h6M7 13h4"/>'
};
const iconSvg=k=>`<span class="tabico"><svg viewBox="0 0 20 20" aria-hidden="true">${TAB_ICONS[k]||''}</svg></span>`;
function drawNight(){
  updateNightDog();   /* 犬を迎える／土間を建てる／表示を切り替えるたびに追従させる */
  $('night-money').textContent=yen(WORLD.money)+'円';
  const tabs=[['tools','道具'],['goods','消耗品'],['dogs','犬'],['build','建てる'],['requests','依頼'],['lumber','材木倉庫']];
  $('nighttabs').innerHTML=tabs.map(([k,n])=>{
    const isNew=k==='requests'&&newRequestWaiting();
    return `<button data-tab="${k}" class="${NIGHT_TAB===k?'sel':''}${isNew?' fresh':''}"`+
      `${isNew?' title="受けていない依頼がある"':''}>${iconSvg(k)}${n}${isNew?'<i class="dot"></i>':''}</button>`;
  }).join('');
  $('nighttabs').querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{
    NIGHT_TAB=b.dataset.tab;drawNight();
    if(NIGHT_TAB==='requests')showPendingRequestResults();
  });
  $('night-stock').textContent=`木材 ${WORLD.lumber.length}/${lumberCapacity()}（杉 ${lumberCount('sugi')}・檜 ${lumberCount('hinoki')}・楢 ${lumberCount('nara')}）　信用・棟梁 ${WORLD.credit.builder}`;
  const body=$('nightbody');
  if(NIGHT_TAB==='tools'){
    body.innerHTML=Object.values(AXES).map(a=>{
      const owned=WORLD.ownedAxes.includes(a.id),equipped=WORLD.axe===a.id;
      const locked=a.locked&&!WORLD.unlocks.master;
      return `<div class="shopcard"><h3>${a.name}</h3>
        <p>威力 ${a.power.toFixed(1)}　重さ +${a.weight}。${locked?'山の持ち主の信用が要る。':'太い木と仕上げで使い分ける斧。'}</p>
        <div class="row"><b>${a.price?yen(a.price)+'円':'初期装備'}</b><button data-axe="${a.id}" ${locked||equipped||(!owned&&WORLD.money<a.price)?'disabled':''}>${equipped?'装備中':owned?'装備する':'買う'}</button></div></div>`}).join('');
    body.querySelectorAll('[data-axe]').forEach(b=>b.onclick=()=>buyAxe(b.dataset.axe));
  }else if(NIGHT_TAB==='goods'){
    const GOOD_TEXT={bento:'毎朝 +8体力。自動で使うか切り替えられる。',
      stone:'斧を研ぐ1回分。',
      wedge:'追い口で傾きに逆らう。1本ずつ使う。',
      sapling:'その日Sを取った本数だけ、夕方に自動で植わる。夕方の枠は使わない。<br>'+
              '<b class="ok">1本につき 残り本数+1・上限+1・手入れ度+3</b>'};
    body.innerHTML=Object.entries(GOODS)
      /* 苗は神主の依頼を果たすまで見えない（ROADMAP §12.7） */
      .filter(([k,g])=>!g.locked||WORLD.unlocks[g.locked])
      .map(([k,g])=>`<div class="shopcard">
      <div class="goods-top"><h3>${g.name}　${WORLD.inv[k]}個</h3>
        <span class="goods-buy"><b>${yen(g.price)}円</b><button data-good="${k}" data-n="1">購入</button></span></div>
      <div class="goods-bottom"><p>${GOOD_TEXT[k]||'必要な日に備えて持っておく消耗品。'}${
        k==='bento'?`<br>${WORLD.inv.bento?`明朝 体力 ${WORLD.auto.bento?108:100}／在庫 ${WORLD.inv.bento-(WORLD.auto.bento?1:0)}個`:'弁当がない'}`:''}</p>
      ${k==='bento'?`<button data-auto="${k}" class="${WORLD.auto[k]?'sel':''}" ${WORLD.inv.bento?'':'disabled'}>${WORLD.auto[k]?'明日は食べる':'明日は食べない'}</button>`
      :k==='feed'?`<button data-auto="${k}" class="${WORLD.auto[k]?'sel':''}">${WORLD.auto[k]?'使う':'使わない'}</button>`:''}</div></div>`).join('');
    body.querySelectorAll('[data-good]').forEach(b=>b.onclick=()=>buyGood(b.dataset.good,+b.dataset.n));
    body.querySelectorAll('[data-auto]').forEach(b=>b.onclick=()=>{WORLD.auto[b.dataset.auto]=!WORLD.auto[b.dataset.auto];drawNight()});
  }else if(NIGHT_TAB==='lumber'){
    const craftInfo=`<div class="shopcard craft-info"><h3>乾燥と加工</h3>
      <p><b class="ok">乾燥</b>　日数が経つと品等が1段上がる。売値の目安は
        三等→二等 <b>約25％増</b>、二等→一等 <b>約15％増</b>、
        一等→特等 <b>約17％増</b>（特等はそのまま）。<br>
        <b class="mid">板に挽く</b>　丸太の売値の <b>1.6倍</b>。<br>
        <b class="mid">家具・道具</b>　乾燥した板をもう一度加工し、種類により
        <b>4〜8倍</b>。加工は工房を建て、夕方に体力20を使う。</p></div>`;
    body.innerHTML=craftInfo+(WORLD.lumber.length?WORLD.lumber.map((log,i)=>{
      const match=requestMatches(log);
      const who=(WORLD.requests||[]).find(r=>partIndexFor(r,log)>=0);
      /* 乾燥は「あと何日 → 何になる」で書く。割合では何をすべきか伝わらない（SPEC §12.4） */
      const left=dryLeft(log);
      const stage=log.furniture?log.furniture:(log.processed||0)>=1?'板':'丸太';
      const dry=log.furniture
        ?`<b class="ok">完成品</b>　${log.furniture}`
        :log.dried
        ?`<b class="ok">乾いた</b>　${(log.processed||0)>=1
          ?WORLD.unlocks.furniture?'家具・道具にできる':'佐吉に板を見せる'
          :'板に挽ける'}`
        :`乾燥 <b class="mid">あと ${left}日</b>　→　${nextGrade(log.grade)}`;
      const born=log.dried&&log.bornGrade!==log.grade
        ?`　<span class="off">（${log.bornGrade}を寝かせた）</span>`:'';
      return `<div class="shopcard"><h3>${match?'★ ':''}${log.name}・${log.grade}　${stage}${born}</h3>
        <p>材積 ${log.volume.toFixed(2)}m³　／　${dry}<br>
          加工 ${(log.processed||0)}回　／　売値 ${yen(logSaleValue(log))}円</p>
        <div class="row"><b>${match?`${clientName(who.client)}へ納められる`:'保管中'}</b><span>
          <button data-sell-log="${i}">${yen(logSaleValue(log))}円で売る</button>
          ${match?`<button data-deliver-log="${i}">依頼へ納める</button>`:''}</span></div></div>`}).join('')
      :'<div class="shopcard"><h3>木材はまだない</h3><p>伐ったあとに「取っておく」を選ぶと、ここへ並ぶ。</p></div>');
    body.querySelectorAll('[data-deliver-log]').forEach(b=>b.onclick=()=>deliverStoredLog(+b.dataset.deliverLog));
    body.querySelectorAll('[data-sell-log]').forEach(b=>b.onclick=()=>sellStoredLog(+b.dataset.sellLog));
  }else if(NIGHT_TAB==='dogs'){
    let html='';
    for(const [k,d] of Object.entries(DOGS)){
      const got=hasDog(k),st=dogStage(k),b=dogBond(k);
      const locked=d.unlock&&!WORLD.unlocks[d.unlock];
      if(!got){
        html+=`<div class="shopcard dog-card"><img class="dog-card-art" src="${dogArt(k,'mascot')}" alt="${d.name}">
          <h3>${d.name}</h3>
          <p>${d.role}。<br>${locked?'<span class="mid">まだ訪ねてこない。</span>'
            :!WORLD.buildings.doghouse?'<span class="mid">犬小屋を建てると迎えられる。</span>'
            :'一段目：'+d.s1}</p>
          <div class="row"><b>${yen(d.price)}円</b>
          <button data-adopt="${k}" ${locked||!WORLD.buildings.doghouse||WORLD.money<d.price?'disabled':''}>迎える</button></div></div>`;
        continue;
      }
      const pct=Math.round(b/BOND_STAGE2*100);
      html+=`<div class="shopcard dog-card"><img class="dog-card-art" src="${dogArt(k,'mascot')}" alt="${d.name}">
        <h3>${d.name}　<span class="lb" style="display:inline">${d.role}</span></h3>
        <div class="tr"><span>なつき度</span>
          <span class="meter" style="width:110px"><i style="width:${Math.min(100,pct)}%;background:${
            st>=2?'#7fa85c':'#d4a94e'}"></i></span>
          <b class="${st>=2?'ok':'mid'}">${b} / ${BOND_STAGE2}</b></div>
        <p><b class="ok">一段目</b>　${d.s1}<br>
           <b class="${st>=2?'ok':'off'}">二段目</b>　<span class="${st>=2?'':'off'}">${d.s2}</span></p>
        <div class="row">
          <button data-care="${k}" class="${WORLD.dogCare===k?'sel':''}">一緒に遊ぶ</button>
          <button data-mascot="${k}" class="${WORLD.mascot===k?'sel':''}">伐採時に表示</button></div></div>`;
    }
    if(anyDog())html+=`<div class="shopcard"><h3>暮らし</h3>
      <p>夜に一緒に遊べるのは<b>1頭だけ</b>。遊んだ犬は +5、ほかは餌で +1。<br>
         餌が頭数ぶん足りない日は<span class="ng">全頭 −5</span>。いまは1日 ${yen(dogCount()*300)}円。</p>
      <div class="row"><span>犬の餌　${WORLD.inv.feed}個　／　必要 ${dogCount()}個</span>
        <button data-auto="feed" class="${WORLD.auto.feed?'sel':''}">${WORLD.auto.feed?'毎朝あげる':'餌を節約する'}</button></div>
      ${WORLD.buildings.doma?`<div class="row"><span>土間に入れている</span><b class="ok">放っておいても ${BOND_DOMA_CAP} まで上がる</b></div>`
        :'<div class="row"><span>土間に入れると、放っておいてもなつく</span><b class="mid">「建てる」から</b></div>'}
      </div>`;
    html+=`<div class="shopcard"><h3>紀州犬</h3>
      <p>神の使い。飼うのではなく、神主から借りる。<br>
      連れて入った林の手入れ度が100なら、植えた苗が<b>神木</b>になる。</p>
      <div class="row"><b class="${WORLD.unlocks.kishu?'ok':'mid'}">${
        WORLD.unlocks.kishu?'借りられる':'神主の信用が要る'}</b></div></div>`;
    body.innerHTML=html;
    body.querySelectorAll('[data-adopt]').forEach(b=>b.onclick=()=>adoptDog(b.dataset.adopt));
    body.querySelectorAll('[data-care]').forEach(b=>b.onclick=()=>{
      WORLD.dogCare=WORLD.dogCare===b.dataset.care?null:b.dataset.care;drawNight()});
    body.querySelectorAll('[data-mascot]').forEach(b=>b.onclick=()=>{
      WORLD.mascot=b.dataset.mascot;updateForestMascot();drawNight()});
    body.querySelectorAll('[data-auto="feed"]').forEach(b=>b.onclick=()=>{WORLD.auto.feed=!WORLD.auto.feed;drawNight()});
  }else if(NIGHT_TAB==='build'){
    const builds=[
      ['shed','物置',60000,{sugi:4},'保管枠 5 → 20',true],
      ['doghouse','犬小屋',30000,{sugi:3},'犬を飼える',WORLD.unlocks.doghouse],
      ['doma','土間を直す',30000,{nara:2},'楢で上がり框を直す。犬を家に入れられ、放っておいてもなつき度が'+BOND_DOMA_CAP+'まで上がる',WORLD.buildings.doghouse],
      ['hearth','囲炉裏を直す',25000,{nara:2},'楢で炉端を直す。早帰りの上限 20 → 28',true],
      ['workshop','工房',120000,{sugi:6,hinoki:4,nara:3},'加工を解禁',WORLD.unlocks.workshop]
    ];
    body.innerHTML=builds.map(([k,n,m,c,e,open])=>{
      const built=WORLD.buildings[k],woodOK=Object.entries(c).every(([s,v])=>lumberCount(s)>=v);
      const cost=Object.entries(c).map(([s,v])=>`${SPECIES[s].name}×${v}`).join('、');
      return `<div class="shopcard"><h3>${n}</h3><p>${e}。必要：${cost}</p><div class="row"><b>${yen(m)}円</b><button data-build="${k}" ${built||!open||WORLD.money<m||!woodOK?'disabled':''}>${built?'完成':open?'建てる':'依頼で解禁'}</button></div></div>`}).join('');
    body.querySelectorAll('[data-build]').forEach(b=>b.onclick=()=>buildStructure(b.dataset.build));
  }else{
    /* 受注中 → 頼まれている → 済んだこと の3区分（ROADMAP §12.1） */
    let html='';
    for(const r of WORLD.requests){
      const d=reqDef(r.id),p=reqProgress(r);
      const left=r.deadline==null?'期限なし':`残り ${Math.max(0,r.deadline-WORLD.day+1)}日`;
      const near=r.deadline!=null&&r.deadline-WORLD.day+1<=2;
      html+=`<div class="shopcard"><h3>${clientAvatar(r.client)}${clientName(r.client)}</h3>
        <p>${d.text.replace(/\n/g,'<br>')}</p>
        <div class="row"><b>${reqProgressText(r)}</b>
        <span class="${near?'ng':''}">${left}</span></div>
        ${d.pay?`<div class="stockline" style="text-align:right">達成すると ${yen(d.pay)}円</div>`:''}</div>`;
    }
    for(const k of Object.keys(CLIENTS)){
      const d=pendingRequest(k); if(!d)continue;
      const full=!canAcceptMore();
      html+=`<div class="shopcard"><h3 class="mid">${clientAvatar(k)}${clientName(k)}</h3>
        <p>${d.text.replace(/\n/g,'<br>')}</p>
        <div class="stockline" style="text-align:left">
          ${d.days?`期限 ${d.days}日`:'期限なし'}
          ${d.pay?`／ 報酬 ${yen(d.pay)}円`:'／ 報酬なし'}
          ${d.unlocks?.length?`<br>${unlockText(d.unlocks)}`:''}</div>
        <div class="row"><b class="mid">頼まれている</b>
        <button data-accept="${d.id}" ${full?'disabled':''}>${full?'これ以上受けられない':'受ける'}</button></div></div>`;
    }
    const log=(WORLD.requestLog||[]).slice(0,4).map(e=>{
      const d=reqDef(e.id);if(!d)return '';
      return `<div class="tr"><span>${clientName(d.client)}　${d.title}</span>
        <b class="${e.ok?'ok':'ng'}">${e.ok?'達成':`期限切れ　${e.returned||0}本返却`}</b></div>`}).join('');
    if(log)html+=`<div class="shopcard"><h3>済んだこと</h3>${log}</div>`;
    if(!html)html='<div class="shopcard"><h3>依頼</h3><p>いまは頼まれていることがない。</p></div>';
    body.innerHTML=html;
    body.querySelectorAll('[data-accept]').forEach(b=>b.onclick=()=>{
      const d=reqDef(b.dataset.accept);
      if(!clientMet(d.client)){showIntro(d.client,()=>{acceptRequest(d.id);drawNight()});return}
      acceptRequest(d.id);
      nightMessage(`${clientName(d.client)}の頼みを受けた。朝の地図に目印が出る。`);
      drawNight();
    });
  }
  $('reqboard').classList.toggle('hide',NIGHT_TAB!=='requests');
  if(NIGHT_TAB==='requests')drawRequestBoard();
}
/* 解禁物を日本語にする */
const UNLOCK_LABEL={miyama:'深山へ入れる',doghouse:'犬小屋',snow:'雪の峰へ入れる',
  master:'名工の斧',akita:'秋田犬',kai:'甲斐犬',kishu:'紀州犬',sapling:'苗',
  sake:'お神酒',furniture:'家具の作り方','cheap-stone':'砥石が半額',
  miyadaiku:'宮大工','client:dealer':'材木屋と会える','client:sakichi':'佐吉と会える',
  'workshop-1':'工房の話が進む','workshop-2':'工房の話が進む'};
const unlockText=ks=>'開くもの：'+ks.map(k=>UNLOCK_LABEL[k]||k).join('、');

/* 夜の進捗パネル（ROADMAP §12.10）— 記録ボタンの直上に5人固定で並べる */
function drawRequestBoard(){
  const el=$('reqboard');if(!el)return;
  el.innerHTML=Object.keys(CLIENTS).map(k=>{
    const r=(WORLD.requests||[]).find(x=>x.client===k);
    if(r){
      const left=r.deadline==null?'':`残り ${Math.max(0,r.deadline-WORLD.day+1)}日`;
      const near=r.deadline!=null&&r.deadline-WORLD.day+1<=2;
      return `<div class="rb"><span>${clientName(k)}</span>
        <b>${reqProgressText(r)}</b><em class="${near?'ng':''}">${left}</em></div>`;
    }
    if(pendingRequest(k))
      return `<div class="rb mid"><span>${clientName(k)}</span><b>頼まれている</b><em></em></div>`;
    if(!clientVisible(k))
      return `<div class="rb off"><span>${clientName(k)}</span><b>まだ会っていない</b><em></em></div>`;
    const n=REQUESTS.filter(d=>d.client===k).length;
    const done=(WORLD.requestsDone||[]).filter(id=>reqDef(id)?.client===k).length;
    return `<div class="rb ok"><span>${clientName(k)}</span>
      <b>${done>=n?'すべて果たした':`いまは無い　${done}/${n}`}</b><em></em></div>`;
  }).join('');
}
function showPendingRequestResults(){
  const results=WORLD.pendingRequestResults||[];
  if(!results.length)return;
  const pending=results.splice(0);
  saveGame('auto');
  for(const result of pending){
    const d=reqDef(result.id);if(!d)continue;
    const reward=d.pay?`報酬　${yen(d.pay)}円`:'報酬　なし';
    const unlocked=d.unlocks?.length
      ?`\n解放　${d.unlocks.map(k=>UNLOCK_LABEL[k]||k).join('、')}`:'';
    showStory({label:`${clientName(d.client)}から`,title:`「${d.title}」達成`,
      body:`${d.doneText}\n\n${reward}${unlocked}`,button:'確認した'});
  }
}

/* 初対面の挨拶（ROADMAP §12.2）。5人の声で書いてある */
function showIntro(key,then){
  const c=CLIENTS[key];if(!c){then&&then();return}
  if(!WORLD.metClients.includes(key))WORLD.metClients.push(key);
  $('intro-name').textContent=c.name;
  $('intro-body').innerHTML=c.intro.replace(/\n/g,'<br>');
  /* 依頼主のシルエット。無ければ絵無しで進行する */
  const art=$('intro-art');
  art.classList.add('hide'); art.onerror=()=>art.classList.add('hide');
  art.onload=()=>art.classList.remove('hide');
  art.alt=c.name; art.src=`assets/client-${key}.png`;
  $('introov').classList.remove('hide');
  $('intro-ok').onclick=()=>{$('introov').classList.add('hide');then&&then()};
}
function buyAxe(id){
  const a=AXES[id];
  if(!WORLD.ownedAxes.includes(id)){if((a.locked&&!WORLD.unlocks.master)||WORLD.money<a.price)return;WORLD.money-=a.price;WORLD.ownedAxes.push(id)}
  WORLD.axe=id;soundBuy();nightMessage(`${a.name}を明日の斧にした。`);drawNight();topbar();
}
function buyGood(k,n){
  const price=Math.round(GOODS[k].price*n*(n===10?.9:1));
  if(WORLD.money<price){nightMessage('お金が足りない。',true);return}
  WORLD.money-=price;WORLD.inv[k]+=n;soundBuy();nightMessage(`${GOODS[k].name}を ${n}個 買った。`);drawNight();topbar();
}
/* ── 昼に映す犬 ──
   3頭とも連れて歩くので、姿は選べる（WORLD.mascot）。
   絵は assets/<犬>-mascot.png を探し、無ければ柴犬の絵を借りて色を変える。
   秋田犬と甲斐犬の透過PNGを置けば、そのまま本物に切り替わる。 */
const mascotDog=()=>{
  const k=WORLD.mascot;
  return k&&hasDog(k)?k:(Object.keys(WORLD.dogs||{})[0]||null);
};
function dogArt(k,mood='mascot'){
  return k==='shiba'?`assets/shiba-${mood}.png`:`assets/${k}-${mood}.png`;
}
/* 表情の絵が無いときは、**同じ犬の通常顔**へ落ちる。
   ほかの犬種の絵を借りると、秋田犬が喜んだ瞬間に柴犬へ化けてしまう。
   その犬の絵そのものが無いときだけ、最後の保険として柴犬を借りる。 */
function setMascotArt(el,k,mood='mascot'){
  el.classList.remove('stand-in');
  el.onerror=mood==='mascot'
    ? ()=>{el.onerror=null;el.classList.add('stand-in');el.src='assets/shiba-mascot.png'}
    : ()=>{el.onerror=null;setMascotArt(el,k,'mascot')};
  el.src=dogArt(k,mood);
}
function updateForestMascot(){
  const el=$('forest-mascot');
  if(!el)return;
  const k=mascotDog();
  el.className=k?`forest-dog dog-${k}`:'forest-bird';
  if(k){
    el.alt=`森を一緒に歩く${DOGS[k].name}`;
    /* コマ絵があれば待機の動きを回す。無ければ1枚絵のまま */
    if(!playDogAnimation('idle'))setMascotArt(el,k);
  }
  else{stopDogAnimation();el.onerror=null;el.src='assets/bird-mascot.png';el.alt='森で見守る小鳥'}
}
/* 柴犬の見立て。なつき度が60未満だと、たまに違う顔を出す（ROADMAP §4.1） */
function senseShown(t){
  const p=treePotential(t);
  if(dogStage('shiba')>=2)return p;
  /* 木ごとに決まった間違い方をする。見るたびに変わると読めない */
  const seed=Math.abs(Math.round((t.D*1000)+(t.straight||0)*7+(t.knots||0)*13))%100;
  if(seed<15)return ({rot:'normal',normal:'fine',fine:'normal'})[p];
  return p;
}
function dogImageFor(t){
  const k=mascotDog(); if(!k)return 'assets/bird-mascot.png';
  const p=t?senseShown(t):'normal';
  return dogArt(k,p==='fine'?'happy':p==='rot'?'worried':'mascot');
}
function showDogSense(t,walk=false){
  if(!hasDog('shiba'))return;
  const k=mascotDog(),el=$('forest-mascot'),p=senseShown(t);
  /* その木を選んでいる間はずっと反応を続ける。1回で収まると分かりにくいので、
     良材なら喜び続け、腐れなら心配し続ける（別の木を選ぶまで） */
  const anim=walk&&(
    p==='fine'?playDogAnimation('joy',{loop:true})
   :p==='rot' ?playDogAnimation('inspect',{loop:true})
   :false);
  if(!anim)setMascotArt(el,k,p==='fine'?'happy':p==='rot'?'worried':'mascot');
  const nm=DOGS[k].name;
  el.alt=p==='fine'?`良材を見つけて喜ぶ${nm}`:p==='rot'?`木の異変を心配する${nm}`:`木を見つめる${nm}`;
  if(walk&&!anim)mascotReact('walk');
}
function adoptDog(k){
  const d=DOGS[k];
  if(!d||!WORLD.buildings.doghouse||hasDog(k)||WORLD.money<d.price)return;
  if(d.unlock&&!WORLD.unlocks[d.unlock])return;
  WORLD.money-=d.price;
  WORLD.dogs[k]={bond:0};
  if(!WORLD.mascot)WORLD.mascot=k;
  if(!WORLD.dogCare)WORLD.dogCare=k;
  soundSuccess();
  nightMessage(`${d.name}を迎えた。明日から山へついてくる。`);
  drawNight();topbar();
  showStory({label:'新しい相棒',title:d.name,
    body:`${d.name}を家へ迎えた。\n明日から山へついてくる。`,
    button:'よろしくな',art:dogArt(k,'mascot')});
}
function mascotReact(kind){
  const el=$('forest-mascot');
  if(!el||el.classList.contains('hide'))return;
  const k=mascotDog();
  let restore=null;
  if(k&&(kind==='fall'||kind==='critical'||kind==='good')){
    restore=dogImageFor(T);
    setMascotArt(el,k,kind==='fall'?'surprised':'happy');
  }
  [...el.classList].filter(c=>c.startsWith('react-')).forEach(c=>el.classList.remove(c));
  void el.offsetWidth;
  el.classList.add(`react-${kind}`);
  el.addEventListener('animationend',()=>{
    el.classList.remove(`react-${kind}`);
    if(restore)el.src=restore;
  },{once:true});
}
function buildStructure(k){
  const cfg={
    shed:[60000,{sugi:4}],doghouse:[30000,{sugi:3}],
    doma:[30000,{nara:2}],
    hearth:[25000,{nara:2}],workshop:[120000,{sugi:6,hinoki:4,nara:3}]
  }[k];
  if(!cfg)return;
  WORLD.money-=cfg[0];spendLumber(cfg[1]);WORLD.buildings[k]=true;
  soundSuccess();
  nightMessage('自分で伐った木で建てた。新しい棚が開いた。');drawNight();topbar();
  if(k==='workshop')showStory({label:'工房が完成した',title:'木を挽く／削る',
    body:'夕方に体力20を使い、倉庫の丸太を板に挽ける。\n板は丸太の1.6倍。乾燥した板をもう一度加工すると、家具や道具になり4〜8倍の値がつく。',
    button:'工房を使ってみる'});
}
function nextDay(manualSlot=null){
  /* 神主の依頼後は、日付を問わず一日山へ入らなければ達成。 */
  if(WORLD.today.fells===0&&(WORLD.forestsToday||[]).length===0)
    WORLD.today.keptKamiDay=true;
  noteDayEnd();                 /* 一日の会心・山の神の日を依頼へ反映 */
  const planted=plantSaplings(); /* Sを取った本数だけ苗が植わる（枠は使わない） */
  WORLD.day++;
  expireRequests();             /* 期限切れ → 材を返して信用 −1 */
  advanceDrying();              /* 倉庫の材を1日ぶん乾かす */
  WORLD.today={fells:0,esses:0,keptKamiDay:false,essForests:[]};
  WORLD.forestsToday=[];
  const carry=WORLD.carry;
  let lunch=0;
  if(WORLD.auto.bento&&WORLD.inv.bento>0){WORLD.inv.bento--;lunch=8}
  const bonds=advanceBonds();   /* 餌と世話でなつき度が動く */
  WORLD.morning={carry,bento:lunch,planted};
  WORLD.stamina=100+carry+lunch; WORLD.carry=0;
  WORLD.moves=0; WORLD.at=-1;
  dailyGrowth();
  prepareDailyStands();
  const showResolve=WORLD.day===2&&!WORLD.storyFlags.shrineResolve;
  if(showResolve)WORLD.storyFlags.shrineResolve=true;
  saveGame('auto');
  if(manualSlot)saveGame(manualSlot);
  toMap();
  if(showResolve)showStory({label:'二日目の朝',title:'あの日の祭りを、もう一度',
    body:'夜明け前、倒れた社と、祭りの灯が夢に出た。\n社を再興して、あの日の祭りを取り戻したい。\n神主や村のみんなに連絡を取ってみよう。',
    button:'山へ向かう'});
  for(const k of bonds?.stageUps||[]){
    const d=DOGS[k];if(!d)continue;
    showStory({label:'絆が深まった',title:`${d.name}が、もっと頼れる相棒になった`,
      body:d.s2.replace(/<[^>]+>/g,''),button:'これからも頼む',art:dogArt(k,'mascot')});
  }
}
$('night-next').onclick=()=>nextDay();
$('night-record-next').onclick=()=>$('record-choice').classList.toggle('hide');
$('record-choice').querySelectorAll('[data-manual-slot]').forEach(b=>
  b.onclick=()=>nextDay(b.dataset.manualSlot));
$('sound-toggle').onclick=toggleAudio;

const LEGACY_SAVE_KEY='kikori-save-v1';
const SAVE_KEYS={auto:'kikori-save-v2-auto',manual1:'kikori-save-v2-manual1',manual2:'kikori-save-v2-manual2'};
function saveGame(slot='auto'){
  try{
    localStorage.setItem(SAVE_KEYS[slot],JSON.stringify({version:2,slot,world:WORLD,forests:FORESTS,savedAt:Date.now()}));
    return true;
  }catch(e){alert('保存できませんでした。ブラウザの保存設定を確認してください。');return false}
}
function readRecord(slot){
  try{return JSON.parse(localStorage.getItem(SAVE_KEYS[slot])||'null')}catch(e){return null}
}
function recordText(slot){
  const d=readRecord(slot);
  if(!d?.world)return slot==='auto'?'自動記録　なし':`${slot==='manual1'?'記録1':'記録2'}　なし`;
  const name=slot==='auto'?'自動記録':slot==='manual1'?'記録1':'記録2';
  const dogNames={shiba:'柴',kai:'甲斐',akita:'秋田'};
  const dogs=Object.keys(d.world.dogs||{}).map(k=>dogNames[k]||k).join('・')||'なし';
  return `${name}　${d.world.day}日目　状況：${yen(d.world.money??0)}円　犬：${dogs}`;
}
function drawRecordSlots(){
  const buttons=['auto','manual1','manual2'].map(slot=>{
    const has=!!readRecord(slot)?.world;
    return `<button data-load-slot="${slot}" ${has?'':'disabled'}>${recordText(slot)}</button>`}).join('');
  const mapBox=$('record-loads');
  if(mapBox)mapBox.innerHTML=`<span class="lb">朝の記録を読む</span>${buttons}`;
  const quick=$('quick-loads');
  if(quick)quick.innerHTML=`<span class="lb">記録を読み込む</span>${buttons}`;
  [mapBox,quick].filter(Boolean).forEach(box=>
    box.querySelectorAll('[data-load-slot]').forEach(b=>b.onclick=()=>{
      quick?.classList.add('hide');loadGame(b.dataset.loadSlot)}));
}
function loadGame(slot='auto'){
  try{
    const data=readRecord(slot);
    if(!data?.world||!Array.isArray(data.forests))return;
    const hadStands=data.world.stands&&FORESTS.every(f=>
      Array.isArray(data.world.stands[f.id])&&data.world.stands[f.id].length===16);
    Object.keys(WORLD).forEach(k=>delete WORLD[k]);
    Object.assign(WORLD,data.world);
    data.forests.forEach((f,i)=>{if(FORESTS[i])Object.assign(FORESTS[i],f)});
    normalizeWorld();          /* 旧セーブに依頼の器を用意し、単体 request を移す */
    ensureDailyStands();
    if(!hadStands)saveGame(slot);
    WORLD.at=-1;WORLD.moves=0;
    toMap();
    showStory({label:'記録',title:'読み込みました',
      body:`${WORLD.day}日目の朝から再開します。`,button:'つづける'});
  }catch(e){alert('セーブデータを読み込めませんでした。')}
}
function migrateLegacySave(){
  if(localStorage.getItem(SAVE_KEYS.auto)||!localStorage.getItem(LEGACY_SAVE_KEY))return;
  try{
    const old=JSON.parse(localStorage.getItem(LEGACY_SAVE_KEY));
    if(old?.world&&Array.isArray(old.forests)){
      old.version=2;old.slot='auto';
      localStorage.setItem(SAVE_KEYS.auto,JSON.stringify(old));
    }
  }catch(e){}
}
migrateLegacySave();
$('load-shortcut').onclick=()=>{
  drawRecordSlots();
  $('quick-loads').classList.toggle('hide');
};

/* ══════════ ループ ══════════ */

