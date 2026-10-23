import { HeroFilm } from './hero-film.js';
import { CollectionRing } from './collection-ring.js';
import { ArtifactViewer } from './model-viewer.js';
import { Panorama } from './panorama.js';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const artifacts={
  storyteller:{name:'击鼓说唱俑',title:'击鼓<br>说唱俑',era:'东汉 · 陶器',number:'001',museum:'中国国家博物馆藏',line:'一槌未落，笑意千年。',description:'循着一张笑脸，走近两千年前的<br>人间烟火与宴席欢声。',background:'assets/images/storyteller-banquet.png',poster:'assets/site/storyteller-cutout.png',uid:'eba4335aa43b4055b97c71c1a8f9c95b',awaken:'assets/site/museum.mp4',transform:'assets/videos/storyteller-transform.mp4',performance:'assets/videos/storyteller-performance.mp4'},
  lamp:{name:'长信宫灯',title:'长信<br>宫灯',era:'西汉 · 鎏金青铜',number:'002',museum:'河北博物院藏',line:'一灯既明，汉夜如昼。',description:'循着一缕灯火，走近汉代灯具的<br>巧思与静谧的夜间生活。',background:'assets/site/lamp-background.jpg',poster:'assets/site/lamp.jpg',uid:'e51abb5def984dd4bec4ce4a8f6cd924',awaken:'assets/videos/lamp-awaken.mp4'},
  general:{name:'将军俑',title:'秦代<br>将军俑',era:'秦 · 陶器',number:'003',museum:'秦始皇帝陵博物院藏',line:'千军肃立，一眼千年。',description:'从凝固的目光，走近秦代军阵的<br>秩序、力量与恢弘气象。',background:'assets/site/general-background.jpg',poster:'assets/site/general.jpg',uid:'c3c7b97bc4f044bfbac59d78233e9a2c',awaken:'assets/videos/general-awaken.mp4'}
};
let current='storyteller',videoKind='awaken',toastTimer,artifactViewer=null;
const cinema=$('#cinema'),video=$('#cinema-video'),info=$('#info-dialog');
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3500);}
function showInfo(kicker,title,body){$('#info-kicker').textContent=kicker;$('#info-title').textContent=title;$('#info-body').innerHTML=body;info.showModal();}
function setStep(step){$$('[data-step]').forEach(b=>b.classList.toggle('active',b.dataset.step===step));$$('[data-nav]').forEach(b=>b.classList.toggle('active',b.dataset.nav===step));}
async function fullscreen(el){try{if(document.fullscreenElement)await document.exitFullscreen();else if(el.requestFullscreen)await el.requestFullscreen();else toast('此浏览器暂不支持页面全屏');}catch{toast('未能进入全屏，请在浏览器中重试');}}
$('#page-fullscreen').addEventListener('click',()=>fullscreen(document.documentElement));
$('#info-close').addEventListener('click',()=>info.close());
for(const dialog of [info,cinema])dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();});
$('#about-button').addEventListener('click',()=>showInfo('ABOUT THE EXHIBITION','让文物，走进眼前',`<p>入史是一场从真实文物出发的数字探索。旋转模型、观看文物活化影像，再走进可环顾的历史现场。</p><p>当前完整体验为东汉击鼓说唱俑，另提供长信宫灯与秦代将军俑的模型及视频体验。</p><p class="info-label">历史情境 · 创意演绎</p><p>人物动作、宴饮空间与视频为艺术演绎，不能视为已证实的历史原貌。3D 观察由本地模型实时渲染，可直接拖动旋转与缩放。</p>`));
$('#credits-button').addEventListener('click',()=>showInfo('SOURCES & NOTES','素材与创作说明',`<p>文物图片、全景图和活化视频由项目提供者提供。视频均默认静音。</p><p>说唱俑：<a href="https://www.chnmuseum.cn/zp/zpml/kgfjp/202008/t20200824_247253.shtml" target="_blank" rel="noopener">中国国家博物馆藏品资料 ↗</a></p><p>3D 观察使用本地 GLB 模型与原配纹理，网页版本经过压缩优化，纹理已打包在模型内。兵马俑使用目录内的将军俑模型。模型原始来源：<a href="https://sketchfab.com/3d-models/eba4335aa43b4055b97c71c1a8f9c95b" target="_blank" rel="noopener">说唱俑 · 邵青 ↗</a>、<a href="https://sketchfab.com/3d-models/e51abb5def984dd4bec4ce4a8f6cd924" target="_blank" rel="noopener">长信宫灯 ↗</a>、<a href="https://sketchfab.com/3d-models/c3c7b97bc4f044bfbac59d78233e9a2c" target="_blank" rel="noopener">将军俑 ↗</a>。</p><p>全景按水平 180°进行展示校准，使用固定观察点和有限视野。原图为生成式情境图，未经真实空间测量；动态现场同样为创意演绎。</p><p class="info-label">制作说明</p><p>界面与交互本地运行。当前场景不代表对具体古代宅邸或某场宴席的考古复原。</p>`));
const details={storyteller:['笑意与姿态','举槌欲击，张口而笑','<p>左臂抱鼓、右手举槌，张口嘻笑、动作夸张。这些细节将俳优表演的一个瞬间凝固在陶土中。</p><p>汉代俳优以调谑、滑稽等表演取悦主人与观赏者，常边击鼓边歌唱。</p><p><a href="https://www.chnmuseum.cn/zp/zpml/kgfjp/202008/t20200824_247253.shtml" target="_blank" rel="noopener">阅读国博藏品说明 ↗</a></p>'],lamp:['灯下巧思','一盏灯里的结构之美','<p>长信宫灯将跪坐宫女形象与照明功能结合。灯罩可开合调节光照，右臂与袖管形成烟道。</p><p>本体验中的点灯、人物化身与历史生活片段为创意演绎。</p>'],general:['军阵与秩序','从一个人，看见一支军队','<p>将军俑也称高级军吏俑。其冠式、甲衣和姿态表现出与普通士兵不同的身份特征。</p><p>兵马俑是秦始皇陵陪葬军阵的一部分，视频中的军队集结属于历史情境演绎。</p>']};
function detail(){showInfo(...details[current]);}
$('#detail-button').addEventListener('click',detail);$('#artifact-hotspot').addEventListener('click',detail);
function configureNext(){const b=$('#cinema-next');b.hidden=false;if(current!=='storyteller'){b.innerHTML='再看一次 <svg><use href="#i-reset"/></svg>';return;}const text=videoKind==='awaken'?'走进历史现场':videoKind==='transform'?'入席探索全景':'回到汉宴全景';b.innerHTML=`${text} <svg><use href="#i-arrow"/></svg>`;}
function playFilm(kind='awaken'){
  const a=artifacts[current];videoKind=kind;const src=a[kind]||a.awaken;video.pause();video.src=src;video.poster=kind==='performance'?'assets/site/performance.jpg':a.poster;video.muted=true;video.controls=true;
  const titles=current==='storyteller'?{awaken:['文物苏醒 / AWAKEN','让笑意，再次流动'],transform:['走进历史 / INTO HISTORY','由一件陶俑，走进一场汉宴'],performance:['席间表演 / PERFORMANCE','看一段东汉击鼓说唱']}:{awaken:[a.era,current==='lamp'?'灯亮汉夜':'列阵待令']};
  const [k,t]=titles[kind]||titles.awaken;$('#cinema-kicker').textContent=k;$('#cinema-title').textContent=t;$('#cinema-note').textContent='文物活化 · 创意演绎 · 无声呈现';configureNext();if(!cinema.open)cinema.showModal();$('#video-retry').hidden=true;video.play().catch(()=>{$('#video-retry').hidden=false;});setStep('awaken');
}
$('#awaken-button').addEventListener('click',startHeroFilm);$('#video-retry').addEventListener('click',()=>video.play().then(()=>$('#video-retry').hidden=true).catch(()=>toast('视频尚未加载，请稍后重试')));
video.addEventListener('error',()=>{$('#video-retry').hidden=false;$('#video-retry').textContent='重新加载视频';$('#cinema-note').textContent='视频加载暂不可用，可关闭后继续探索';});
video.addEventListener('play',()=>{$('#video-retry').hidden=true;});
cinema.addEventListener('close',()=>{video.pause();setStep('observe');});$('#cinema-close').addEventListener('click',()=>cinema.close());
$('#cinema-next').addEventListener('click',()=>{if(current!=='storyteller'){video.currentTime=0;video.play().catch(()=>$('#video-retry').hidden=false);return;}if(videoKind==='awaken')playFilm('transform');else{cinema.close();$('#scene').scrollIntoView({behavior:'smooth'});setStep('scene');}});
$('#performance-button').addEventListener('click',()=>playFilm('performance'));
$$('[data-step],[data-nav]').forEach(b=>b.addEventListener('click',e=>{const step=b.dataset.step||b.dataset.nav;if(step==='observe'){e.preventDefault();$('#top').scrollIntoView({behavior:'smooth'});setStep('observe');}else if(step==='awaken'){e.preventDefault();startHeroFilm();}else{setStep('scene');if(b.tagName==='BUTTON')$('#scene').scrollIntoView({behavior:'smooth'});}}));
function modelState(state,message){
  if(state==='rotate'){$('#orbit-button').setAttribute('aria-pressed',String(message));return;}
  const ready=state==='ready';$('#local-model-status').hidden=ready;$('#local-model-message').textContent=message;
  $('#local-model-status .loader').hidden=state==='error';$('#model-retry').hidden=state!=='error';
  $('#artifact-poster').hidden=ready;$('#model-drag-hint').hidden=!ready;
  $('#orbit-button').disabled=!ready||$('#hero-film').dataset.state!=='closed';
}
function loadLocalModel(){const a=artifacts[current];$('#top').dataset.artifact=current;artifactViewer?.load(`assets/models/${current}.glb?v=local-2`,a.name,{view:current==='storyteller'?{zoom:.6,targetY:.65,azimuth:.16,elevation:-.025,mobileZoom:.7,mobileTargetY:.25}:null});}
try{artifactViewer=new ArtifactViewer($('#local-model'),{onState:modelState});loadLocalModel();}catch(e){console.error(e);modelState('error','当前浏览器无法显示3D，请使用支持 WebGL 的浏览器');}
$('#model-retry').addEventListener('click',loadLocalModel);
$('#orbit-button').addEventListener('click',()=>artifactViewer?.toggleRotate());
$('#hero-reset').addEventListener('click',()=>{heroFilm.stop();artifactViewer?.reset();setStep('observe');toast('已回到文物初始视角');});
const heroFilm=new HeroFilm($('#top'),{onState:active=>{if(active)artifactViewer?.reset();artifactViewer?.setRotate(false);$('#orbit-button').disabled=active||!artifactViewer?.ready;setStep(active?'awaken':'observe');$('#awaken-button strong').textContent=active?'回到这件文物':'唤醒这件文物';},onEnd:()=>artifactViewer?.reset(),onError:toast});
function startHeroFilm(){$('#top').scrollIntoView({behavior:'smooth'});heroFilm.toggle(artifacts[current],current);}
const pano=new Panorama($('#panorama'),{onError:toast});
$('#scene-caption-close').addEventListener('click',()=>$('#scene-caption').hidden=true);$('#pano-reset').addEventListener('click',()=>{pano.reset();$('#scene-caption').hidden=true;});$('#pano-zoom-in').addEventListener('click',()=>pano.zoom(.85));$('#pano-zoom-out').addEventListener('click',()=>pano.zoom(1.15));for(const id of ['pano-fullscreen','scene-fullscreen'])$('#'+id).addEventListener('click',()=>fullscreen($('#panorama')));
function selectArtifact(id){if(current===id){$('#top').scrollIntoView({behavior:'smooth'});return;}heroFilm.stop(true);if(cinema.open)cinema.close();current=id;const a=artifacts[id];$('#top').style.setProperty('--hero-image',`url("${a.background}")`);$('#artifact-title').innerHTML=a.title;$('#artifact-era').textContent=a.era;$('#artifact-poster').src=a.poster;$('#hero-media').classList.add('is-cutout');loadLocalModel();$('#artifact-poster').alt=a.name;$('#artifact-hotspot').hidden=id!=='storyteller';  const isStory=id==='storyteller';$('#panorama').hidden=!isStory;$('.scene-footnote').hidden=!isStory;$('#scene-fullscreen').hidden=!isStory;$('#scene-alternative').hidden=isStory;$('#scene-title').textContent=isStory?'汉代宴席':id==='lamp'?'灯亮汉夜':'列阵待令';pano.setEnabled(isStory);if(!isStory){$('#alternative-title').textContent=id==='lamp'?'长信宫灯 · 灯亮汉夜':'将军俑 · 列阵待令';$('#alternative-image').src=a.poster;}setStep('observe');document.title=`入史 · ${a.name}`;$('#top').scrollIntoView({behavior:'smooth'});}
$('#alternative-play').addEventListener('click',startHeroFilm);
const inspector=$('#model-inspector');let inspectorViewer=null,inspectedItem=null;
function openInspector(item){
  inspectedItem=item;inspector.showModal();$('#inspector-loading').hidden=false;$('#inspector-retry').hidden=true;
  if(!inspectorViewer)inspectorViewer=new ArtifactViewer($('#inspector-model'),{canvasId:'inspector-canvas',initialZoom:1,onState:(state)=>{if(state==='rotate')return;$('#inspector-loading').hidden=state!=='loading';$('#inspector-retry').hidden=state!=='error';}});
  inspectorViewer.load(`assets/models/${item.id}.glb?v=local-2`,item.name,{yaw:item.yaw||0});
}
$('#inspector-close').addEventListener('click',()=>inspector.close());
$('#inspector-reset').addEventListener('click',()=>inspectorViewer?.reset());
$('#inspector-retry').addEventListener('click',()=>{if(inspectedItem)inspectorViewer?.load(`assets/models/${inspectedItem.id}.glb?v=local-2`,inspectedItem.name,{yaw:inspectedItem.yaw||0});});
inspector.addEventListener('close',()=>{inspectorViewer?.setRotate(false);$('#collection-canvas')?.focus({preventScroll:true});});
let ring=null;try{ring=new CollectionRing($('#collection-ring'),{onSelect:item=>{if(item.hero)selectArtifact(item.id);else openInspector(item);}});}catch(error){console.error(error);toast('文物展台暂时无法加载，请刷新后重试');}
const sectionsObserver=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting&&!cinema.open&&!heroFilm.active)setStep(e.target.id==='top'?'observe':'scene');},{threshold:.35});sectionsObserver.observe($('#top'));sectionsObserver.observe($('#scene'));
// Expose only read-only state for reproducible manual QA, no external state mutations.
Object.defineProperty(window,'exhibitState',{get:()=>({artifact:current,mode:pano.mode,yaw:Number($('#panorama').dataset.yaw),pitch:Number($('#panorama').dataset.pitch),fov:Number($('#panorama').dataset.fov),video:videoKind,modelReady:!!artifactViewer?.ready})});
