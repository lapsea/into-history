// Partial spherical viewer: a 180° source is never stretched around a 360° sphere.
// Coverage is an exhibition calibration for the supplied generated illustration,
// not a claim that the source is a metrically captured panorama.
const RAD=Math.PI/180;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export class Panorama {
  constructor(container,{onError}={}) {
    this.el=container;this.canvas=container.querySelector('canvas');this.video=container.querySelector('#panorama-video');this.intro=container.querySelector('#panorama-intro');this.retry=container.querySelector('#pano-video-retry');
    this.onError=onError;this.yaw=0;this.pitch=-2.5*RAD;this.hfov=(innerWidth<760?58:78)*RAD;this.sourceH=Math.PI;this.sourceV=Math.PI/2.33;this.mode='video';this.loaded=false;this.visible=false;this.enabled=true;this.frame=0;this.phase='intro';this.el.dataset.phase='intro';this.mix=0;this.revealElapsed=null;
    this.video.muted=true;this.video.loop=true;this.intro.muted=true;this.intro.loop=false;
    try {this.initGL();} catch {this.gl=null;this.canvas.hidden=true;this.video.hidden=false;this.intro.hidden=false;this.video.classList.add('native-panorama');this.intro.classList.add('pano-intro-native');}
    for(const media of [this.intro,this.video]){
      media.addEventListener('loadeddata',()=>{this.loaded=this.intro.readyState>=2;if(this.loaded)this.el.querySelector('.pano-loading').hidden=true;this.resize();this.syncPlayback();});
      media.addEventListener('playing',()=>{this.retry.hidden=true;if(media===this.video&&this.phase==='waiting'){this.phase='transition';this.el.dataset.phase='transition';this.revealElapsed=0;this.hfov=(innerWidth<760?26:56)*RAD;this.pitch=-4*RAD;this.yaw=0;}this.startVideo();});
      media.addEventListener('error',()=>{this.el.querySelector('.pano-loading').hidden=true;this.retry.textContent='重新加载视频';this.retry.hidden=false;this.onError?.('视频暂时无法加载，请重试');});
    }
    this.intro.addEventListener('ended',()=>this.beginPanorama());
    this.retry.addEventListener('click',()=>{const media=this.phase==='intro'?this.intro:this.video;if(media.error)media.load();this.syncPlayback();});
    if(this.intro.readyState>=2){this.loaded=true;this.el.querySelector('.pano-loading').hidden=true;}
    this.bind();this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(container);
    this.visibilityObserver=new IntersectionObserver(()=>this.syncPlayback());this.visibilityObserver.observe(container);
    window.addEventListener('scroll',()=>this.syncPlayback(),{passive:true});document.addEventListener('visibilitychange',()=>this.syncPlayback());
    this.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.gl=null;this.canvas.hidden=true;this.video.hidden=false;this.intro.hidden=false;this.video.classList.add('native-panorama');this.intro.classList.add('pano-intro-native');this.draw();});
    this.resize();this.syncPlayback();
  }
  initGL(){
    const gl=this.canvas.getContext('webgl',{alpha:false,antialias:false,preserveDrawingBuffer:true});if(!gl)throw new Error('WebGL unavailable');this.gl=gl;
    const vs=`attribute vec2 a; varying vec2 p;void main(){p=a;gl_Position=vec4(a,0.,1.);}`;
    const fs=`precision highp float;varying vec2 p;uniform sampler2D tex;uniform sampler2D introTex;uniform float blendAmount;uniform float introAspect;uniform float aspect;uniform float tanHalf;uniform float yaw;uniform float pitch;uniform float coverageH;uniform float coverageV;void main(){vec3 d=normalize(vec3(p.x*aspect*tanHalf,p.y*tanHalf,1.));float cp=cos(pitch),sp=sin(pitch);d=vec3(d.x,cp*d.y+sp*d.z,-sp*d.y+cp*d.z);float cy=cos(yaw),sy=sin(yaw);d=vec3(cy*d.x+sy*d.z,d.y,-sy*d.x+cy*d.z);vec2 uv=vec2(.5+atan(d.x,d.z)/coverageH,.5-asin(clamp(d.y,-1.,1.))/coverageV);vec2 flatUV=vec2(.5+p.x*.5,.5-p.y*.5);if(aspect>introAspect){flatUV.y=.5+(flatUV.y-.5)*introAspect/aspect;}else{flatUV.x=.5+(flatUV.x-.5)*aspect/introAspect;}gl_FragColor=mix(texture2D(introTex,flatUV),texture2D(tex,clamp(uv,vec2(.001),vec2(.999))),blendAmount);}`;
    const compile=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;};
    this.program=gl.createProgram();gl.attachShader(this.program,compile(gl.VERTEX_SHADER,vs));gl.attachShader(this.program,compile(gl.FRAGMENT_SHADER,fs));gl.linkProgram(this.program);if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw new Error('shader link');gl.useProgram(this.program);
    const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const a=gl.getAttribLocation(this.program,'a');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
    this.uniform={};for(const k of ['aspect','tanHalf','yaw','pitch','coverageH','coverageV','blendAmount','introAspect'])this.uniform[k]=gl.getUniformLocation(this.program,k);
    this.texture=gl.createTexture();this.introTexture=gl.createTexture();this.uploadTimes={};
    for(const [unit,texture] of [[0,this.texture],[1,this.introTexture]]){gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,255]));}
    gl.uniform1i(gl.getUniformLocation(this.program,'tex'),0);gl.uniform1i(gl.getUniformLocation(this.program,'introTex'),1);

  }
  bind(){
    let last=null,moved=false;const touches=new Map();let pinch=null;
    this.el.addEventListener('pointerdown',e=>{if(this.phase!=='video')return;this.revealElapsed=null;if(e.target.closest('button,a,.scene-caption'))return;this.el.focus({preventScroll:true});touches.set(e.pointerId,{x:e.clientX,y:e.clientY});this.el.setPointerCapture(e.pointerId);last={x:e.clientX,y:e.clientY};moved=false;this.el.classList.add('dragging');if(touches.size===2){const [a,b]=[...touches.values()];pinch={distance:Math.hypot(a.x-b.x,a.y-b.y),fov:this.hfov};}});
    this.el.addEventListener('pointermove',e=>{if(!touches.has(e.pointerId))return;touches.set(e.pointerId,{x:e.clientX,y:e.clientY});if(touches.size===2&&pinch){const [a,b]=[...touches.values()];this.hfov=clamp(pinch.fov*pinch.distance/Math.max(1,Math.hypot(a.x-b.x,a.y-b.y)),40*RAD,90*RAD);}else if(last){this.yaw-=(e.clientX-last.x)/this.w*this.hfov;this.pitch+=(e.clientY-last.y)/this.h*this.vfov;}last={x:e.clientX,y:e.clientY};moved=true;this.draw();});
    const end=e=>{touches.delete(e.pointerId);pinch=null;last=touches.size?[...touches.values()][0]:null;if(!touches.size)this.el.classList.remove('dragging');if(moved)this.el.dataset.explored='true';};this.el.addEventListener('pointerup',end);this.el.addEventListener('pointercancel',end);
    this.el.addEventListener('wheel',e=>{if(this.phase!=='video')return;e.preventDefault();this.zoom(e.deltaY>0?1.07:1/1.07);},{passive:false});
    this.el.addEventListener('keydown',e=>{if(e.target!==this.el||this.phase!=='video')return;let handled=true;switch(e.key){case'ArrowLeft':this.yaw-=5*RAD;break;case'ArrowRight':this.yaw+=5*RAD;break;case'ArrowUp':this.pitch+=4*RAD;break;case'ArrowDown':this.pitch-=4*RAD;break;case'+':case'=':this.zoom(.9);break;case'-':this.zoom(1.1);break;case'Home':this.reset();break;default:handled=false;}if(handled){e.preventDefault();this.draw();}});
  }
  resize(){this.w=this.el.clientWidth;this.h=this.el.clientHeight;if(!this.w||!this.h)return;const dpr=Math.min(devicePixelRatio||1,2);this.canvas.width=Math.round(this.w*dpr);this.canvas.height=Math.round(this.h*dpr);this.draw();}
  bounds(){this.aspect=this.w/this.h;this.hfov=clamp(this.hfov,(this.revealElapsed!==null&&this.revealElapsed<1600?22:40)*RAD,90*RAD);this.vfov=2*Math.atan(Math.tan(this.hfov/2)/this.aspect);const maxPitch=Math.max(0,this.sourceV/2-this.vfov/2-.012);this.pitch=clamp(this.pitch,-maxPitch,maxPitch);const maxYaw=Math.max(0,this.sourceH/2-Math.atan(Math.tan(this.hfov/2)/Math.max(.1,Math.cos(Math.abs(this.pitch)+this.vfov/2)))-.012);this.yaw=clamp(this.yaw,-maxYaw,maxYaw);}
  draw(){if(!this.loaded||!this.w||!this.h)return;this.bounds();
    if(this.gl){const g=this.gl;g.viewport(0,0,this.canvas.width,this.canvas.height);g.useProgram(this.program);
      for(const [unit,texture,media,key] of [[0,this.texture,this.video,'pano'],[1,this.introTexture,this.intro,'intro']]){g.activeTexture(g.TEXTURE0+unit);g.bindTexture(g.TEXTURE_2D,texture);if(media.readyState>=2&&this.uploadTimes[key]!==media.currentTime){try{g.texImage2D(g.TEXTURE_2D,0,g.RGBA,g.RGBA,g.UNSIGNED_BYTE,media);this.uploadTimes[key]=media.currentTime;}catch{}}}
      g.uniform1f(this.uniform.aspect,this.aspect);g.uniform1f(this.uniform.tanHalf,Math.tan(this.vfov/2));g.uniform1f(this.uniform.yaw,this.yaw);g.uniform1f(this.uniform.pitch,this.pitch);g.uniform1f(this.uniform.coverageH,this.sourceH);g.uniform1f(this.uniform.coverageV,this.sourceV);g.uniform1f(this.uniform.blendAmount,this.mix);g.uniform1f(this.uniform.introAspect,this.intro.videoWidth/this.intro.videoHeight||16/9);g.drawArrays(g.TRIANGLES,0,6);
    }else{const iw=this.w*this.sourceH/this.hfov,ih=iw*(this.video.videoHeight/this.video.videoWidth||1/2.33);this.video.style.width=iw+'px';this.video.style.height=ih+'px';this.video.style.left=(this.w/2-this.yaw/this.sourceH*iw)+'px';this.video.style.top=(this.h/2+this.pitch/this.sourceV*ih)+'px';this.video.style.opacity=this.mix;this.intro.style.opacity=1-this.mix;}
    const needle=document.getElementById('heading-needle');if(needle)needle.style.left=(50+this.yaw/Math.PI*100)+'%';this.el.dataset.yaw=(this.yaw/RAD).toFixed(1);this.el.dataset.pitch=(this.pitch/RAD).toFixed(1);this.el.dataset.fov=(this.hfov/RAD).toFixed(1);this.el.dataset.blend=this.mix.toFixed(2);
  }
  zoom(factor){if(this.phase!=='video')return;this.revealElapsed=null;this.hfov*=factor;this.draw();}
  reset(){this.yaw=0;this.pitch=-2.5*RAD;this.hfov=(innerWidth<760?58:78)*RAD;this.draw();}
  beginPanorama(){if(this.phase!=='intro')return;this.phase='waiting';this.el.dataset.phase='waiting';this.video.currentTime=0;this.intro.pause();this.syncPlayback();}
  setEnabled(enabled){if(enabled&&!this.enabled){this.intro.currentTime=0;this.video.currentTime=0;this.phase='intro';this.el.dataset.phase='intro';this.mix=0;this.revealElapsed=null;}this.enabled=enabled;this.syncPlayback();}
  syncPlayback(){
    const r=this.el.getBoundingClientRect();this.visible=this.enabled&&!document.hidden&&!this.el.hidden&&r.height>0&&r.bottom>0&&r.top<innerHeight;
    if(!this.visible){this.video.pause();this.intro.pause();cancelAnimationFrame(this.frame);this.frame=0;this.lastTick=0;return;}
    const media=this.phase==='intro'?this.intro:this.video;
    if(media.paused&&!media.ended)media.play().then(()=>this.startVideo()).catch(()=>{if(this.visible){this.retry.textContent='播放现场';this.retry.hidden=false;}});else this.startVideo();
  }
  startVideo(){if(this.frame||!this.visible)return;this.lastTick=performance.now();const tick=now=>{this.frame=0;if(!this.visible||document.hidden)return;const dt=Math.min(80,now-this.lastTick);this.lastTick=now;
      if(this.revealElapsed!==null&&this.video.readyState>=2&&!this.video.paused){this.revealElapsed+=dt;const t=Math.min(1,this.revealElapsed/1600),e=t*t*(3-2*t);this.hfov=((innerWidth<760?26:56)+(innerWidth<760?32:22)*e)*RAD;this.pitch=(-4+1.5*e)*RAD;const b=Math.min(1,this.revealElapsed/850);this.mix=b*b*(3-2*b);if(b===1){this.phase='video';this.el.dataset.phase='video';}if(t===1)this.revealElapsed=null;}
      this.draw();this.frame=requestAnimationFrame(tick);};this.frame=requestAnimationFrame(tick);
  }
}
