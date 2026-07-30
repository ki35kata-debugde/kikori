/* ══════════ 昼の色 ══════════
   朝夕夜の水彩画と同じ空気を昼にも作る。要は3つ。
   ・空は単色でなく上から下へのにじみ。遠くほど霧で淡くなる（空気遠近）
   ・落ち影は置かず、根元に薄い接地影を敷く
   ・彩度を抑え、遠景ほど青灰へ寄せる
   詳細と守るべき条件は SPEC §16.8。                                     */
const DAY={
  sky:0x9fb6bd, horizon:0xcbcdc4, fog:0xc2c7bf,
  ground:0x66734f, grassA:0x4a5739, grassB:0x5c6845,
  farA:0x62798a, farB:0x6e8390, farTrunk:0x6b5c4c, farLeaf:0x5c7058
};
/* 林ごとの気配。朝夕の tone-0〜4 と同じ並び */
const DAY_TONE=[
  {sky:0xa8bcbd,horizon:0xd2cfbe,fog:0xc9c8b9,ground:0x6c744d},  // 近くの雑木林　乾いた黄緑
  {sky:0x9db7c2,horizon:0xcbcec6,fog:0xc1c6be,ground:0x5f7157},  // 東の沢　　　　沢の湿り
  {sky:0x94a9b4,horizon:0xc3c5bb,fog:0xb8bdb5,ground:0x5a684a},  // 奥山　　　　　深く暗い
  {sky:0xa3b4c4,horizon:0xcccdc6,fog:0xc2c5be,ground:0x647259},  // 深山　　　　　青みの壮齢林
  {sky:0xb3c3cd,horizon:0xdcdbd4,fog:0xd2d2cc,ground:0x757d70}   // 雪の峰　　　　白く冷たい
];

const scene=new THREE.Scene();
/* 上から下へのにじみを天球に貼る。単色背景だと「暗い箱の中」に見える */
function skyTexture(top,bottom){
  const c=document.createElement('canvas'); c.width=8; c.height=256;
  const x=c.getContext('2d'), g=x.createLinearGradient(0,0,0,256);
  const hex=v=>'#'+v.toString(16).padStart(6,'0');
  g.addColorStop(0,hex(top)); g.addColorStop(.62,hex(top));
  g.addColorStop(.90,hex(bottom)); g.addColorStop(1,hex(bottom));
  x.fillStyle=g; x.fillRect(0,0,8,256);
  const t=new THREE.CanvasTexture(c);
  t.mapping=THREE.EquirectangularReflectionMapping;
  return t;
}
scene.background=skyTexture(DAY.sky,DAY.horizon);
scene.fog=new THREE.Fog(DAY.fog,30,152);
const cam=new THREE.PerspectiveCamera(46,innerWidth/innerHeight,0.05,320);
const rend=new THREE.WebGLRenderer({antialias:true});
rend.setPixelRatio(Math.min(devicePixelRatio,2));
rend.setSize(innerWidth,innerHeight);
$('stage').appendChild(rend.domElement);

const orb={az:0,el:.22,r:46,tgt:new THREE.Vector3(0,8,0)};
const want={r:46,ty:8};
function applyCam(){
  orb.el=clamp(orb.el,-0.10,1.15); orb.r=clamp(orb.r,2.2,90);
  cam.position.set(orb.tgt.x+orb.r*Math.cos(orb.el)*Math.sin(orb.az),
                   orb.tgt.y+orb.r*Math.sin(orb.el),
                   orb.tgt.z+orb.r*Math.cos(orb.el)*Math.cos(orb.az));
  cam.lookAt(orb.tgt);
}
let drag=null,dragMoved=0;
rend.domElement.addEventListener('pointerdown',e=>{
  drag={x:e.clientX,y:e.clientY};dragMoved=0;
  rend.domElement.setPointerCapture(e.pointerId)});
rend.domElement.addEventListener('pointermove',e=>{
  if(SCREEN==='forest'&&!drag)hoverStand(e);
  if(!drag)return;
  const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
  dragMoved+=Math.abs(dx)+Math.abs(dy);
  orb.az-=dx*0.006; orb.el+=dy*0.005;
  drag={x:e.clientX,y:e.clientY}; applyCam()});
addEventListener('pointerup',e=>{
  if(drag&&dragMoved<6&&SCREEN==='forest')clickStand(e);
  drag=null});
rend.domElement.addEventListener('wheel',e=>{e.preventDefault();
  want.r=clamp(want.r+e.deltaY*0.02,2.4,86)},{passive:false});

/* 直射を弱め回り込みを強くする。水彩は明暗差が浅い */
const hemi=new THREE.HemisphereLight(0xd8ddd2,0x6e7261,0.66); scene.add(hemi);
scene.add(new THREE.AmbientLight(0xc9cec2,0.16));
const sun=new THREE.DirectionalLight(0xfff4de,0.62);
sun.position.set(-20,38,-6); scene.add(sun);
const rim=new THREE.DirectionalLight(0xa8c2cf,0.22); rim.position.set(18,11,20); scene.add(rim);

/* 落ち影の代わりに敷く、輪郭のにじんだ接地影 */
const shadowMat=(()=>{
  const c=document.createElement('canvas'); c.width=c.height=64;
  const x=c.getContext('2d'), g=x.createRadialGradient(32,32,0,32,32,32);
  g.addColorStop(0,'rgba(52,58,46,.40)'); g.addColorStop(.5,'rgba(52,58,46,.19)');
  g.addColorStop(1,'rgba(52,58,46,0)');
  x.fillStyle=g; x.fillRect(0,0,64,64);
  return new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),
    transparent:true,depthWrite:false});
})();
const shadowGeo=new THREE.PlaneGeometry(1,1);
function contactShadow(x,z,r){
  const m=new THREE.Mesh(shadowGeo,shadowMat);
  m.rotation.x=-Math.PI/2; m.position.set(x,0.03,z); m.scale.set(r*2,r*2,1);
  return m;
}
/* 輪郭を角度まわりにうねらせる。定規で引いた線を手描きに戻す */
function wobble(geo,amp){
  const p=geo.attributes.position, s=rnd(0,6.28);
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),z=p.getZ(i),r=Math.hypot(x,z);
    if(r<1e-4)continue;
    const a=Math.atan2(z,x);
    const k=1+amp*(Math.sin(a*3+s)*.62+Math.sin(a*5-s*1.7)*.38);
    p.setX(i,x*k); p.setZ(i,z*k);
  }
  p.needsUpdate=true; geo.computeVertexNormals(); return geo;
}

const groundMat=new THREE.MeshLambertMaterial({color:DAY.ground});
/* 霧の到達距離より広く取る。地面の縁が地平線として一直線に見えるのを防ぐ */
const ground=new THREE.Mesh(new THREE.CircleGeometry(300,64),groundMat);
ground.rotation.x=-Math.PI/2; scene.add(ground);
/* 遠景の山と足元の草。伐倒物理には参加しない景観メッシュ。 */
const farMats=[];
for(let i=0;i<12;i++){
  const a=i/12*Math.PI*2+rnd(-.12,.12),d=rnd(96,112),h=rnd(22,36),r=rnd(22,34);
  const mat=new THREE.MeshLambertMaterial({color:i%2?DAY.farA:DAY.farB,flatShading:true});
  farMats.push(mat);
  const mountain=new THREE.Mesh(new THREE.ConeGeometry(r,h,5),mat);
  mountain.position.set(Math.sin(a)*d,h/2-3,Math.cos(a)*d);
  mountain.rotation.y=rnd(0,Math.PI);scene.add(mountain);
}
/* ── 地面のむら ──
   一色の地面は芝生に見える。水彩の滲みに倣い、大きく淡い染みを重ねて濃淡を作る */
const washMats=[0,1].map(()=>{
  const c=document.createElement('canvas'); c.width=c.height=64;
  const x=c.getContext('2d'), g=x.createRadialGradient(32,32,0,32,32,32);
  g.addColorStop(0,'rgba(255,255,255,1)'); g.addColorStop(.45,'rgba(255,255,255,.72)');
  g.addColorStop(1,'rgba(255,255,255,0)');
  x.fillStyle=g; x.fillRect(0,0,64,64);
  return new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),
    transparent:true,opacity:.16,depthWrite:false});
});
for(let i=0;i<22;i++){
  const a=rnd(0,Math.PI*2),d=Math.sqrt(Math.random())*58,r=rnd(5,15);
  const w=new THREE.Mesh(shadowGeo,washMats[i%2]);
  w.rotation.x=-Math.PI/2; w.rotation.z=rnd(0,Math.PI);
  w.position.set(Math.sin(a)*d,.012+i*.0004,Math.cos(a)*d);
  w.scale.set(r*2,r*2*rnd(.6,1),1); scene.add(w);
}

/* ── 下草 ──
   立て板の草は法線が横を向くので光が乗らず、明るい地面の上で黒い棘になる。
   地面から少しだけ色を外した、低くて丸い塊に置き換える */
/* なめらかな丸い塊は石になる。房に割って天面をぎざつかせ、葉の側の形にする */
function tussockGeometry(){
  const g=new THREE.SphereGeometry(1,12,6,0,Math.PI*2,0,Math.PI/2);
  const p=g.attributes.position, s=rnd(0,6.28);
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
    if(Math.hypot(x,z)<1e-4&&y<1e-4)continue;
    const a=Math.atan2(z,x), t=Math.hypot(x,z);   // t: 天辺 0 → 裾 1
    const lobe=Math.sin(a*4+s)*.50+Math.sin(a*7-s*1.6)*.28+Math.sin(a*3+s*2.1)*.34;
    p.setX(i,x*(1+.30*lobe)); p.setZ(i,z*(1+.30*lobe));
    /* 天辺は動かさない。動かすとへこんで座布団に見える */
    p.setY(i,y*(1+.40*lobe*t)*(1-.26*t*(.5-.5*Math.sin(a*6-s))));
  }
  p.needsUpdate=true; g.computeVertexNormals(); return g;
}
const moundGeo=tussockGeometry();
/* 色は地面ではなく葉の緑から作る。地面から作ると彩度が落ちて石に見える */
const grassMats=[
  new THREE.MeshLambertMaterial({color:DAY.grassA,flatShading:true}),
  new THREE.MeshLambertMaterial({color:DAY.grassB,flatShading:true})
];
/* 一株ずつ散らすと置き物に見える。数株を寄せて「藪」の単位にし、
   同じ藪の中で色を2つ混ぜる。滲みが重なった水彩の下草に近づく */
(function(){
  const spots=[[],[]];
  for(let i=0;i<15;i++){
    const a=rnd(0,Math.PI*2),d=Math.sqrt(Math.random())*46;
    const cx=Math.sin(a)*d, cz=Math.cos(a)*d, n=ri(3,5);
    for(let j=0;j<n;j++){
      const oa=rnd(0,Math.PI*2),od=rnd(0,1.5),r=rnd(.34,.80);
      spots[j%2].push([cx+Math.cos(oa)*od, cz+Math.sin(oa)*od, r]);
    }
  }
  spots.forEach((list,layer)=>{
    const g=new THREE.InstancedMesh(moundGeo,grassMats[layer],list.length);
    const m=new THREE.Matrix4();
    list.forEach(([x,z,r],i)=>{
      m.compose(new THREE.Vector3(x,0,z),
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),rnd(0,Math.PI*2)),
        new THREE.Vector3(r,r*rnd(.62,1.05),r*rnd(.72,1.15)));
      g.setMatrixAt(i,m);
    });
    scene.add(g);
  });
})();

const farTrunkMat=new THREE.MeshLambertMaterial({color:DAY.farTrunk});
const farLeafMat=new THREE.MeshLambertMaterial({color:DAY.farLeaf});
for(let i=0;i<52;i++){
  const a=rnd(0,Math.PI*2),d=rnd(46,92),h=rnd(11,20);
  const t=new THREE.Mesh(new THREE.CylinderGeometry(.16,.24,h,6),farTrunkMat);
  t.position.set(Math.sin(a)*d,h/2,Math.cos(a)*d); scene.add(t);
  const c=new THREE.Mesh(wobble(new THREE.ConeGeometry(rnd(1.6,2.6),rnd(6,10),9),.09),farLeafMat);
  c.position.set(t.position.x,h*.82,t.position.z);
  c.rotation.y=rnd(0,Math.PI*2); scene.add(c);
}
const azAxis=p=>new THREE.Vector3(-Math.cos(p),0,-Math.sin(p)).normalize();

/* ── 幹 ──
   伐倒中は幹を最も長く見る。均一な円筒だと作り物に見えるので3つ足す。
   ・樹皮の縦じまを頂点色で入れる（画像を貼らずに手描きの濃淡を出す）
   ・根元だけ張り出させる（根張り。切断高さ 0.42m には届かせない）
   ・根元をわずかに沈ませ、地面と繋ぐ
   輪郭のうねりは受け口の板（幅 D*1.04）を超えないよう 2% に留める。 */
/* 樹皮。実物の写真から取った特徴を樹種ごとに分ける。
   杉・檜 … 赤褐色。細い裂片が縦に長く走り、横には切れない
   コナラ … 灰褐色。縦の割れが不規則で、縦方向のむらが大きい            */
const BARK={
  sugi:  {col:0xa8785e, strip:1.00, rough:.34, warp:.38},
  hinoki:{col:0xb08c70, strip:.92,  rough:.28, warp:.34},
  nara:  {col:0x9c9184, strip:.58,  rough:.92, warp:.95}
};
const FLARE_H=0.34;
function makeTrunk(R,H,sp){
  const B=BARK[sp]||BARK.sugi;
  const g=new THREE.CylinderGeometry(R*.66,R,H,64,26);
  const p=g.attributes.position, s=rnd(0,6.28), base=new THREE.Color(B.col), col=[];
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
    const r=Math.hypot(x,z), a=Math.atan2(z,x), yy=y+H/2;
    /* 溝は細く深く、裂片は広く平らに。sin をそのまま使うと縞になって樹皮に見えない。
       裂片は真っ直ぐでなく、高さに応じて蛇行させ、ときどき合流させる。 */
    /* warp が裂片の幅を不揃いにする。等間隔だと円柱の装飾に見える */
    const w=a*13+Math.sin(yy*.38+s)*.85+Math.sin(yy*1.1-s*.7)*.35
           +B.warp*(Math.sin(a*4+s*2.3)*1.05+Math.sin(a*7-s*1.1)*.55);
    const groove=Math.pow(Math.abs(Math.sin(w+s)),3.0);          // 1=裂片 0=溝
    const fine  =Math.pow(Math.abs(Math.sin(a*27-s*1.3)),1.6);
    const rough =Math.sin(yy*2.7+a*3+s)*.5+.5;                   // 縦方向のむら
    if(r>1e-4){
      let k=1+.02*(Math.sin(a*3+s)*.62+Math.sin(a*5-s*1.7)*.38);
      k-=B.strip*.016*(1-groove);              /* 溝を実際にへこませ、光を拾わせる */
      if(yy<FLARE_H){                          /* 根張り */
        const u=1-yy/FLARE_H;
        k*=1+.46*u*u*(.66+.34*Math.sin(a*3+s*1.3));
      }
      p.setX(i,x*k); p.setZ(i,z*k);
    }
    const k2=(1-B.strip*.40*(1-groove)-B.strip*.13*(1-fine)-B.rough*.15*(1-rough))
            *(.90+.10*Math.min(1,yy/2.2));
    col.push(base.r*k2,base.g*k2,base.b*k2);
  }
  p.needsUpdate=true;
  g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
  g.computeVertexNormals();
  return g;
}

/* 木のメッシュ */
function makeTreeMesh(t){
  const g=new THREE.Group(), R=t.D/2;
  const bark=(BARK[t.id]||BARK.sugi).col;
  const leaf=t.id==='nara'?0x7d9061:t.id==='hinoki'?0x6c8a6c:0x557a5f;
  const sc=clamp(t.D/0.40,.5,1.5);
  /* 楢は樹冠が H*0.70 から始まるので、幹を全高まで伸ばすと頭から突き抜ける。
     杉・檜は最上段の葉を H+0.65 まで伸ばして覆っている（下の extend）。 */
  const trunkH=t.id==='nara'?t.H*.70+1.7*sc:t.H;
  const tr=new THREE.Mesh(makeTrunk(R,trunkH,t.id),
    new THREE.MeshLambertMaterial({vertexColors:true}));
  tr.position.y=trunkH/2-.02; g.add(tr);          /* 2cm 埋めて地面と繋ぐ */
  /* 節。飛び出した球だと粒に見えるので、幹に沿わせた扁平な瘤にする */
  for(let i=0;i<Math.round(t.knots/24);i++){
    const a=rnd(0,6.28),y=rnd(trunkH*.25,trunkH*.78);
    const k=new THREE.Mesh(new THREE.SphereGeometry(R*rnd(.20,.32),7,5),
      new THREE.MeshLambertMaterial({color:new THREE.Color(bark).multiplyScalar(.74)}));
    k.position.set(Math.sin(a)*R*.80,y,Math.cos(a)*R*.80);
    k.lookAt(Math.sin(a)*R*4,y,Math.cos(a)*R*4);
    k.scale.set(1,rnd(.52,.8),.40); g.add(k)}
  if(t.id==='nara'){
    const crownY=t.H*.70;
    [[0,0,0],[-2.0,0,.5],[1.9,.2,.4],[-.8,1.8,-.3],[1.0,1.7,.2]].forEach(([x,y,z],i)=>{
      const c=new THREE.Mesh(new THREE.SphereGeometry((2.55-(i%2)*.22)*sc,16,11),
        new THREE.MeshLambertMaterial({color:i%2?0x8a9c6a:leaf}));
      c.scale.set(1.2,.82,1);c.position.set(x*sc,crownY+y*sc,z*sc);
      c.rotation.y=rnd(0,Math.PI*2);g.add(c);
    });
  }else{
    const hinoki=t.id==='hinoki', n=hinoki?3:7;
    for(let i=0;i<n;i++){
      const width=(hinoki?[3.15,2.65,2.15][i]:2.95-i*.31)*sc;
      let height=(hinoki?[5.8,4.9,4.2][i]:4.3-i*.18)*Math.sqrt(sc);
      let crownY=t.H*((hinoki?.52:.40)+i*(hinoki?.14:.085));
      if(i===n-1){
        const extend=Math.max(0,t.H+.65-(crownY+height/2));
        height+=extend;
        crownY+=extend/2;
      }
      const c=new THREE.Mesh(
        wobble(new THREE.ConeGeometry(Math.max(.75,width),height,16),.055),
        new THREE.MeshLambertMaterial({color:i%2&&hinoki?0x7d9a78:leaf}));
      c.position.set(hinoki?Math.sin(i*1.7)*.18*sc:0,crownY,0);
      c.rotation.y=rnd(0,Math.PI*2);g.add(c);
    }
  }
  return g;
}
/* 樹冠のおおよその広がり。接地影の大きさに使う */
const crownRadius=t=>clamp(t.D/0.40,.5,1.5)*(t.id==='nara'?3.4:t.id==='hinoki'?3.15:2.95);

/* ══════════ 林（選択画面） ══════════ */
const standGrp=new THREE.Group(); scene.add(standGrp);
const stumpGrp=new THREE.Group(); scene.add(stumpGrp);
let nodes=[], hitList=[], hovered=-1;
const ray=new THREE.Raycaster(), ndc=new THREE.Vector2();
const ringSel=new THREE.Mesh(new THREE.RingGeometry(1.1,1.4,32),
  new THREE.MeshBasicMaterial({color:0xd4a94e,side:THREE.DoubleSide,transparent:true,opacity:.9}));
ringSel.rotation.x=-Math.PI/2; ringSel.position.y=.05; ringSel.visible=false; scene.add(ringSel);
const ringHov=new THREE.Mesh(new THREE.RingGeometry(1.15,1.3,32),
  new THREE.MeshBasicMaterial({color:0xe9e3d5,side:THREE.DoubleSide,transparent:true,opacity:.45}));
ringHov.rotation.x=-Math.PI/2; ringHov.position.y=.04; ringHov.visible=false; scene.add(ringHov);

function buildStand(f){
  while(standGrp.children.length)standGrp.remove(standGrp.children[0]);
  while(stumpGrp.children.length)stumpGrp.remove(stumpGrp.children[0]);
  nodes=[];hitList=[];sel=-1;hovered=-1;
  ringSel.visible=false;ringHov.visible=false;
  /* 柴犬の二段目で20本になる。3列に割り振る */
  const n0=stand.length;
  const rows=n0>=20?[7,7,n0-14]:[6,6,n0-12], zs=[6,-6,-18];
  let idx=0;
  for(let r=0;r<3;r++){
    const n=rows[r];
    for(let c=0;c<n;c++){
      const t=stand[idx];
      const x=(c-(n-1)/2)*7.6+rnd(-1.4,1.4);
      const z=zs[r]+rnd(-2,2);
      const g=makeTreeMesh(t); g.position.set(x,0,z);
      g.rotateOnWorldAxis(azAxis(rnd(0,6.28)),rad(t.leanBase*0.9));
      standGrp.add(g);
      const id=idx;
      g.traverse(o=>{if(o.isMesh){o.userData.idx=id;hitList.push(o)}});
      g.visible=!t.cut;
      const sh=contactShadow(x,z,crownRadius(t)*.62);
      sh.visible=!t.cut; standGrp.add(sh);
      nodes.push({group:g,shadow:sh,pos:new THREE.Vector3(x,0,z),cut:!!t.cut});
      idx++;
    }
  }
  for(const s of f.stumps){
    const m=new THREE.Mesh(new THREE.CylinderGeometry(s.r,s.r*1.1,0.45,12),
      new THREE.MeshLambertMaterial({color:0xb5a37e}));
    m.position.set(s.x,0.22,s.z); stumpGrp.add(m);
    stumpGrp.add(contactShadow(s.x,s.z,s.r*1.7));
  }
  setDayTone(f.id);
}
/* 昼の空・霧・地面・下草をその林の気配へ寄せる。朝夕の tone-0〜4 と対になる */
function setDayTone(id){
  const p=DAY_TONE[id]||DAY_TONE[0];
  if(scene.background)scene.background.dispose();
  scene.background=skyTexture(p.sky,p.horizon);
  scene.fog.color.setHex(p.fog);
  groundMat.color.setHex(p.ground);
  hemi.groundColor.setHex(p.ground).multiplyScalar(.86);
  farMats.forEach((m,i)=>m.color.setHex(i%2?DAY.farA:DAY.farB).lerp(
    new THREE.Color(p.sky),.18));
  /* 下草と染みは地面の色から派生させる。林が変わっても浮かない */
  const g=new THREE.Color(p.ground);
  grassMats[0].color.copy(g).lerp(new THREE.Color(0x44714e),.52).multiplyScalar(.88);
  grassMats[1].color.copy(g).lerp(new THREE.Color(0x5c8a52),.44).multiplyScalar(1.02);
  washMats[0].color.copy(g).multiplyScalar(.60);
  washMats[1].color.copy(g).multiplyScalar(1.42);
}
function fitStand(){
  const hHalf=Math.atan(Math.tan(rad(23))*cam.aspect);
  want.r=clamp(24/Math.tan(hHalf),36,84); want.ty=8;
}
function pick(ev){
  const r=rend.domElement.getBoundingClientRect();
  ndc.x=((ev.clientX-r.left)/r.width)*2-1;
  ndc.y=-((ev.clientY-r.top)/r.height)*2+1;
  ray.setFromCamera(ndc,cam);
  const h=ray.intersectObjects(hitList,false);
  for(const x of h){const i=x.object.userData.idx; if(!nodes[i].cut)return i}
  return -1;
}
function hoverStand(ev){
  const i=pick(ev); if(i===hovered)return;
  hovered=i; rend.domElement.style.cursor=i>=0?'pointer':'default';
  if(i>=0){ringHov.position.copy(nodes[i].pos);ringHov.position.y=.04;ringHov.visible=true}
  else ringHov.visible=false;
}
function clickStand(ev){const i=pick(ev); if(i>=0)selectTree(i)}
function selectTree(i){
  sel=i;
  ringSel.position.copy(nodes[i].pos); ringSel.position.y=.05; ringSel.visible=true;
  showTreeCard(stand[i]); showDogSense(stand[i],true); buildActs();
  showTutorial('select');
}
function showTreeCard(t){
  $('tc-empty').classList.add('hide'); $('tc-body').classList.remove('hide');
  $('tc-name').textContent=(requestMatches(t)?'★ ':'')+t.name;
  $('tc-grade').textContent=`${t.grade}　材積 ${t.volume.toFixed(2)} m³`;
  const meter=(v,good)=>{
    const col=good?(v>=70?'#7fa85c':v>=45?'#d4a94e':'#c04a32')
                  :(v<=25?'#7fa85c':v<=50?'#d4a94e':'#c04a32');
    return `<span class="meter"><i style="width:${v}%;background:${col}"></i></span>`};
  const estimate=treeEst(t),afford=estimate<=WORLD.stamina;
  $('tc-rows').innerHTML=
    `<div class="tr"><span>直径 / 樹高</span><b>${Math.round(t.D*100)}cm / ${t.H.toFixed(1)}m</b></div>`+
    `<div class="tr"><span>通直度</span>${meter(t.straight,true)}</div>`+
    `<div class="tr"><span>節の多さ</span>${meter(t.knots,false)}</div>`+
    `<div class="tr"><span>体力の目安</span><b class="${afford?'':'ng'}">約 ${estimate}</b></div>`;
  $('tc-price').innerHTML=`<span class="lb">推定売値</span><b>${yen(t.price)}</b><u> 円</u>`;
  $('tc-ft').textContent='';
  const sense=$('tc-dog');
  if(hasDog('shiba')){
    const p=treePotential(t);
    sense.innerHTML=p==='fine'
      ?'柴犬の見立て：<em>うれしそうに尻尾を振っている。芯まで良さそうだ。</em>'
      :p==='rot'
        ?'柴犬の見立て：<em>耳を伏せて、根元を気にしている。</em>'
        :'柴犬の見立て：落ち着いて見ている。変わった気配はない。';
  }else{
    sense.innerHTML='犬の見立て：<em>相棒がいれば</em>、外から見えない木の性質を教えてくれる。';
  }
}

/* ══════════ 一覧表 ══════════ */
function drawList(){
  const cols=[['req','依頼'],...(hasDog('shiba')?[['sense','柴犬鑑定']]:[]),['name','樹種'],['grade','品等'],['D','直径'],
              ['price','売値'],['est','体力']];
  const rows=stand.map((t,i)=>({...t,req:requestMatches(t)?1:0,sense:dogSense(t),i})).filter(t=>!nodes[t.i].cut);
  rows.sort((a,b)=>{const x=a[sortKey],y=b[sortKey];
    return (typeof x==='string'? x.localeCompare(y) : x-y)*sortDir});
  $('ltab').innerHTML=`<table><thead><tr>${
    cols.map(c=>`<th data-k="${c[0]}">${c[1]}${sortKey===c[0]?(sortDir>0?' ▲':' ▼'):''}</th>`).join('')
  }</tr></thead><tbody>${
    rows.map(t=>`<tr data-i="${t.i}" class="${t.i===sel?'on':''}">
      <td class="mid">${t.req?'★':''}</td>${hasDog('shiba')?`<td class="mid dog-sense ${treePotential(t)}">${dogSenseMark(t)}</td>`:''}<td>${t.name}</td><td>${t.grade}</td>
      <td>${Math.round(t.D*100)}cm</td>
      <td>${yen(t.price)}</td>
      <td class="${treeEst(t)<=WORLD.stamina?'':'ng'}">${treeEst(t)}</td></tr>`).join('')
  }</tbody></table>`;
  $('ltab').querySelectorAll('th').forEach(th=>th.onclick=()=>{
    const k=th.dataset.k;
    if(sortKey===k)sortDir*=-1; else {sortKey=k;sortDir=(k==='name'||k==='grade')?1:-1}
    drawList()});
  $('ltab').querySelectorAll('tbody tr').forEach(tr=>tr.onclick=()=>{
    selectTree(+tr.dataset.i); $('listov').classList.add('hide')});
}

/* ══════════ 主木 ══════════ */
const pivot=new THREE.Group(); scene.add(pivot);
let notchD=null,notchH=null,backCut=null;
const CUT_Y=0.42;
/* 主木の接地影。倒れても地面に残るので pivot ではなく scene に置く */
const mainShadow=contactShadow(0,0,3); mainShadow.visible=false; scene.add(mainShadow);
function buildTree(){
  while(pivot.children.length)pivot.remove(pivot.children[0]);
  const g=makeTreeMesh(T); pivot.add(...[...g.children]);
  const r=crownRadius(T)*.62; mainShadow.scale.set(r*2,r*2,1);
  const cm=new THREE.MeshLambertMaterial({color:0xe6d7b2});
  notchD=new THREE.Mesh(new THREE.BoxGeometry(1,.035,1),cm);notchD.visible=false;pivot.add(notchD);
  notchH=new THREE.Mesh(new THREE.BoxGeometry(1,.035,1),cm);notchH.visible=false;pivot.add(notchH);
  backCut=new THREE.Mesh(new THREE.BoxGeometry(1,.035,1),cm);backCut.visible=false;pivot.add(backCut);
}
function updateCuts(){
  const R=T.D/2;
  if(S.nHoriz>0){notchH.visible=true;const d=S.nHoriz*T.D;
    notchH.scale.set(T.D*1.04,1,d);notchH.position.set(0,CUT_Y,-(R-d/2));notchH.rotation.set(0,0,0)}
  if(S.nDiag>0){notchD.visible=true;const d=S.nDiag*T.D,a=rad(clamp(S.nAngle,30,80));
    notchD.scale.set(T.D*1.04,1,d/Math.cos(Math.min(a,1.25)));
    notchD.position.set(0,CUT_Y+d*Math.tan(a)/2,-(R-d/2));notchD.rotation.set(a,0,0)}
  if(S.backDepth>0){backCut.visible=true;const d=S.backDepth*T.D;
    backCut.scale.set(T.D*1.04,1,d);
    backCut.position.set(0,CUT_Y+S.backH/100,(R-d/2));backCut.rotation.set(0,0,0)}
}
function applyPose(){
  pivot.rotation.set(0,0,0);
  pivot.rotateOnWorldAxis(azAxis(S.lean0+S.spin),rad(S.leanDeg));
  if(S.felling)pivot.rotateOnWorldAxis(azAxis(S.fellAz),S.fellAngle);
}
const targetGrp=new THREE.Group(); scene.add(targetGrp);
const TH0=Math.PI/2-rad(5), TH1=Math.PI/2+rad(5);
const tBand=new THREE.Mesh(new THREE.RingGeometry(2.5,22,36,1,TH0,rad(10)),
  new THREE.MeshBasicMaterial({color:0x6f9c48,transparent:true,opacity:.36,side:THREE.DoubleSide}));
tBand.rotation.x=-Math.PI/2;tBand.position.y=.04;targetGrp.add(tBand);
/* 地面が明るくなった分、塗りだけでは帯が沈む。濃い緑の輪郭で境目を立てる（SPEC §16.8） */
(function(){
  const p=[],arc=(r,rev)=>{for(let i=0;i<=10;i++){
    const a=TH0+(TH1-TH0)*(rev?1-i/10:i/10);
    p.push(new THREE.Vector3(Math.cos(a)*r,Math.sin(a)*r,0))}};
  arc(2.5,false); arc(22,true); p.push(p[0].clone());
  const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(p),
    new THREE.LineBasicMaterial({color:0x3d6a26,transparent:true,opacity:.9}));
  line.rotation.x=-Math.PI/2; line.position.y=.045; targetGrp.add(line);
})();
for(let i=0;i<3;i++){
  const st=new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,1.7,6),
    new THREE.MeshStandardMaterial({color:0x7fa85c,emissive:0x2e4322}));
  st.position.set(0,.85,-(9+i*4.5));targetGrp.add(st)}
const predLine=new THREE.Line(new THREE.BufferGeometry().setFromPoints(
  [new THREE.Vector3(0,.07,-2.5),new THREE.Vector3(0,.07,-22)]),
  new THREE.LineBasicMaterial({color:0xf4efe2,transparent:true,opacity:.95}));
scene.add(predLine);
function updateWorld3(){
  targetGrp.rotation.y=-Phys.targetAz();
  predLine.rotation.y=-Phys.drift();
  applyPose(); updateCuts();
}

const axe=new THREE.Group();
const ah=new THREE.Mesh(new THREE.CylinderGeometry(.032,.042,.9,8),
  new THREE.MeshLambertMaterial({color:0x9c7d52}));ah.position.y=-.44;axe.add(ah);
axe.add(new THREE.Mesh(new THREE.BoxGeometry(.09,.22,.3),
  new THREE.MeshLambertMaterial({color:0xb3b8ba})));
axe.visible=false; scene.add(axe);
let axeT=-1,axeSide=-1;
const chips=[];
function spawnChips(side){
  const R=T.D/2;
  for(let i=0;i<8;i++){
    const c=new THREE.Mesh(new THREE.BoxGeometry(.055,.028,.085),
      new THREE.MeshLambertMaterial({color:0xe6d7b2}));
    c.position.set(rnd(-R/2,R/2),CUT_Y+rnd(0,.2),side*R*1.05);
    c.userData={v:new THREE.Vector3(rnd(-1.8,1.8),rnd(2,4.4),side*rnd(1,3)),life:1};
    scene.add(c);chips.push(c)}
}

/* ══════════ 回転盤 ══════════ */
(function(){let s='';
  for(let i=0;i<24;i++){const a=i*Math.PI/12,L=(i%6===0)?9:5;
    s+=`<line x1="${85+Math.sin(a)*70}" y1="${85-Math.cos(a)*70}" x2="${85+Math.sin(a)*(70-L)}" y2="${85-Math.cos(a)*(70-L)}" stroke="rgba(233,227,213,${i%6===0?.34:.13})" stroke-width="1"/>`}
  $('dticks').innerHTML=s})();

let last=performance.now();
function loop(now){
  const dt=Math.min((now-last)/1000,.05); last=now;
  if(gCool>0)gCool-=dt;
  if(gRun){
    gT+=gDir*gSpd*dt; if(gT>1){gT=1;gDir=-1} if(gT<0){gT=0;gDir=1}
    if(gVert){
      $('vg-needle').style.bottom=(gT*100)+'%';
      const h=curHeight();
      $('vg-val').innerHTML=(h>0?'+':'')+h.toFixed(1)+'<u>cm</u>';
      $('vg-val').className=(h>=2&&h<=5)?'ok':(h>=0&&h<=7)?'mid':'ng';
      moveBackArrow(h);
    } else $('needle').style.left=(gT*100)+'%';
  }
  mainShadow.visible=pivot.visible;
  if(SCREEN==='forest'&&ringSel.visible)ringSel.rotation.z+=dt*.5;
  if(axeT>=0&&T){
    axeT+=dt*3.4; const R=T.D/2,sw=Math.sin(Math.min(axeT,1)*Math.PI);
    axe.position.set(0,CUT_Y+.85-sw*.7,axeSide*R*1.7);
    axe.rotation.set(axeSide*sw*1.5,axeSide<0?0:Math.PI,.3);
    if(axeT>1.05){axeT=-1;axe.visible=false}}
  for(let i=chips.length-1;i>=0;i--){const c=chips[i];
    c.userData.v.y-=11*dt;c.position.addScaledVector(c.userData.v,dt);
    c.rotation.x+=dt*7;c.rotation.z+=dt*5;c.userData.life-=dt*.85;
    if(c.userData.life<=0||c.position.y<0){scene.remove(c);chips.splice(i,1)}}
  if(SCREEN==='play'&&S&&S.felling&&S.fellAngle<Math.PI/2){
    const {I}=Phys.section(),m=Phys.mass(),It=(1/3)*m*T.H*T.H;
    const tau=m*GRAV*(T.H*.42)*Math.sin(S.fellAngle+rad(S.leanDeg))+50;
    const res=(S.fellAngle<.45&&!S.barber)?I*T.MOR*.55/T.H:0;
    S.fellVel+=Math.max((tau-res)/It,.03)*dt*1.6;
    S.fellAngle=Math.min(S.fellAngle+S.fellVel*dt*4.4,Math.PI/2);
    applyPose()}
  orb.r+=(want.r-orb.r)*Math.min(dt*3,1);
  orb.tgt.y+=(want.ty-orb.tgt.y)*Math.min(dt*3,1);
  applyCam(); rend.render(scene,cam);
  requestAnimationFrame(loop);
}

addEventListener('keydown',e=>{
  if(SCREEN!=='play'||!S)return;
  if(e.code==='Space'){e.preventDefault();swing()}
  if(S.phase===0){
    if(e.code==='ArrowLeft'){S.spin-=rad(2);refresh();buildActs()}
    if(e.code==='ArrowRight'){S.spin+=rad(2);refresh();buildActs()}
    if(e.code==='Enter')goto(1)}
});
addEventListener('resize',()=>{
  cam.aspect=innerWidth/innerHeight; cam.updateProjectionMatrix();
  rend.setSize(innerWidth,innerHeight);
  if(SCREEN==='forest')fitStand()});
$('list-close').onclick=()=>$('listov').classList.add('hide');
$('map-end').onclick=()=>toEvening();
$('map-go').onclick=()=>{
  const f=FORESTS[mapChoice];
  if(f?.unlocked&&WORLD.stamina>=travelPay(f))travel(mapChoice);
};

/* 起動 */
ensureDailyStands();
const firstRun=!readRecord('auto');
if(firstRun)saveGame('auto');
$('tut-skip').onclick=finishTutorial;
/* 初回だけ冒頭の物語を出す。toMap より先に立ち上げて、朝の手ほどきに繋げる */
if(firstRun&&!tutorialDone())showOpening();
toMap(); applyCam();
requestAnimationFrame(loop);
