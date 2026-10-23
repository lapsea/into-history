import { tuneArtifactMaterials } from './artifact-lighting.js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { MeshoptDecoder } from './node_modules/meshoptimizer/meshopt_decoder.module.js';

export const collectionItems = [
  {id:'storyteller',name:'击鼓说唱俑',hero:true},
  {id:'lamp',name:'长信宫灯',hero:true},
  {id:'general',name:'将军俑',hero:true,size:1.12},
  {id:'chignon',name:'发髻女子'},
  {id:'bronze-head',name:'青铜人头像'},
  {id:'sancai-horse',name:'三彩马'},
  {id:'court-lady',name:'唐代坐姿仕女',yaw:Math.PI}
];
const mod=(v,n)=>(v%n+n)%n;
export class CollectionRing {
  constructor(host,{onSelect=()=>{}}={}){
    this.host=host;this.onSelect=onSelect;this.phase=0;this.target=0;this.models=[];this.visible=true;this.loading=false;this.loaded=0;
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.setClearColor(0x000000,0);
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=.85;
    this.canvas=this.renderer.domElement;this.canvas.id='collection-canvas';this.canvas.tabIndex=0;this.canvas.setAttribute('role','region');host.prepend(this.canvas);
    this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(39,1,.1,70);
    this.scene.add(new THREE.HemisphereLight(0xffecd1,0x302a26,1.2));
    const key=new THREE.DirectionalLight(0xffe3bb,1.9);key.position.set(-5,7,8);this.scene.add(key);
    const fill=new THREE.DirectionalLight(0xdbe6ff,.9);fill.position.set(5,4,7);this.scene.add(fill);
    const rim=new THREE.DirectionalLight(0xffc97a,1.4);rim.position.set(0,4,-7);this.scene.add(rim);
    const pmrem=new THREE.PMREMGenerator(this.renderer),room=new RoomEnvironment();this.environment=pmrem.fromScene(room,.04);this.scene.environment=this.environment.texture;this.scene.environmentIntensity=.7;room.dispose();pmrem.dispose();
    this.loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);this.raycaster=new THREE.Raycaster();
    this.reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
    new ResizeObserver(()=>this.resize()).observe(host);
    this.visibilityObserver=new IntersectionObserver(entries=>{this.visible=entries[0].isIntersecting;if(this.visible){this.load();this.requestRender();}},{rootMargin:'350px'});this.visibilityObserver.observe(host);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)this.requestRender();});
    window.addEventListener('scroll',()=>this.requestRender(),{passive:true});
    this.bindEvents();this.resize();this.updateLabel();this.load();
  }
  resize(){const r=this.host.getBoundingClientRect();if(!r.width||!r.height)return;this.renderer.setSize(r.width,r.height,false);this.camera.aspect=r.width/r.height;this.camera.position.set(0,2.65,13.3);this.camera.lookAt(0,-.65,-1.5);this.camera.updateProjectionMatrix();this.camera.updateMatrixWorld(true);
    // Match the fixed photographed podium top, including cover-crop on narrow screens.
    const imageAspect=1839/855,coverHeight=Math.max(r.height,r.width/imageAspect);
    const anchorV=.5+(.565-.5)*coverHeight/r.height;
    const direction=new THREE.Vector3(0,1-anchorV*2,.5).unproject(this.camera).sub(this.camera.position).normalize();
    this.frontBaseY=this.camera.position.y+direction.y*(2.2-this.camera.position.z)/direction.z;
    this.requestRender();}
  async load(){if(this.loading)return;this.loading=true;this.host.dataset.state='loading';
    // Two concurrent decodes keep first paint responsive on mobile.
    let next=0;const worker=async()=>{while(next<collectionItems.length){const index=next++,item=collectionItems[index];if(this.models[index])continue;try{
      const gltf=await this.loader.loadAsync(`assets/models/ring/${item.id}.glb?v=ring-1`),object=gltf.scene;
      tuneArtifactMaterials(object,item.id);object.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(object),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
      object.position.set(-center.x,-bounds.min.y,-center.z);
      const scale=Math.min(3.15/size.y,3.0/Math.max(size.x,size.z));object.scale.multiplyScalar(scale);object.position.multiplyScalar(scale);
      const group=new THREE.Group();group.add(object);group.userData.index=index;group.traverse(n=>{if(n.isMesh)n.userData.index=index;});
      this.models[index]=group;this.scene.add(group);this.loaded++;this.host.dataset.loaded=String(this.loaded);this.host.querySelector('.ring-loading').hidden=this.loaded>0;this.layout();this.requestRender();
    }catch(error){console.error('环形展台模型加载失败',item.id,error);this.host.dataset.failed=item.id;}}};
    await Promise.all([worker(),worker()]);this.host.dataset.state=this.loaded===collectionItems.length?'ready':'partial';
    if(!this.loaded){this.host.querySelector('.ring-loading').hidden=true;this.host.querySelector('#ring-retry').hidden=false;}
  }
  updateLabel(){const index=mod(Math.round(this.target),collectionItems.length);this.host.dataset.active=collectionItems[index].id;this.canvas.setAttribute('aria-label',`文物环形展台，当前${collectionItems[index].name}。左右拖动切换，左右方向键切换，回车打开。`);}
  move(steps){this.target+=steps;this.updateLabel();this.requestRender();}
  focus(index){const current=mod(this.target,collectionItems.length);let delta=index-current;if(delta>3.5)delta-=7;if(delta< -3.5)delta+=7;this.target+=delta;this.updateLabel();this.requestRender();}
  layout(){const step=Math.PI*2/collectionItems.length;this.models.forEach((group,index)=>{
    const a=(index-this.phase)*step,front=(Math.cos(a)+1)/2,scale=.66+front*.48;
    group.position.set(Math.sin(a)*5,(this.frontBaseY||0)-(1-front)*.6,-2.8+Math.cos(a)*5);group.scale.setScalar(scale*(collectionItems[index].size||1));
    group.rotation.y=(collectionItems[index].yaw||0)+Math.sin(a)*-.23;
  });}
  requestRender(){const rect=this.host.getBoundingClientRect();if(this.frame||document.hidden||rect.bottom<=0||rect.top>=innerHeight)return;this.frame=requestAnimationFrame(()=>{this.frame=0;const delta=this.target-this.phase;this.phase=this.reduce?this.target:Math.abs(delta)<.0005?this.target:this.phase+delta*.11;this.layout();this.renderer.render(this.scene,this.camera);if(Math.abs(this.phase-this.target)>.0005)this.requestRender();});}
  pick(x,y){const r=this.canvas.getBoundingClientRect();this.raycaster.setFromCamera(new THREE.Vector2((x-r.left)/r.width*2-1,-(y-r.top)/r.height*2+1),this.camera);const hit=this.raycaster.intersectObjects(this.models.filter(Boolean),true)[0];return hit?.object.userData.index;}
  activate(index){if(index===undefined)return;if(mod(Math.round(this.target),7)!==index||Math.abs(this.target-this.phase)>.06){this.focus(index);return;}this.onSelect(collectionItems[index]);}
  bindEvents(){
    this.canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;this.pointer={id:e.pointerId,x:e.clientX,y:e.clientY,phase:this.target,moved:false};this.canvas.setPointerCapture(e.pointerId);});
    this.canvas.addEventListener('pointermove',e=>{const p=this.pointer;if(!p||p.id!==e.pointerId)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;if(Math.abs(dx)>7&&Math.abs(dx)>Math.abs(dy)){p.moved=true;this.host.classList.add('is-dragging');}if(p.moved){this.target=p.phase-dx/(this.host.clientWidth<700?120:200);this.updateLabel();this.requestRender();}});
    const end=(e,cancel=false)=>{const p=this.pointer;if(!p||p.id!==e.pointerId)return;this.pointer=null;this.host.classList.remove('is-dragging');if(p.moved||cancel){this.target=Math.round(this.target);this.updateLabel();this.requestRender();}else this.activate(this.pick(e.clientX,e.clientY));};
    this.canvas.addEventListener('pointerup',e=>end(e));this.canvas.addEventListener('pointercancel',e=>end(e,true));
    this.canvas.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();this.move(e.key==='ArrowRight'?1:-1);}else if(e.key==='Enter'||e.key===' '){e.preventDefault();this.activate(mod(Math.round(this.target),7));}else if(e.key==='Home'){e.preventDefault();this.focus(0);}});
    this.host.querySelector('#ring-retry').addEventListener('click',()=>{this.loading=false;this.load();});
  }
}
