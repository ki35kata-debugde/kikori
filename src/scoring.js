const CRIT=[
  {k:'dir',n:'倒す精度',t:'ズレ3°以内',max:35,
   get:()=>S.done?S.actualErr:Phys.predErr(),fmt:v=>v.toFixed(1)+'°',
   score:v=>v<3?35:v<8?27:v<16?17:v<30?8:0,state:v=>v<3?'ok':v<8?'mid':v<16?'':'ng'},
  {k:'hin',n:'ツルの幅',t:'8〜12%',max:25,
   get:()=>S.phase>=2?hingeRatio()*100:null,fmt:v=>v.toFixed(0)+'%',
   score:v=>(v>=8&&v<=12)?25:(v>=6&&v<=16)?17:v>3?8:0,
   state:v=>(v>=8&&v<=12)?'ok':(v>=6&&v<=16)?'mid':'ng'},
  {k:'ntc',n:'受け口の深さ',t:'22〜35%',max:12,
   get:()=>S.phase>=1?notchDepth()*100:null,fmt:v=>v.toFixed(0)+'%',
   score:v=>(v>=22&&v<=35)?12:(v>=17&&v<=42)?7:2,
   state:v=>(v>=22&&v<=35)?'ok':(v>=17&&v<=42)?'mid':'ng'},
  {k:'ang',n:'受け口の開き',t:'45〜70°',max:8,
   get:()=>S.phase>=1?S.nAngle:null,fmt:v=>v.toFixed(0)+'°',
   score:v=>(v>=45&&v<=70)?8:(v>=40&&v<=75)?5:1,
   state:v=>(v>=45&&v<=70)?'ok':(v>=40&&v<=75)?'mid':'ng'},
  {k:'gap',n:'切り口の合わせ',t:'ぴたり 3cm以内',max:8,
   get:()=>S.phase>=1?gapCm():null,fmt:v=>v.toFixed(1)+'cm',
   score:v=>v<=3?8:v<=6?4:0,state:v=>v<=3?'ok':v<=6?'mid':'ng'},
  {k:'hgt',n:'追い口の高さ',t:'+2〜+5cm',max:6,
   get:()=>S.backHits.length?S.backH:null,fmt:v=>(v>0?'+':'')+v.toFixed(1)+'cm',
   score:v=>(v>=2&&v<=5)?6:v>=0?3:0,state:v=>(v>=2&&v<=5)?'ok':v>=0?'mid':'ng'},
  {k:'eff',n:'振った数',t:'少ないほど良',max:6,
   get:()=>S.swings,fmt:v=>v+'回',
   score:v=>v<=12?6:v<=17?4:v<=23?2:0,state:v=>v<=12?'ok':v<=17?'mid':''}
];
function drawEval(){
  let total=0,html='';
  for(const c of CRIT){
    const v=c.get();
    if(v===null||v===undefined){
      html+=`<div class="ev"><span class="n">${c.n}</span><span class="t">${c.t}</span><span class="v off">—</span></div>`;
      continue}
    total+=c.score(v);
    html+=`<div class="ev"><span class="n">${c.n}</span><span class="t">${c.t}</span><span class="v ${c.state(v)}">${c.fmt(v)}</span></div>`;
  }
  $('e-rows').innerHTML=html;
  const sh=S.barber?Math.round(total*.2):total;
  $('e-score').textContent=sh;
  $('e-score').className=sh>=85?'ok':sh>=60?'mid':sh>=35?'':'ng';
  return total;
}

/* ══════════ 3D 基盤 ══════════ */

