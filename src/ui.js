const trainIcon=`<svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><rect x="7" y="3" width="18" height="22" rx="6" stroke="currentColor"/><path d="M8 15h16M16 4v11M11 30l3-5m7 5l-3-5M7 29h18" stroke="currentColor"/><circle cx="12" cy="20" r="1.5" fill="currentColor"/><circle cx="20" cy="20" r="1.5" fill="currentColor"/></svg>`;
const settingsIcon=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><path d="M4 7h16M4 17h16M8 4v6M16 14v6"/></svg>`;
export function createUI(){
 document.querySelector('#app').innerHTML=`
 <canvas id="world" aria-label="绿皮火车第一人称三维场景" tabindex="0"></canvas>
 <section id="intro" aria-label="旅程开始">
  <div class="frame-top"><div class="brand">${trainIcon}<span>A LITTLE TIME<br>BETWEEN STATIONS</span></div><span class="edition">一场关于停留的旅行 · 第一章</span></div>
  <div class="intro-copy"><p class="eyebrow">AN UNHURRIED JOURNEY</p><h1><span>晚点</span><span>之前</span></h1><p class="english-title">THE HOURS BETWEEN</p><p class="intro-description">坐一趟没有要紧事的火车。<br>让远山、暮色，和未说出口的话，慢慢经过。</p>
   <div class="start-row"><button id="begin" class="primary" disabled>带上车票，出发 <span class="arrow">↗</span></button><button id="quick-start" class="quiet" disabled>从靠窗的位置开始</button></div>
   <div id="loading-status" role="status">正在准备这趟旅程…</div>
  </div>
  <div class="intro-footer"><div class="route-card"><div class="station">榆川<small>YUCHUAN · 17:42</small></div><span class="rail"></span><div class="station">白鹭湾<small>BAILUWAN · 暮色时分</small></div></div><div class="intro-meta"><span class="sound-note"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor"><path d="M3 11V9a7 7 0 0114 0v2M3 10H2v6h4v-6H3m14 0h1v6h-4v-6h3"/></svg>建议佩戴耳机</span><span>自由走动 / 靠窗发呆 / 约八分钟</span><button id="intro-settings" class="quiet">旅程设置</button></div></div><div id="load-line"></div>
 </section>
 <div id="hud" aria-label="旅行信息"><div class="hud-top"><div class="hud-brand">${trainIcon}<div>晚点之前<small id="location-label">榆川站 · 候车</small></div></div><div class="hud-right"><div class="time-block"><span id="clock">17:42</span><small><span id="speed">0</span> KM/H · K1988</small></div><button class="icon-button" id="settings-button" aria-label="旅程设置">${settingsIcon}</button></div></div>
  <div class="crosshair" id="crosshair"></div><button id="interact" class="hidden"><kbd>E</kbd><span>上车</span></button>
  <div id="chapter"><div class="chapter-en">A MOMENT ALONG THE WAY</div><div class="chapter-name"></div></div><div id="subtitle" role="status"></div>
  <div class="hud-bottom"><div class="journey-strip"><div class="journey-labels"><span>榆川</span><span>白鹭湾</span></div><div class="progress-track"><span class="progress-fill" id="progress-fill"></span><span class="train-dot" id="train-dot"></span></div><div class="journey-detail" id="journey-detail">06车 · 软座 · 请从前方车门上车</div></div><div class="controls"><span><kbd>WASD</kbd>走动</span><span><kbd>鼠标</kbd>环顾</span><button class="hud-action" id="ticket-button"><kbd>J</kbd>车票</button><button class="hud-action" id="photo-button"><kbd>P</kbd>拍照</button><span><kbd>Esc</kbd>暂停</span></div></div>
 </div>
 <div id="settings" class="veil hidden" role="dialog" aria-modal="true" aria-labelledby="settings-title"><div class="panel"><div class="panel-top"><div><h2 id="settings-title">把时间调慢</h2><p class="subtitle">MAKE YOURSELF AT HOME</p></div><button id="close-settings" class="close" aria-label="关闭设置">×</button></div>
  <div class="setting-row"><label for="volume">声音 <output id="volume-value">65%</output></label><input id="volume" type="range" min="0" max="100" value="65"></div>
  <div class="setting-row"><label for="sway">身体与镜头晃动 <output id="sway-value">60%</output></label><input id="sway" type="range" min="0" max="100" value="60"></div>
  <div class="setting-row"><label>窗外天气</label><div class="choices" id="weather-choices"><button data-rain="false" class="selected">晴 · 暮色</button><button data-rain="true">雨 · 归途</button></div></div>
  <div class="setting-row"><label for="quality">画面品质</label><select id="quality"><option value="high">精致 · 光影与柔和辉光</option><option value="medium">流畅 · 降低渲染分辨率</option><option value="ultra">极致 · 更高清晰度与阴影</option></select></div>
  <div class="setting-row"><label for="pace">旅程节奏</label><select id="pace"><option value="1">正常 · 约八分钟</option><option value="2">快一些 · 约四分钟</option><option value="4">快速体验 · 约两分钟</option></select></div>
  <p class="panel-note">坐下后按 F 靠近窗户，O 推开车窗，E 起身。<br>按 H 隐藏界面。也可以按住鼠标左键拖动环顾。</p><button id="resume" class="primary">继续这段旅程 <span class="arrow">→</span></button><div class="panel-divider"></div><button id="restart" class="quiet">重新回到榆川站</button>
 </div></div>
 <div id="journal" class="veil hidden" role="dialog" aria-modal="true" aria-labelledby="journal-title"><div class="panel journal"><div class="panel-top"><div><h2 id="journal-title">一张去往远方的票</h2><p class="subtitle">KEEP A LITTLE OF THIS JOURNEY</p></div><button id="close-journal" class="close" aria-label="收起车票">×</button></div><div class="ticket-detail"><div class="ticket-route"><span>榆川</span><span>→</span><span>白鹭湾</span></div><p>K1988 次 · 06 车 · 028 号 · 软座<br>17:42 开车　　票价 ¥18.50<br>经由：河谷草甸 / 旧江大桥 / 杉林山谷 / 青山隧道 / 白鹭湖</p></div><div class="journal-note" id="journal-note">这一次，没有非要赶上的事情。<br>只要坐在窗边，看天色一点一点暗下来。</div><div class="journal-stamp">在 路 上<br>一路平安</div><p class="journal-footer">这一段线路与沿途站名为虚构创作。</p></div></div>
 <div id="ending" class="ending hidden"><p class="eyebrow">EVERY ARRIVAL IS A BEGINNING</p><h2>有些时间，只属于路上。</h2><p>你已抵达白鹭湾。可以在站台再待一会儿，<br>看看那扇刚才属于你的窗，慢慢驶向远处。</p><button id="again" class="quiet">再坐一程 ↗</button><button id="stay" class="quiet">留在站台</button></div>
 <div id="toast" role="status"></div><div class="fade-screen" id="fade"></div><div class="photo-flash" id="flash"></div>`;
 const credit=document.createElement('small');credit.id='landscape-credit';credit.textContent='地形影像 © swisstopo';document.querySelector('#app').append(credit);
 const $=id=>document.getElementById(id);
 let toastTimer,subtitleTimer,chapterTimer,promptText='',promptChanged=0;
 return {$,
  toast(text,time=3300){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),time);},
  subtitle(text,time=6500){$('subtitle').textContent=text;$('subtitle').classList.add('show');clearTimeout(subtitleTimer);subtitleTimer=setTimeout(()=>$('subtitle').classList.remove('show'),time);},
  chapter(text){$('chapter').querySelector('.chapter-name').textContent=text;$('chapter').classList.add('show');clearTimeout(chapterTimer);chapterTimer=setTimeout(()=>$('chapter').classList.remove('show'),5200);},
  loading(loaded,total,url){$('load-line').style.width=`${Math.min(98,loaded/Math.max(total,1)*100)}%`;$('loading-status').textContent=`正在装好光线、风景与行李 · ${loaded} / ${total}`;},
  ready(){ $('load-line').style.width='100%';$('loading-status').textContent='旅程已就绪。无需急着抵达。';$('begin').disabled=false;$('quick-start').disabled=false;},
  prompt(text){
   const quiet=!!text?.startsWith('起身');
   if(text!==promptText){promptText=text;promptChanged=performance.now();$('interact').querySelector('span').textContent=quiet?'起身':text||'';}
   $('interact').classList.toggle('hidden',!text);
   $('interact').classList.toggle('quiet-prompt',quiet);
   $('interact').classList.toggle('hint-sleep',quiet&&performance.now()-promptChanged>4500);
  },
 };
}
