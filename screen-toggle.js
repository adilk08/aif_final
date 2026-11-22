import {translate} from './interface-language.js';

class ScreenToggle extends HTMLElement {
  connectedCallback(){
    const button=document.createElement('button');
    button.type='button';
    button.className='screen-toggle';
    button.innerHTML='<span class="view-corners" aria-hidden="true"><i></i><i></i><i></i><i></i></span>';
    const hint=document.createElement('span');
    hint.className='screen-hint';
    hint.setAttribute('role','status');
    this.replaceChildren(button,hint);
    const update=()=>{
      const full=Boolean(document.fullscreenElement||document.webkitFullscreenElement);
      const label=translate(full?'Выйти из полного экрана':'На весь экран');
      button.setAttribute('aria-label',label);
      button.setAttribute('aria-pressed',String(full));
      button.title=label;
      hint.textContent='';
    };
    const events=new AbortController();
    this.events=events;
    for(const name of ['fullscreenchange','webkitfullscreenchange','interface-language']){
      document.addEventListener(name,update,{signal:events.signal});
    }
    update();
    button.onkeydown=e=>{if(e.key===' ')e.stopPropagation()};
    button.onclick=async()=>{
      try{
        if(document.fullscreenElement||document.webkitFullscreenElement){
          await (document.exitFullscreen||document.webkitExitFullscreen).call(document);
        }else{
          const root=document.documentElement;
          await (root.requestFullscreen||root.webkitRequestFullscreen).call(root);
        }
        update();
      }catch{
        hint.textContent=translate(matchMedia('(pointer:fine)').matches
          ?'Откройте игру в отдельной вкладке или нажмите F11.'
          :'Полный экран недоступен в этом браузере.');
      }
    };
    button.onblur=()=>{hint.textContent=''};
  }
  disconnectedCallback(){this.events.abort()}
}
customElements.define('screen-toggle',ScreenToggle);
