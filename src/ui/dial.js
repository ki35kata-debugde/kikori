function drawDial(){
  const P=(a,r)=>[85+Math.sin(a)*r,85-Math.cos(a)*r];
  const tz=Phys.targetAz(),ln=S.lean0+S.spin,wd=S.wind0+S.spin,dr=Phys.drift();
  const [tx,ty]=P(tz,63),[tx2,ty2]=P(tz,52),[lx,ly]=P(ln,44);
  const [wx,wy]=P(wd,34),[wx2,wy2]=P(wd,58);
  $('ring').innerHTML=
    `<line x1="${tx2}" y1="${ty2}" x2="${tx}" y2="${ty}" stroke="#7fa85c" stroke-width="3"/>`+
    `<circle cx="${tx}" cy="${ty}" r="4.6" fill="#7fa85c"/>`+
    `<line x1="85" y1="85" x2="${lx}" y2="${ly}" stroke="#8b8f88" stroke-width="1.6"/>`+
    `<circle cx="${lx}" cy="${ly}" r="2.7" fill="#8b8f88"/>`+
    `<line x1="${wx2}" y1="${wy2}" x2="${wx}" y2="${wy}" stroke="#6f97b5" stroke-width="1.6" stroke-dasharray="3 3"/>`+
    `<circle cx="${wx}" cy="${wy}" r="2.7" fill="#6f97b5"/>`;
  const [px,py]=P(dr,56),[hx,hy]=P(dr,66);
  const [a1x,a1y]=P(dr+.06,55),[a2x,a2y]=P(dr-.06,55);
  $('pred').setAttribute('d',`M85 85 L${px} ${py}`);
  $('predhead').setAttribute('points',`${hx},${hy} ${a1x},${a1y} ${a2x},${a2y}`);
  const e=Phys.predErr();
  $('e-err').textContent=e.toFixed(1)+'°';
  $('e-err').className='mn '+(e<3?'ok':e<8?'mid':e<16?'':'ng');
}

/* ══════════ 断面図 ══════════ */

