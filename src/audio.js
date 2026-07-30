let AUDIO_ON=true;
let audioCtx=null;

function ensureAudio(){
  if(!AUDIO_ON)return null;
  if(!audioCtx)audioCtx=new (window.AudioContext||window.webkitAudioContext)();
  if(audioCtx.state==='suspended')audioCtx.resume();
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
function toggleAudio(){
  AUDIO_ON=!AUDIO_ON;
  const b=document.getElementById('sound-toggle');
  if(b){b.textContent=AUDIO_ON?'音 あり':'音 なし';b.classList.toggle('off',!AUDIO_ON)}
  if(AUDIO_ON){ensureAudio();soundClick()}
}
addEventListener('pointerdown',ensureAudio,{once:true});
addEventListener('click',e=>{
  if(e.target.closest('button')&&!e.target.closest('#sound-toggle'))soundClick();
});
