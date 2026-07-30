/* ══════════ 冒頭の物語と手ほどき ══════════
   絵も音も使わず、既存の配色の枠にテキストを出すだけ。
   画面の切り替わり（toMap / selectTree / goto / showResult / toEvening / toNight）に
   相乗りして、その場面で一度だけ出す。

   1周したら二度と出ない（localStorage）。右上の「説明を飛ばす」でいつでも打ち切れる。 */

const TUTORIAL_KEY='kikori-tutorial-done-v1';

/* 冒頭の一枚。ここだけは物語で、操作の説明をしない */
const OPENING=`幾年ぶりかに、故郷の土を踏んだ。

震災は山を裂き、社を倒したまま、
誰も手をつけられずにいる。

祭りの夜、あの境内は人で埋まっていた。
今の社では、もう笛の音も響くまい。

壁に、父の斧が掛かったままだった。
柄の窪みは、まだ手に馴染む。`;

/* 場面ごとの手ほどき。key は出す場所、once は一度きり */
const TUTORIAL_STEPS={
  map:{
    label:'朝　—　地図',
    title:'一日は、体力の分だけ動ける',
    body:`体力は<b>一日 100</b>。山へ行くにも、斧を振るにも、ここから減っていく。
      <div class="tu-flow">
        <span class="tu-step">朝　行き先を決める</span><i>→</i>
        <span class="tu-step">昼　木を伐る</span><i>→</i>
        <span class="tu-step">夕方　ひと仕事</span><i>→</i>
        <span class="tu-step">夜　支度</span>
      </div>
      <p class="tu-note">夕方の仕事にも<b>体力を10〜20</b>使う。使い切らずに残しておくこと。
      （夜は体力を使わない）</p>`
  },
  forest:{
    label:'林　—　伐倒の流れ',
    title:'一本を倒すまでに、四つの手順がある',
    body:`<div class="tu-flow">
        <span class="tu-step">① 木を選ぶ</span><i>→</i>
        <span class="tu-step">② 向きを決める</span><i>→</i>
        <span class="tu-step">③ 斧で二か所を切る</span><i>→</i>
        <span class="tu-step">④ 倒す</span>
      </div>
      <p class="tu-note">③では、倒したい側に<b>受け口</b>、その反対から<b>追い口</b>を入れる。
      切っている間は、画面の左に<b>断面図</b>が出て、いまどこまで切れているかを映す。</p>`
  },
  select:{
    label:'①　木を選ぶ',
    title:'木は三種。同じ種でも一本ずつ違う',
    body:`<table class="tu-tbl">
        <tr><td>杉</td><td>素直で扱いやすい</td></tr>
        <tr><td>檜</td><td>値が高い</td></tr>
        <tr><td>楢</td><td>太く硬い。値も張る</td></tr>
      </table>
      同じ種類でも<b>太さ・売値</b>が一本ごとに違う。
      札の<b>「体力の目安」</b>が、その木を倒すのに要るおよその体力。
      <p class="tu-note">伐った木は売らずに<b>五本まで</b>取っておける。物置を建てれば、もっと。</p>`
  },
  aim:{
    label:'②　向きを決める',
    title:'狙った所へ倒すほど、評価も値も上がる',
    body:`地面の<g>緑の帯</g>が、倒したい方角。<br>
      <b>白い線</b>が、いまのままなら倒れていく方角。
      <p class="tu-note">二つを重ねてから伐れば<b>倒す精度</b>が満点になり、<b>売値も上がる</b>。
      木の傾きと風が邪魔をしてくるので、盤を回して調整する。</p>`
  },
  cut:{
    label:'③　斧で二か所を切る',
    title:'受け口で向きを決め、追い口で倒す',
    body:`<table class="tu-tbl">
        <tr><td>受け口</td><td>倒す側にクサビ形の切り欠きを作る。<b>斜め</b>と<b>水平</b>を同じ深さで揃える</td></tr>
        <tr><td>追い口</td><td>反対側から水平に。残した帯が<b>ツル</b>——これが舵になる</td></tr>
      </table>
      <p class="tu-note">左の<b>断面図</b>を見ながら切る。
      <g>緑の破線</g>まで来たら止める。切りすぎると舵を失う。</p>`
  },
  result:{
    label:'結果',
    title:'七つの目で見られる',
    body:`倒れたあと、<b>倒す精度・ツルの幅・受け口の深さ</b>など七項目が採点される。<br>
      合計が<b>ランク</b>になり、そのまま<b>売値の倍率</b>になる。
      <p class="tu-note">一番落とした項目に助言が出る。次はそこだけ直せばいい。</p>`
  },
  evening:{
    label:'夕方',
    title:'できるのは、ひとつだけ',
    body:`<table class="tu-tbl">
        <tr><td>早めに帰る</td><td>体力を残すほど、翌朝に多く繰り越せる（半分・上限20）</td></tr>
        <tr><td>山菜・きのこ</td><td>体力10。翌朝へ +0〜30。当たり外れがある</td></tr>
        <tr><td>枝打ち</td><td>体力20。その林の手入れ度が上がる</td></tr>
        <tr><td>道の手入れ</td><td>体力20。その林への移動が恒久的に楽になる</td></tr>
      </table>
      <p class="tu-note">選べるのは一つだけ。
      <b>翌朝へ繰り越せるのは上の二つを選んだときだけ</b>で、
      枝打ちと道の手入れを選ぶと、余った体力はその日限りで消える。</p>`
  },
  night:{
    label:'夜　—　家',
    title:'体力は使わない。明日の支度をする',
    body:`<table class="tu-tbl">
        <tr><td>道具</td><td>斧を買う・持ち替える</td></tr>
        <tr><td>消耗品</td><td>弁当・砥石・楔など</td></tr>
        <tr><td>犬</td><td>迎える・世話をする</td></tr>
        <tr><td>建てる</td><td>物置・犬小屋・工房など</td></tr>
        <tr><td>依頼</td><td>受ける・進み具合を見る</td></tr>
        <tr><td>材木倉庫</td><td>取っておいた木を売る・納める</td></tr>
      </table>
      <p class="tu-note">支度が済んだら「翌朝へ」。記録を残すこともできる。</p>`
  }
};

const tutorialDone=()=>{try{return !!localStorage.getItem(TUTORIAL_KEY)}catch(e){return true}};
function finishTutorial(){
  try{localStorage.setItem(TUTORIAL_KEY,'1')}catch(e){}
  TU.active=false; hideTutorial();
}
/* 出した場面を覚えておく。同じ場面で二度は出さない。
   opening が真の間は、冒頭の物語を隠してしまわないよう手ほどきを出さない */
const TU={active:false,seen:{},opening:false};

function hideTutorial(){
  const el=$('tutov'); if(el)el.classList.add('hide');
}
/* 冒頭の物語。「山へ行く」を押すまで進めない */
function showOpening(){
  if(tutorialDone())return;
  TU.active=true; TU.opening=true;
  const el=$('tutov'); if(!el)return;
  $('tut-label').textContent='春';
  $('tut-title').textContent='';
  $('tut-title').classList.add('hide');
  $('tut-body').className='tu-story';
  $('tut-body').innerHTML=OPENING.replace(/\n/g,'<br>')
    +'<p class="tu-ask">——伐り方は、まだ憶えているだろうか。</p>';
  $('tut-ok').textContent='山　へ　行　く';
  el.classList.remove('hide');
  /* 閉じたあとで朝の手ほどきへ繋ぐ。
     起動時は toMap() が先に走ってしまうので、ここで改めて出す */
  $('tut-ok').onclick=()=>{TU.opening=false;hideTutorial();showTutorial('map')};
}
/* 場面ごとの手ほどき。同じ場面では一度だけ */
function showTutorial(key){
  if(!TU.active||TU.opening||tutorialDone()||TU.seen[key])return;
  const s=TUTORIAL_STEPS[key]; if(!s)return;
  TU.seen[key]=true;
  const el=$('tutov'); if(!el)return;
  $('tut-label').textContent=s.label;
  $('tut-title').textContent=s.title;
  $('tut-title').classList.remove('hide');
  $('tut-body').className='';
  $('tut-body').innerHTML=s.body;
  $('tut-ok').textContent='わ　か　っ　た';
  el.classList.remove('hide');
  $('tut-ok').onclick=()=>{
    hideTutorial();
    /* 最後の一枚（夜）まで来たら、もう出さない */
    if(key==='night')finishTutorial();
  };
}
