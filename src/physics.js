const Phys={
  mass(){return Math.PI*(T.D/2)**2*T.H*0.42*T.rho},
  section(){const R=T.D/2,hw=hingeRatio()*T.D;
    const ch=2*Math.sqrt(Math.max(R*R-(R-hw/2)**2,1e-6));
    return {I:ch*hw**3/12,c:hw/2,hw}},
  drift(){
    const wedgeCut=[1.0,0.6,0.4][S.wedges||0];
    const L=Math.sin(S.lean0+S.spin)*rad(S.leanDeg)*3.1*wedgeCut;
    const W=Math.sin(S.wind0+S.spin)*S.windSpd*0.0085;
    const K=S.skew*0.30;
    const A=(S.nAngle<45&&notchDepth()>0)?Math.sign(L||1)*(45-S.nAngle)*0.006:0;
    return clamp(L+W+K+A,-0.9,0.9)},
  targetAz(){return S.target0+S.spin},
  predErr(){return Math.abs(deg(this.drift()-this.targetAz()))},
  stressRatio(){const {I,c}=this.section(); if(I<=0)return 99;
    const m=this.mass();
    const M=m*GRAV*(T.H*0.42)*Math.tan(rad(S.leanDeg))*Math.abs(Math.cos(S.lean0+S.spin))+900;
    return (M*c/I)/T.MOR},
  barberRisk(){return notchDepth()>=0.18?0:clamp((S.backDepth-0.28)/0.22,0,1)}
};

/* ══════════ 評価 ══════════ */

