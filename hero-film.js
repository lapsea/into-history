// Wide inline film is centered on the artifact; the model stays mounted underneath.
export class HeroFilm {
  constructor(root,{onState=()=>{},onError=()=>{},onEnd=()=>{}}={}){
    this.root=root;this.layer=root.querySelector('#hero-film');this.video=root.querySelector('#hero-film-video');this.retry=root.querySelector('#hero-film-retry');this.active=false;this.token=0;this.onState=onState;this.onError=onError;this.onEnd=onEnd;
    this.video.muted=true;this.video.playsInline=true;
    this.video.addEventListener('loadedmetadata',()=>{if(this.active&&this.root.dataset.film==='storyteller'&&this.video.currentTime<.25)this.video.currentTime=.25;});
    root.querySelector('#hero-film-close').addEventListener('click',()=>this.stop());
    root.querySelector('#hero-film-pause').addEventListener('click',()=>{if(this.video.paused){this.userPaused=false;this.video.play().catch(()=>this.retry.hidden=false);}else{this.userPaused=true;this.video.pause();}this.updatePause();});
    this.retry.addEventListener('click',()=>{if(this.video.error)this.video.load();this.video.play().catch(()=>this.onError('视频暂时无法播放，请稍后重试'));});
    this.video.addEventListener('playing',()=>{if(!this.active)return;this.retry.hidden=true;this.layer.classList.add('is-visible');root.classList.add('is-awakening');this.layer.dataset.state='playing';this.updatePause();});
    this.video.addEventListener('pause',()=>this.updatePause());
    this.video.addEventListener('ended',()=>{if(!this.active)return;this.onEnd();this.stop();});
    this.video.addEventListener('error',()=>{if(this.active){this.retry.hidden=false;this.layer.classList.add('is-visible');this.layer.dataset.state='error';}});
    new IntersectionObserver(entries=>{this.inView=entries[0].isIntersecting;this.sync();},{threshold:.1}).observe(root);
    document.addEventListener('visibilitychange',()=>this.sync());
    this.inView=true;
  }
  updatePause(){const b=this.root.querySelector('#hero-film-pause');b.setAttribute('aria-label',this.video.paused?'播放视频':'暂停视频');b.querySelector('use').setAttribute('href',this.video.paused?'#i-play':'#i-pause');}
  sync(){if(!this.active)return;if(document.hidden||!this.inView)this.video.pause();else if(!this.userPaused&&!this.video.ended)this.video.play().catch(()=>{});}
  async toggle(artifact,id){if(this.active){this.stop();return;}this.active=true;const token=++this.token;this.userPaused=false;this.retry.hidden=true;this.layer.inert=false;this.layer.setAttribute('aria-hidden','false');this.layer.dataset.state='loading';this.root.dataset.film=id;this.video.src=artifact.awaken;this.video.muted=true;this.onState(true);
    try{await this.video.play();if(token!==this.token)return;}catch{if(token===this.token){this.layer.classList.add('is-visible');this.retry.hidden=false;}}
  }
  stop(immediate=false){if(!this.active)return;this.token++;this.active=false;this.video.pause();this.root.classList.remove('is-awakening');this.layer.classList.remove('is-visible');this.layer.inert=true;this.layer.setAttribute('aria-hidden','true');this.layer.dataset.state='closed';if(immediate){this.layer.style.transition='none';requestAnimationFrame(()=>this.layer.style.removeProperty('transition'));}this.onState(false);}
}
