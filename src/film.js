// A camera tour of the live game. Capture stays independent of the renderer's
// live targets; audio comes from the same master mix heard during play.
const shots=[
 {name:'榆川站',seconds:10,distance:0,speed:0,phase:'platform',inside:false,from:[-5.7,1.66,13.5],to:[-3.7,1.66,10.5],target:[-1.3,1.32,6.6]},
 {name:'登车',seconds:5,distance:0,speed:0,phase:'platform',from:[-2.85,1.66,10.5],to:[-.12,1.66,10.5],target:[0,1.5,5]},
 {name:'经过车厢',seconds:10,distance:300,from:[0,1.66,8.9],to:[0,1.62,4.5],target:[0,1.4,-9]},
 {name:'旅人晚报',seconds:8,distance:850,from:[.12,1.4,4.22],to:[.20,1.35,4.10],target:[1.03,1.04,2.84]},
 {name:'一杯热茶',seconds:10,distance:1500,from:[.59,1.28,.65],to:[.76,1.2,.54],target:[1.23,1.0,-.07]},
 {name:'河谷草甸',seconds:14,distance:1580,from:[1.06,1.26,.96],to:[1.20,1.31,.96],target:[160,8,-27]},
 {name:'旧江大桥',seconds:14,distance:2052,from:[1.12,1.28,.96],to:[1.24,1.32,.96],target:[200,4,-15],open:true},
 {name:'杉林峡谷',seconds:12,distance:3580,from:[1.10,1.29,.96],to:[1.23,1.34,.96],target:[140,20,-50],open:true},
 {name:'穿过青山',seconds:10,distance:4225,from:[0,1.5,2.1],to:[0,1.47,.75],target:[0,1.3,-10]},
 {name:'雨落在车窗',seconds:14,distance:5250,rain:true,from:[1.02,1.26,.96],to:[1.16,1.31,.96],target:[200,8,-20]},
 {name:'白鹭湖',seconds:22,distance:6200,open:true,from:[1.17,1.37,.96],to:[1.30,1.40,.96],target:[220,14,-25]},
 {name:'窗边旅人',seconds:8,distance:6910,from:[-.10,1.40,-7.9],to:[-.16,1.34,-7.86],target:[-1.03,1.12,-6.57]},
 {name:'白鹭湾到了',seconds:9,distance:7800,speed:0,phase:'arrived',from:[0,1.66,8.4],to:[-.12,1.66,10.5],target:[-3,1.28,10.5]},
 {name:'再停留一会儿',seconds:9,distance:7800,speed:0,phase:'arrived',inside:false,from:[-3.6,1.66,10.45],to:[-5.8,1.66,14.2],target:[-.3,1.35,3.5]},
];
export function createFilm({renderer,audio,begin,ready,onEnter,onPose,onStop}){
 const panel=document.createElement('div');panel.id='film-tools';panel.innerHTML='<button id="film-start">录制《沉浸式坐车》 · 2分35秒</button><button id="film-test">录制10秒测试</button><button id="film-stop" hidden>停止并保存</button><output id="film-status">实时游戏画面 + 现场声音 · 1920×1080 / 30fps</output>';
 document.body.append(panel);
 const output=panel.querySelector('output'),start=panel.querySelector('#film-start'),test=panel.querySelector('#film-test'),stop=panel.querySelector('#film-stop');
 const canvas=document.createElement('canvas');canvas.width=1920;canvas.height=1080;const ctx=canvas.getContext('2d',{alpha:false});
 let recorder,stream,audioDestination,chunks=[],elapsed=0,index=-1,limit=Infinity,active=false;
 const total=shots.reduce((sum,s)=>sum+s.seconds,0);
 const supported=['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'].find(t=>MediaRecorder.isTypeSupported(t));
 async function record(testOnly=false){
  if(active||!ready())return;
  try{
   start.disabled=test.disabled=true;begin(false);await audio.start();audio.setVolume(audio.volume);
   audioDestination=audio.context.createMediaStreamDestination();audio.master.connect(audioDestination);
   stream=canvas.captureStream(30);for(const track of audioDestination.stream.getAudioTracks())stream.addTrack(track);
   recorder=new MediaRecorder(stream,{mimeType:supported,videoBitsPerSecond:16000000,audioBitsPerSecond:192000});chunks=[];elapsed=0;index=-1;limit=testOnly?10:total;
   recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
   recorder.onstop=()=>{
    const blob=new Blob(chunks,{type:recorder.mimeType}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=testOnly?'沉浸式坐车-test.webm':'沉浸式坐车.webm';a.textContent='重新下载录像';a.id='film-download';a.style.marginLeft='12px';panel.querySelector('#film-download')?.remove();panel.append(a);a.click();
    output.textContent=`录像已保存 · ${elapsed.toFixed(1)} 秒 · ${(blob.size/1048576).toFixed(1)} MB`;stream.getTracks().forEach(t=>t.stop());audio.master.disconnect(audioDestination);chunks=[];start.disabled=test.disabled=false;stop.hidden=true;panel.classList.remove('recording');onStop();
   };
   active=true;stop.hidden=false;panel.classList.add('recording');document.body.classList.add('filming');recorder.start(1000);
  }catch(error){active=false;start.disabled=test.disabled=false;output.textContent='录制失败：'+error.message;document.body.classList.remove('filming');}
 }
 function finish(){if(!active)return;active=false;document.body.classList.remove('filming');recorder.stop();}
 start.onclick=()=>record();test.onclick=()=>record(true);stop.onclick=finish;
 return {get active(){return active;},update(dt){
  if(!active)return;elapsed+=Math.max(0,dt);if(elapsed>=limit){finish();return;}
  let offset=0,next=0;for(let i=0;i<shots.length;i++){if(elapsed<offset+shots[i].seconds){next=i;break;}offset+=shots[i].seconds;}
  const shot=shots[next];if(next!==index){index=next;onEnter(shot);}
  const t=Math.min(1,(elapsed-offset)/shot.seconds),ease=t*t*(3-2*t);onPose(shot.from.map((v,i)=>v+(shot.to[i]-v)*ease),shot.target);
  output.textContent=`录制中 ${Math.floor(elapsed)} / ${limit} 秒 · ${shot.name}`;panel.dataset.elapsed=elapsed.toFixed(2);
 },capture(){
  if(!active)return;const source=renderer.domElement,sw=source.width,sh=source.height,ratio=16/9;let cw=sw,ch=sh;if(sw/sh>ratio)cw=sh*ratio;else ch=sw/ratio;
  ctx.drawImage(source,(sw-cw)/2,(sh-ch)/2,cw,ch,0,0,1920,1080);
  let offset=0;for(let i=0;i<index;i++)offset+=shots[i].seconds;const local=elapsed-offset,left=shots[index].seconds-local;
  const fade=Math.min(1,local/.55,left/.55);if(fade<1){ctx.fillStyle=`rgba(8,14,13,${1-fade})`;ctx.fillRect(0,0,1920,1080);}
  ctx.save();ctx.font='12px system-ui';ctx.textAlign='right';ctx.fillStyle='#ffffffb3';ctx.shadowColor='#000';ctx.shadowBlur=4;ctx.fillText('Terrain imagery © swisstopo · Elevation Mapzen / AWS',1896,1060);ctx.restore();
 }};
}
