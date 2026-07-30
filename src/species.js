const SPECIES={
  sugi:  {id:'sugi',  name:'杉', D:0.40,H:19,rho:380,MOR:60e6,unit:13000,cost:3,f:1.00,
          ft:'繊維がまっすぐで刃がよく入る。体力に余裕が残る。'},
  hinoki:{id:'hinoki',name:'檜', D:0.36,H:17,rho:410,MOR:75e6,unit:28000,cost:4,f:0.90,
          ft:'細いぶん切る量は少ないが、刃が鈍りやすい。値は高い。'},
  nara:  {id:'nara',  name:'楢', D:0.48,H:15,rho:670,MOR:95e6,unit:30000,cost:5,f:1.20,
          ft:'太く硬い。枝が偏り重心が読みにくい。体力を食う。'}
};
const GRADES=[{min:82,name:'特等',mult:1.35},{min:66,name:'一等',mult:1.15},
              {min:48,name:'二等',mult:1.00},{min:0,name:'三等',mult:0.80}];
const gradeOf=g=>GRADES.find(x=>g>=x.min);

/* ══════════ 世界 ══════════ */

function pickSpecies(mix){
  const keys=Object.keys(mix), tot=keys.reduce((s,k)=>s+mix[k],0);
  let r=Math.random()*tot;
  for(const k of keys){r-=mix[k]; if(r<=0)return SPECIES[k]}
  return SPECIES[keys[0]];
}
function makeTree(f,opt={}){
  const ce=effCare(f);
  const sp=opt.sp||pickSpecies(f.mix);
  let straight,knots,g;
  let tries=0;
  do{
    straight=clamp(rnd(30+ce*0.50,55+ce*0.45),30,100);
    knots=clamp(rnd(Math.max(0,40-ce*0.4),85-ce*0.55),0,opt.easy?24:80);
    g=straight*0.6+(100-knots)*0.4;
    tries++;
  }while(opt.minG&&g<opt.minG&&tries<40);
  if(opt.minG&&g<opt.minG){straight=clamp(straight+18,30,100);knots=clamp(knots-18,0,80);
    g=straight*0.6+(100-knots)*0.4}
  const D=opt.easy?rnd(0.14,0.19):opt.smallD? rnd(0.15,0.22)
        : clamp(f.avgD*sp.f*rnd(0.72,1.32),0.14,0.65);
  const H=sp.H*Math.sqrt(D/sp.D)*rnd(0.92,1.08);
  const gr=gradeOf(g);
  const volume=Math.PI*(D/2)**2*H*0.42;
  const price=Math.round(volume*sp.unit*gr.mult/100)*100;
  const leanBase=1.0+(100-straight)/100*4.5;
  const swings=Math.round(15*(D/0.40)*(1+knots/300));
  const est=Math.max(10,Math.round(swings*(sp.cost+0.9)/5)*5);
  const hidden=Math.random();
  const potential=hidden<0.15?'fine':hidden<0.30?'rot':'normal';
  return {...sp,D,H,straight,knots,grade:gr.name,gradeMult:gr.mult,
          volume,price,leanBase,est,potential,defect:potential==='rot'};
}
/* 柴犬の二段目で見られる木が増える（ROADMAP §11.7） */
const standSize=()=>dogStage('shiba')>=2?20:16;
function generateStand(f){
  const list=[makeTree(f,{easy:true}),makeTree(f,{easy:true}),makeTree(f,{easy:true}),makeTree(f,{minG:66})];
  for(let i=4;i<standSize();i++) list.push(makeTree(f));
  for(let i=list.length-1;i>0;i--){const j=ri(0,i);[list[i],list[j]]=[list[j],list[i]]}
  return list;
}

/* ══════════ 伐倒状態 ══════════ */

