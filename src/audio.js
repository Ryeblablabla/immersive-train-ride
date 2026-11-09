import { clamp } from './journey.js';
export class RailAudio {
  constructor() { this.context=null; this.volume=0.65; this.lastJoint=-1; this.lastBird=0; this.voices=[]; this.announcements=true; }
  async start() {
    if(this.context) { await this.context.resume(); return; }
    const c=this.context=new (window.AudioContext||window.webkitAudioContext)();
    this.master=c.createGain();this.master.gain.value=this.volume;this.master.connect(c.destination);
    this.analyser=c.createAnalyser();this.analyser.fftSize=512;this.master.connect(this.analyser);
    this.compressor=c.createDynamicsCompressor();this.compressor.threshold.value=-15;this.compressor.ratio.value=3;this.compressor.connect(this.master);
    const buffer=c.createBuffer(2,c.sampleRate*4,c.sampleRate);
    for(let ch=0;ch<2;ch++){const b=buffer.getChannelData(ch);let brown=0;for(let i=0;i<b.length;i++){brown=(brown+Math.random()*0.04-0.02)/1.02;b[i]=brown*4;}}
    const layer=(freq,q,gain)=>{const src=c.createBufferSource();src.buffer=buffer;src.loop=true;const f=c.createBiquadFilter();f.type='bandpass';f.frequency.value=freq;f.Q.value=q;const g=c.createGain();g.gain.value=gain;const pan=c.createStereoPanner();src.connect(f);f.connect(g);g.connect(pan);pan.connect(this.compressor);src.start();return {src,f,g,pan};};
    this.rumble=layer(140,0.65,0);this.wind=layer(1600,0.5,0);this.cabin=layer(440,0.7,0.05);this.rain=layer(2800,0.5,0);
    this.hum=c.createOscillator();this.hum.type='sine';this.hum.frequency.value=48;this.humGain=c.createGain();this.humGain.gain.value=0.006;this.hum.connect(this.humGain);this.humGain.connect(this.compressor);this.hum.start();
    this.tunnelFilter=c.createBiquadFilter();this.tunnelFilter.type='lowpass';this.tunnelFilter.frequency.value=700;
    const delay=c.createDelay(0.5);delay.delayTime.value=0.13;this.tunnelGain=c.createGain();this.tunnelGain.gain.value=0;this.rumble.g.connect(this.tunnelFilter);this.tunnelFilter.connect(delay);delay.connect(this.tunnelGain);this.tunnelGain.connect(this.compressor);
    this.noise=buffer;
    await c.resume();
  }
  setVolume(v){this.volume=v;if(this.master)this.master.gain.setTargetAtTime(v,this.context.currentTime,0.1);}
  clack(at=0,gain=0.1,pan=0){
    const c=this.context;if(!c)return;const t=c.currentTime+at;const src=c.createBufferSource();src.buffer=this.noise;
    const filter=c.createBiquadFilter();filter.type='bandpass';filter.frequency.value=600+Math.random()*400;filter.Q.value=0.7;
    const g=c.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(gain,t+0.003);g.gain.exponentialRampToValueAtTime(0.0001,t+0.13);
    const p=c.createStereoPanner();p.pan.value=pan;src.connect(filter);filter.connect(g);g.connect(p);p.connect(this.compressor);src.start(t,Math.random()*2,0.16);
  }
  bell(){const c=this.context;if(!c)return;[660,880,740].forEach((f,i)=>{const o=c.createOscillator();const g=c.createGain();o.frequency.value=f;g.gain.setValueAtTime(0,c.currentTime+i*0.22);g.gain.linearRampToValueAtTime(0.032,c.currentTime+i*0.22+0.01);g.gain.exponentialRampToValueAtTime(0.0001,c.currentTime+i*0.22+0.8);o.connect(g);g.connect(this.compressor);o.start(c.currentTime+i*0.22);o.stop(c.currentTime+i*0.22+0.85);});}
  step(inside){this.clack(0,inside?0.035:0.022,0);}
  announce(text){this.bell();if(!this.announcements||!window.speechSynthesis)return;const voice=speechSynthesis.getVoices().find(v=>/^zh/.test(v.lang));if(!voice)return;const u=new SpeechSynthesisUtterance(text);u.voice=voice;u.lang='zh-CN';u.rate=0.87;u.volume=this.volume*0.58;setTimeout(()=>speechSynthesis.speak(u),650);}
  update(journey,{windowOpen=false,rain=false,inside=true,paused=false,yaw=0,positionZ=0,windowSide=1}={}){
    if(!this.context)return;const c=this.context;const t=c.currentTime;const v=paused?0:journey.speed;const f=clamp(v/18.4,0,1);const env=journey.environment;
    const target=(node,value)=>node.setTargetAtTime(value,t,0.16);
    const vestibule=clamp((Math.abs(positionZ)-7)/4,0,1);
    target(this.rumble.g.gain,(0.12+env.bridge*0.08+env.tunnel*0.14)*f*(inside?1+vestibule*.65:0.7));target(this.rumble.f.frequency,80+v*11+vestibule*90);
    target(this.wind.g.gain,f*(windowOpen?0.19:0.022)*(inside?1:1.8));target(this.wind.f.frequency,windowOpen?1700:550);
    target(this.cabin.g.gain,paused?0.008:inside?0.035:0.018);target(this.rain.g.gain,rain?(windowOpen?0.13:0.055):0);target(this.tunnelGain.gain,env.tunnel*0.58);
    target(this.hum.frequency,45+v*1.6);target(this.humGain.gain,0.003+f*0.012);
    target(this.wind.pan.pan,Math.cos(yaw)*windowSide*.65);target(this.cabin.pan.pan,Math.sin(yaw)*.18);
    const joint=Math.floor(journey.distance/25);
    if(joint!==this.lastJoint&&v>0.8&&!paused){this.lastJoint=joint;const gain=(0.11+f*0.09)*(1+env.bridge*0.6);this.clack(0,gain,-0.25);this.clack(Math.min(0.16,1.8/v),gain*0.7,0.25);}
  }
  level(){if(!this.analyser)return 0;const a=new Float32Array(this.analyser.fftSize);this.analyser.getFloatTimeDomainData(a);return Math.sqrt(a.reduce((s,v)=>s+v*v,0)/a.length);}
}
