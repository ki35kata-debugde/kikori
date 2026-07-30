const ZONE=[.15,.85],PERF=[.33,.67];
$('zone').style.left='15%'; $('zone').style.width='70%';
$('perf').style.left='33%'; $('perf').style.width='34%';
// 縦（追い口・高さ）  -3cm 〜 +8cm
const VLO=-3,VHI=8,VSPAN=VHI-VLO;
const vpct=h=>(h-VLO)/VSPAN*100;
$('vg-hit').style.bottom=vpct(0)+'%';  $('vg-hit').style.height=(vpct(7)-vpct(0))+'%';
$('vg-perf').style.bottom=vpct(2)+'%'; $('vg-perf').style.height=(vpct(5)-vpct(2))+'%';
$('vg-zero').style.bottom=vpct(0)+'%';

let gT=.5,gDir=1,gSpd=1,gRun=false,gCool=0,gVert=false;
function gaugeOn(vert){
  gVert=vert; gSpd=vert?0.90:1.00; gRun=true;
  $('gauge').classList.toggle('hide',vert);
  $('gauge').classList.add('live');
  $('vg').classList.toggle('hide',!vert);
}
function gaugeOff(){gRun=false;$('gauge').classList.remove('live')}
function curHeight(){return VLO+VSPAN*gT}
function quality(){
  if(gVert){const h=curHeight();
    return (h>=2&&h<=5)?2:(h>=0&&h<=7)?1:0}
  return (gT>=PERF[0]&&gT<=PERF[1])?2:(gT>=ZONE[0]&&gT<=ZONE[1])?1:0;
}
const POW=[0.75,1.00,1.50];

function swingCost(){
  /* 秋田犬の二段目は斧の重さを1軽くする。1日の総振り数 = 体力 ÷ 一振りの体力 なので、
     ここが1日に伐れる本数に直接効く（ROADMAP §11.7） */
  const w=Math.max(0,AXES[WORLD.axe].weight-(dogStage('akita')>=2?1:0));
  let c=T.cost+w;
  if(S.phase===1&&S.face==='horiz')c+=1;
  if(S.phase===2)c+=1;
  if(S.edge<60)c+=1;
  return c;
}

/* ══════════ 解説 ══════════ */

