import {translate} from './interface-language.js';

class MenuAudio extends HTMLElement {
  connectedCallback(){
    const scene=this.closest('.title-screen');
    const toggle=this.querySelector('button');
    const events=new AbortController();
    this.events=events;
    const on=(target,type,fn,capture=false)=>target.addEventListener(type,fn,{capture,signal:events.signal});
    const bed=new Audio('assets/menu/after-rain.mp3');
    this.bed=bed;
    bed.loop=true;
    bed.preload='auto';
    bed.volume=.85;
    let muted=localStorage.getItem('complex.menuMuted')==='true';
    let lastHover=-Infinity;
    const playing=()=>!muted&&!bed.paused&&!document.hidden;
    const update=()=>{
      toggle.dataset.audible=String(playing());
      const label=translate(playing()?'Выключить звук меню':'Включить звук меню');
      toggle.setAttribute('aria-label',label);
      toggle.title=label;
      toggle.setAttribute('aria-pressed',String(playing()));
    };
    const unlock=()=>{
      if(muted||document.hidden)return;
      if(bed.paused)bed.play().catch(update);
      const AudioAPI=window.AudioContext||window.webkitAudioContext;
      if(!AudioAPI)return;
      this.ctx??=new AudioAPI();
      if(this.ctx.state==='suspended')this.ctx.resume().catch(()=>{});
    };
    const tone=(frequency,end,duration,level,wave='sine')=>{
      const ctx=this.ctx;
      if(muted||document.hidden||ctx?.state!=='running')return;
      const osc=ctx.createOscillator(),env=ctx.createGain(),time=ctx.currentTime;
      osc.type=wave;
      osc.frequency.setValueAtTime(frequency,time);
      osc.frequency.exponentialRampToValueAtTime(end,time+duration);
      env.gain.setValueAtTime(.0001,time);
      env.gain.exponentialRampToValueAtTime(level,time+.008);
      env.gain.exponentialRampToValueAtTime(.0001,time+duration);
      osc.connect(env).connect(ctx.destination);
      osc.start(time);osc.stop(time+duration+.015);
      osc.onended=()=>{osc.disconnect();env.disconnect()};
    };
    const target=e=>e.target.closest('button:not(:disabled),a[href],select,input');
    on(scene,'pointerdown',e=>{if(!toggle.contains(e.target))unlock()},true);
    on(scene,'keydown',e=>{if(!e.repeat&&!toggle.contains(e.target))unlock()},true);
    const hover=e=>{
      const control=target(e);
      if(!control||e.relatedTarget instanceof Node&&control.contains(e.relatedTarget))return;
      const now=performance.now();
      if(now-lastHover<155)return;
      lastHover=now;
      if(playing()&&!this.ctx)unlock();
      tone(349,392,.092,.027);
    };
    on(scene,'pointerover',hover);
    on(scene,'focusin',hover);
    on(scene,'click',e=>{
      const control=target(e);
      if(!control||toggle.contains(e.target))return;
      tone(440,554,.135,.042);
      if(playing()&&control.matches('.title-actions a[href]')&&e.button===0&&
          !e.altKey&&!e.ctrlKey&&!e.shiftKey&&!e.metaKey){
        e.preventDefault();
        setTimeout(()=>location.assign(control.href),110);
      }
    },true);
    on(toggle,'click',()=>{
      muted=playing();
      localStorage.setItem('complex.menuMuted',String(muted));
      if(muted)bed.pause();else{unlock();tone(392,494,.13,.032)}
      update();
    });
    const buzz=e=>{
      const ctx=this.ctx;
      if(e.animationName!=='tube-current'||!playing()||ctx?.state!=='running')return;
      const noise=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*.15),ctx.sampleRate);
      const samples=noise.getChannelData(0);
      for(let i=0;i<samples.length;i++){
        const t=i/ctx.sampleRate;
        const contact=Math.exp(-65*t)+.45*Math.exp(-90*Math.abs(t-.061));
        samples[i]=(Math.random()*2-1)*contact*.052;
      }
      const spark=ctx.createBufferSource(),filter=ctx.createBiquadFilter();
      filter.type='bandpass';filter.frequency.value=860;filter.Q.value=.75;
      spark.buffer=noise;spark.connect(filter).connect(ctx.destination);
      spark.start();spark.onended=()=>{spark.disconnect();filter.disconnect()};
      tone(99,86,.12,.016,'triangle');
    };
    on(scene,'animationstart',buzz);on(scene,'animationiteration',buzz);
    on(bed,'playing',update);on(bed,'pause',update);
    on(document,'visibilitychange',()=>{
      if(document.hidden){bed.pause();this.ctx?.suspend().catch(()=>{})}
      else if(!muted){bed.play().catch(update);this.ctx?.resume().catch(()=>{})}
    });
    on(document,'interface-language',update);
    update();
    if(!muted&&!document.hidden)bed.play().catch(update);
  }
  disconnectedCallback(){
    this.events?.abort();
    this.bed?.pause();
    this.bed?.removeAttribute('src');
    this.bed?.load();
    const context=this.ctx;
    if(context)setTimeout(()=>context.close().catch(()=>{}),160);
    this.ctx=null;
  }
}
customElements.define('menu-audio',MenuAudio);
