import { tuneArtifactMaterials, artifactIdByName } from './artifact-lighting.js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { MeshoptDecoder } from './node_modules/meshoptimizer/meshopt_decoder.module.js';

// A single local renderer is reused across artifacts; no iframe or remote service.
export class ArtifactViewer {
  constructor(host,{onState=()=>{},canvasId='artifact-canvas',initialZoom=.8}={}) {
    this.host=host;this.onState=onState;this.initialZoom=initialZoom;this.token=0;this.visible=true;this.ready=false;
    this.renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
    this.renderer.setClearColor(0x000000,0);
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure=1.15;
    this.canvas=this.renderer.domElement;this.canvas.id=canvasId;this.canvas.tabIndex=0;
    this.canvas.setAttribute('role','img');this.canvas.setAttribute('aria-label','文物实时3D模型，拖动旋转，滚轮或双指缩放，方向键旋转，Home复位');
    host.prepend(this.canvas);
    this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(34,1,.01,100);
    this.controls=new OrbitControls(this.camera,this.canvas);
    this.controls.enableDamping=true;this.controls.dampingFactor=.09;this.controls.enablePan=false;
    this.controls.minPolarAngle=.15;this.controls.maxPolarAngle=Math.PI-.15;
    this.controls.autoRotate=false;this.controls.autoRotateSpeed=.55;
    this.controls.addEventListener('change',()=>this.requestRender());
    this.controls.addEventListener('start',()=>{this.setRotate(false);host.classList.add('has-interacted');});
    this.scene.add(new THREE.HemisphereLight(0xffefd7,0x4e4036,1.6));
    const key=new THREE.DirectionalLight(0xffe6c0,3);key.position.set(-3,5,5);this.scene.add(key);
    const fill=new THREE.DirectionalLight(0xd8e7ff,1.35);fill.position.set(4,2,3);this.scene.add(fill);
    const rim=new THREE.DirectionalLight(0xffd296,2.2);rim.position.set(1,3,-4);this.scene.add(rim);
    const pmrem=new THREE.PMREMGenerator(this.renderer);const room=new RoomEnvironment();
    this.environment=pmrem.fromScene(room,.04);this.scene.environment=this.environment.texture;room.dispose();pmrem.dispose();
    this.loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    new ResizeObserver(()=>this.resize()).observe(host);
    new IntersectionObserver(entries=>{this.visible=entries[0].isIntersecting;if(this.visible)this.requestRender();},{threshold:0}).observe(host);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)this.requestRender();});
    this.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.onState('error','3D显示暂时中断，请重新加载模型');});
    this.canvas.addEventListener('webglcontextrestored',()=>this.onState('error','请重新加载模型以恢复显示'));
    this.canvas.addEventListener('keydown',e=>{
      if(e.key==='Home'){e.preventDefault();this.reset();return;}
      if(['+','=','-'].includes(e.key)){e.preventDefault();this.zoom(e.key==='-'?1.15:.87);return;}
      const h={ArrowLeft:.15,ArrowRight:-.15}[e.key],v={ArrowUp:-.1,ArrowDown:.1}[e.key];
      if(h||v){e.preventDefault();this.setRotate(false);const p=new THREE.Spherical().setFromVector3(this.camera.position.clone().sub(this.controls.target));p.theta+=h||0;p.phi=THREE.MathUtils.clamp(p.phi+(v||0),.15,Math.PI-.15);this.camera.position.copy(new THREE.Vector3().setFromSpherical(p).add(this.controls.target));this.controls.update();}
    });
    this.resize();
  }
  resize(){const {width,height}=this.host.getBoundingClientRect();if(!width||!height)return;this.renderer.setSize(width,height,false);this.camera.aspect=width/height;this.camera.updateProjectionMatrix();if(this.ready)this.fit();this.requestRender();}
  fit(){if(!this.dimensions)return;const v=Math.tan(THREE.MathUtils.degToRad(this.camera.fov/2));this.distance=Math.max(this.dimensions.y/(2*v),this.dimensions.x/(2*v*this.camera.aspect))*1.18+this.dimensions.z*.4;this.controls.minDistance=this.distance*.48;this.controls.maxDistance=this.distance*2;this.reset();}
  reset(){if(!this.ready)return;this.setRotate(false);this.controls.enableDamping=false;this.controls.update();const view=this.initialView||{};const mobile=matchMedia('(max-width:760px)').matches;const targetY=mobile?(view.mobileTargetY??view.targetY??0):(view.targetY??0);this.controls.target.set(0,targetY,0);const startDistance=this.distance*(mobile?(view.mobileZoom??view.zoom??this.initialZoom):(view.zoom??this.initialZoom));const angle=view.azimuth??0;this.camera.position.set(Math.sin(angle)*startDistance,targetY+startDistance*(view.elevation??.035),Math.cos(angle)*startDistance);this.camera.lookAt(this.controls.target);this.controls.update();this.controls.enableDamping=true;this.requestRender();}
  zoom(factor){if(!this.ready)return;const v=this.camera.position.clone().sub(this.controls.target);v.multiplyScalar(factor).clampLength(this.controls.minDistance,this.controls.maxDistance);this.camera.position.copy(this.controls.target).add(v);this.controls.update();this.requestRender();}
  setRotate(value){this.controls.autoRotate=value;this.host.dataset.rotating=String(value);this.onState('rotate',value);this.requestRender();}
  toggleRotate(){if(this.ready)this.setRotate(!this.controls.autoRotate);}
  requestRender(){if(this.frame||!this.visible||document.hidden)return;this.frame=requestAnimationFrame(()=>{this.frame=0;const moved=this.controls.update();this.renderer.render(this.scene,this.camera);if(this.controls.autoRotate||moved)this.requestRender();});}
  disposeModel(root){const textures=new Set(),materials=new Set(),geometries=new Set();root.traverse(n=>{if(!n.isMesh)return;geometries.add(n.geometry);for(const m of [n.material].flat()){materials.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);}});textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());geometries.forEach(g=>g.dispose());}
  async load(url,name,{yaw=0,view=null}={}){
    const token=++this.token;this.initialView=view;this.ready=false;this.setRotate(false);this.host.dataset.state='loading';this.host.dataset.model=name;
    this.onState('loading','正在加载本地模型…');
    if(this.model){this.scene.remove(this.model);this.disposeModel(this.model);this.model=null;this.renderer.render(this.scene,this.camera);}
    try{
      const gltf=await this.loader.loadAsync(url,e=>{if(token===this.token&&e.total)this.onState('loading',`正在加载本地模型 · ${Math.min(99,Math.round(e.loaded/e.total*100))}%`);});
      if(token!==this.token){this.disposeModel(gltf.scene);return;}
      const object=gltf.scene;
      tuneArtifactMaterials(object,artifactIdByName[name]);this.renderer.toneMappingExposure=artifactIdByName[name] ? .9 : 1.15;
      object.rotation.y+=yaw;object.updateMatrixWorld(true);
      const box=new THREE.Box3().setFromObject(object),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
      if(!Number.isFinite(size.length())||size.y<=0)throw new Error('模型尺寸异常');
      object.position.sub(center);this.model=new THREE.Group();this.model.add(object);this.model.scale.setScalar(3.4/size.y);
      this.dimensions=size.multiplyScalar(3.4/size.y);this.scene.add(this.model);this.ready=true;this.fit();
      this.canvas.setAttribute('aria-label',`${name}实时3D模型，拖动旋转，滚轮或双指缩放，方向键旋转，Home复位`);
      this.renderer.render(this.scene,this.camera);this.host.dataset.state='ready';this.onState('ready','本地 3D · 拖动旋转 · 滚轮缩放');
    }catch(error){if(token!==this.token)return;console.error('本地文物模型加载失败',error);this.host.dataset.state='error';this.onState('error','模型加载失败，请重试');}
  }
}
