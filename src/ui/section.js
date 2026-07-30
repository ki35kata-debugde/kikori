const SEC={X0:46,W:178,TOP:22,BOT:170,YF:126};
const C_OK='#7fa85c',C_MID='#d4a94e',C_NG='#c04a32',C_N='#8b8f88',
      C_W='#e9e3d5',C_CUT='#e0cfa6',C_FAINT='rgba(233,227,213,.20)';
const MINCHO="'Shippori Mincho',serif";
// 先端(x,y)が向き(dx,dy)を指す三角
function arrowHead(x,y,dx,dy,sz,col){
  const nx=-dy*sz*.45, ny=dx*sz*.45;
  return `<polygon points="${x},${y} ${x-dx*sz+nx},${y-dy*sz+ny} ${x-dx*sz-nx},${y-dy*sz-ny}" fill="${col}"/>`;
}
// 追い口の矢印だけは縦ゲージと連動して毎フレーム動かす
function moveBackArrow(h){
  const g=$('sb-arrow'); if(!g||!T)return;
  const {X0,W,TOP,BOT,YF}=SEC;
  const cmPx=W*.01/T.D;
  const y=clamp(YF-h*cmPx,TOP+5,BOT-5);
  const col=(h>=2&&h<=5)?C_OK:(h>=0&&h<=7)?C_MID:C_NG;
  const xe=X0+W;
  g.innerHTML=
    `<line x1="${X0}" y1="${y}" x2="${xe}" y2="${y}" stroke="${col}" stroke-width="1" stroke-dasharray="3 4" opacity=".45"/>`+
    `<line x1="${xe+38}" y1="${y}" x2="${xe+9}" y2="${y}" stroke="${col}" stroke-width="2.6"/>`+
    arrowHead(xe+1,y,-1,0,9,col);
}

function drawSection(){
  const {X0,W,TOP,BOT,YF}=SEC;
  const px=v=>X0+W*v;
  const cmPx=W*.01/T.D;
  const a=rad(clamp(S.nAngle,30,80)), tanA=Math.tan(a);
  const capY=YF-TOP-12;
  const hyOf=d=>Math.min(W*d*tanA,capY);

  const dN=notchDepth(), dMax=Math.max(S.nDiag,S.nHoriz);
  const nPct=dN*100, nCm=dN*T.D*100;
  const bDep=W*S.backDepth, bX=px(1-S.backDepth), bY=YF-S.backH*cmPx;
  const hL=px(dN), hR=bX, hPct=hingeRatio()*100;
  const hCol=(hPct>=8&&hPct<=12)?C_OK:(hPct>=6&&hPct<=16)?C_MID:C_NG;
  const nCol=(nPct>=22&&nPct<=35)?C_OK:(nPct>=17&&nPct<=42)?C_MID:C_NG;
  const bhCol=(S.backH>=2&&S.backH<=5)?C_OK:S.backH>=0?C_MID:C_NG;
  const angOK=S.nAngle>=45&&S.nAngle<=70;

  // 数値は常に白の太字。良し悪しは目標帯と▼の色で示す
  const dim=(x1,x2,y,txt,sub,subCol)=>{
    let o='';
    if(x2-x1>=3)
      o+=`<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${C_N}" stroke-width="1"/>`
        +`<line x1="${x1}" y1="${y-4}" x2="${x1}" y2="${y+4}" stroke="${C_N}" stroke-width="1"/>`
        +`<line x1="${x2}" y1="${y-4}" x2="${x2}" y2="${y+4}" stroke="${C_N}" stroke-width="1"/>`;
    o+=`<text x="${(x1+x2)/2}" y="${y-8}" fill="${C_W}" font-size="12.5" font-weight="800" text-anchor="middle" font-family="${MINCHO}">${txt}</text>`;
    if(sub)o+=`<text x="${(x1+x2)/2}" y="${y+13}" fill="${subCol||C_N}" font-size="9" text-anchor="middle">${sub}</text>`;
    return o;
  };

  let s='';
  s+=`<text x="${X0}" y="12" fill="${C_N}" font-size="9">直径 ${Math.round(T.D*100)}cm</text>`;
  // 幹
  s+=`<rect x="${X0}" y="${TOP}" width="${W}" height="${BOT-TOP}" fill="#4a3b28" stroke="rgba(233,227,213,.22)" stroke-width="1"/>`;
  s+=`<ellipse cx="${X0+W/2}" cy="${TOP}" rx="${W/2}" ry="10" fill="#5b4a33" stroke="rgba(233,227,213,.22)" stroke-width="1"/>`;
  s+=`<line x1="${X0}" y1="${YF}" x2="${X0+W}" y2="${YF}" stroke="rgba(233,227,213,.10)" stroke-width="1" stroke-dasharray="2 4"/>`;

  // ── ② 木片が抜けるのは「両方が到達した深さ」まで ──
  if(dN>0.004)
    s+=`<polygon points="${X0},${YF-hyOf(dN)} ${px(dN)},${YF} ${X0},${YF}" fill="${C_CUT}"/>`;
  const dEntryY=YF-hyOf(S.nDiag);
  const diagY=t=>dEntryY+(YF-dEntryY)*(t/Math.max(S.nDiag,1e-6));
  if(S.nDiag>0.004)
    s+=`<line x1="${X0}" y1="${dEntryY}" x2="${px(S.nDiag)}" y2="${YF}" stroke="${C_CUT}" stroke-width="2"/>`;
  if(S.nHoriz>0.004)
    s+=`<line x1="${X0}" y1="${YF}" x2="${px(S.nHoriz)}" y2="${YF}" stroke="${C_CUT}" stroke-width="2.5"/>`;
  // 先行している面の「はみ出し」を強調 → ④の食い違いが図で読める
  if(dMax-dN>0.012){
    if(S.nHoriz>S.nDiag)
      s+=`<line x1="${px(dN)}" y1="${YF}" x2="${px(S.nHoriz)}" y2="${YF}" stroke="${C_MID}" stroke-width="4"/>`;
    else
      s+=`<line x1="${px(dN)}" y1="${diagY(dN)}" x2="${px(S.nDiag)}" y2="${YF}" stroke="${C_MID}" stroke-width="4"/>`;
  }
  if(S.phase>=1)
    s+=`<text x="${X0+5}" y="${YF-hyOf(Math.max(S.nDiag,.24))-6}" fill="${angOK?C_OK:C_NG}" font-size="10" font-family="${MINCHO}">${S.nAngle}°</text>`;

  // ── 追い口 ──
  if(S.backDepth>0){
    s+=`<rect x="${bX}" y="${bY-2}" width="${bDep}" height="4" fill="${C_CUT}"/>`;
    s+=`<line x1="${X0+W-9}" y1="${YF}" x2="${X0+W-9}" y2="${bY}" stroke="${bhCol}" stroke-width="1.5"/>`;
  }
  // ツルをどこで止めるか
  if(S.phase===2){
    const stopX=px(clamp(dN+0.10,0,1));
    s+=`<line x1="${stopX}" y1="${TOP+6}" x2="${stopX}" y2="${BOT-6}" stroke="${C_OK}" stroke-width="1.5" stroke-dasharray="4 3" opacity=".8"/>`;
    s+=`<text x="${stopX-4}" y="${TOP+20}" fill="${C_OK}" font-size="9" text-anchor="end">ここで止める</text>`;
  }

  // ── ① 斧が入る向き ──
  if(S.phase===1){
    const act=S.face==='diag';
    const ey=YF-hyOf(Math.max(S.nDiag,.24));
    const c1=act?C_MID:C_FAINT, c2=act?C_FAINT:C_MID;
    s+=`<line x1="${X0-30*Math.cos(a)}" y1="${ey-30*Math.sin(a)}" x2="${X0-7*Math.cos(a)}" y2="${ey-7*Math.sin(a)}" stroke="${c1}" stroke-width="${act?2.6:1.4}"/>`;
    s+=arrowHead(X0-1,ey,Math.cos(a),Math.sin(a),act?10:6,c1);
    s+=`<line x1="${X0-30}" y1="${YF}" x2="${X0-8}" y2="${YF}" stroke="${c2}" stroke-width="${act?1.4:2.6}"/>`;
    s+=arrowHead(X0-1,YF,1,0,act?6:10,c2);
  }
  if(S.phase===2) s+=`<g id="sb-arrow"></g>`;

  // ── ツルの寸法（床の下） ──
  if(S.phase>=2&&hR>hL+3){
    s+=`<line x1="${hL}" y1="${YF}" x2="${hL}" y2="150" stroke="${hCol}" stroke-width="1" stroke-dasharray="3 3" opacity=".5"/>`;
    s+=`<line x1="${hR}" y1="${bY}" x2="${hR}" y2="150" stroke="${hCol}" stroke-width="1" stroke-dasharray="3 3" opacity=".5"/>`;
    s+=dim(hL,hR,150,`ツル ${hPct.toFixed(0)}%`,'目標 8〜12%',hCol);
  }

  // ── ③ 受け口の寸法＋目標帯 ──
  s+=dim(X0,px(dN),188,`受け口 ${nPct.toFixed(0)}%　${nCm.toFixed(0)}cm`);
  const axY=201;
  s+=`<line x1="${X0}" y1="${axY}" x2="${X0+W}" y2="${axY}" stroke="rgba(233,227,213,.12)" stroke-width="1"/>`;
  s+=`<rect x="${px(.22)}" y="${axY-3}" width="${W*.13}" height="6" fill="rgba(127,168,92,.45)"/>`;
  s+=arrowHead(px(dN),axY-5,0,1,7,nCol);
  s+=`<text x="${px(.285)}" y="${axY+15}" fill="${C_N}" font-size="9" text-anchor="middle">目標 22〜35%</text>`;
  if(S.backDepth>0)
    s+=dim(bX,X0+W,188,`追い口 ${(S.backDepth*100).toFixed(0)}%`,
           `高さ ${S.backH>0?'+':''}${S.backH.toFixed(1)}cm`,bhCol);

  $('sect').innerHTML=s;
  if(S.phase===2&&gVert) moveBackArrow(curHeight());
}

/* ══════════ ゲージ ══════════ */
// 横（受け口・威力）

