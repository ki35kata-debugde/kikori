let AUDIO_ON=true;
let audioCtx=null;
let bgmScene='title',bgmTimer=null,bgmStep=0,bgmToken=0,bgmMaster=null;

function ensureAudio(){
  if(!AUDIO_ON)return null;
  if(!audioCtx)audioCtx=new (window.AudioContext||window.webkitAudioContext)();
  if(audioCtx.state==='suspended')audioCtx.resume();
  if(!bgmTimer)startBgm(audioCtx);
  return audioCtx;
}
function tone(freq,dur=.08,type='sine',gain=.035,delay=0){
  const ac=ensureAudio();if(!ac)return;
  const o=ac.createOscillator(),g=ac.createGain(),t=ac.currentTime+delay;
  o.type=type;o.frequency.setValueAtTime(freq,t);
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(gain,t+.01);
  g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  o.connect(g).connect(ac.destination);o.start(t);o.stop(t+dur+.02);
}
function soundClick(){tone(520,.045,'sine',.018)}
function soundBuy(){tone(440,.08,'sine',.025);tone(660,.12,'sine',.022,.07)}
function soundChop(){tone(115,.07,'square',.045);tone(72,.1,'triangle',.03,.025)}
function soundWedge(){tone(820,.045,'triangle',.03);tone(1040,.06,'triangle',.022,.05)}
function soundFall(){
  const ac=ensureAudio();if(!ac)return;
  const n=ac.createBufferSource(),buf=ac.createBuffer(1,ac.sampleRate*.65,ac.sampleRate);
  const d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length);
  const f=ac.createBiquadFilter(),g=ac.createGain();f.type='lowpass';f.frequency.value=180;
  g.gain.value=.08;n.buffer=buf;n.connect(f).connect(g).connect(ac.destination);n.start();
}
function soundSuccess(){[523,659,784].forEach((f,i)=>tone(f,.2,'sine',.025,i*.09))}
function soundBird(){tone(1450,.07,'sine',.018);tone(1840,.09,'sine',.015,.09)}
function soundNight(){tone(196,.16,'triangle',.018);tone(294,.22,'sine',.014,.12)}

/* ══════════ 控えめな和風BGM ══════════
   外部音源を使わず、五音音階の短いフレーズをWeb Audioで重ねる。
   朝と林には鳥、夜にはフクロウをときどき混ぜる。 */
const BGM={
  title:  {notes:[293.66,329.63,392.00,440.00,493.88],root:146.83,pace:1.02,gain:.010},
  morning:{notes:[293.66,329.63,392.00,440.00,493.88],root:146.83,pace:.94,gain:.011,bird:true},
  forest: {notes:[220.00,293.66,329.63,392.00,440.00],root:110.00,pace:1.12,gain:.009,bird:true},
  evening:{notes:[220.00,261.63,293.66,329.63,392.00],root:110.00,pace:1.18,gain:.009},
  night:  {notes:[196.00,220.00,261.63,293.66,329.63],root:98.00, pace:1.32,gain:.008,owl:true},
  festival:{notes:[293.66,392.00,440.00,493.88,587.33],root:146.83,pace:.62,gain:.014,festival:true}
};
function bgmNote(ac,freq,at,dur,gain,type='sine'){
  if(!bgmMaster)return;
  const o=ac.createOscillator(),g=ac.createGain(),f=ac.createBiquadFilter();
  o.type=type;o.frequency.setValueAtTime(freq,at);
  f.type='lowpass';f.frequency.value=type==='triangle'?1800:1200;
  g.gain.setValueAtTime(.0001,at);
  g.gain.exponentialRampToValueAtTime(gain,at+.08);
  g.gain.exponentialRampToValueAtTime(.0001,at+dur);
  o.connect(f).connect(g).connect(bgmMaster);o.start(at);o.stop(at+dur+.05);
}
function bgmBird(ac,at){
  bgmNote(ac,1450,at,.12,.006,'sine');
  bgmNote(ac,1810,at+.13,.11,.005,'sine');
  bgmNote(ac,1580,at+.32,.10,.004,'sine');
}
function bgmOwl(ac,at){
  bgmNote(ac,392,at,.42,.006,'sine');
  bgmNote(ac,330,at+.48,.58,.006,'sine');
}
function scheduleBgm(token){
  if(token!==bgmToken||!AUDIO_ON||!audioCtx)return;
  const cfg=BGM[bgmScene]||BGM.morning,ac=audioCtx,t=ac.currentTime+.08;
  const patterns=[[0,2,3,1],[0,1,3,4],[2,1,0,3],[0,3,2,4]];
  const pat=patterns[bgmStep%patterns.length];
  bgmNote(ac,cfg.root,t,cfg.pace*3.7,cfg.gain*.42,'sine');
  pat.forEach((n,i)=>bgmNote(ac,cfg.notes[n],t+i*cfg.pace,cfg.pace*.78,cfg.gain,
    cfg.festival?'triangle':'sine'));
  if(cfg.festival){
    [0,1,2,3,4,5].forEach(i=>bgmNote(ac,i%2?196:146.83,t+i*cfg.pace*.5,.12,.004,'triangle'));
  }else if(cfg.bird&&bgmStep%3===1)bgmBird(ac,t+cfg.pace*2.15);
  else if(cfg.owl&&bgmStep%3===2)bgmOwl(ac,t+cfg.pace*1.8);
  bgmStep++;
  bgmTimer=setTimeout(()=>scheduleBgm(token),cfg.pace*4000);
}
function startBgm(ac=audioCtx){
  if(!AUDIO_ON||!ac||bgmTimer)return;
  bgmMaster=ac.createGain();bgmMaster.gain.value=.72;bgmMaster.connect(ac.destination);
  const token=++bgmToken;scheduleBgm(token);
}
function stopBgm(){
  bgmToken++;if(bgmTimer)clearTimeout(bgmTimer);bgmTimer=null;
  if(bgmMaster&&audioCtx){
    bgmMaster.gain.cancelScheduledValues(audioCtx.currentTime);
    bgmMaster.gain.setTargetAtTime(.0001,audioCtx.currentTime,.08);
  }
  bgmMaster=null;
}
function setBgmScene(scene){
  if(!BGM[scene]||scene===bgmScene)return;
  bgmScene=scene;bgmStep=0;stopBgm();
  if(AUDIO_ON&&audioCtx)startBgm(audioCtx);
}
function toggleAudio(){
  AUDIO_ON=!AUDIO_ON;
  const b=document.getElementById('sound-toggle');
  if(b){b.textContent=AUDIO_ON?'音 あり':'音 なし';b.classList.toggle('off',!AUDIO_ON)}
  if(AUDIO_ON){ensureAudio();soundClick()}else stopBgm();
}
addEventListener('pointerdown',ensureAudio,{once:true});
addEventListener('click',e=>{
  if(e.target.closest('button')&&!e.target.closest('#sound-toggle'))soundClick();
});
