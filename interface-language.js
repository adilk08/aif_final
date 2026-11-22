import {labels} from './control-labels.js';

const choices=['ru','kk','en'];
let active=localStorage.getItem('complex.language')||'ru';
if(!choices.includes(active))active='ru';
export const language=()=>active;
const terms=new Map(labels.map(row=>[row[0].toLowerCase(),row]));
const quoted=labels.map(([word])=>word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).sort((a,b)=>b.length-a.length);
const pattern=new RegExp('(?<![\\p{L}])(?:'+quoted.join('|')+')(?![\\p{L}])','giu');
export function translate(text){
  if(active==='ru')return text;
  return text.replace(pattern,match=>{
    const item=terms.get(match.toLowerCase())[choices.indexOf(active)];
    return match.length>2&&match===match.toUpperCase()?item.toUpperCase():item;
  });
}

const eligible='button,a[href],label,option,[data-ui],.title-actions';
const originals=new WeakMap();
function localizeValue(owner,key,read,write){
  const current=read();
  if(!current)return;
  let fields=originals.get(owner);
  if(!fields){fields={};originals.set(owner,fields)}
  const prev=fields[key];
  const source=prev&&prev.shown===current?prev.source:current;
  const shown=translate(source);
  fields[key]={source,shown};
  if(current!==shown)write(shown);
}
function localize(el){
  if(el.closest('game-guide,[data-language],neon-sign')||el.matches('a.brand'))return;
  for(const key of ['title','aria-label']){
    localizeValue(el,key,()=>el.getAttribute(key),value=>el.setAttribute(key,value));
  }
  const walk=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);
  while(walk.nextNode()){
    const n=walk.currentNode;
    if(!n.parentElement.closest('svg'))localizeValue(n,'text',()=>n.data,value=>{n.data=value});
  }
}
function scan(root){
  if(root.nodeType===Node.TEXT_NODE){
    const el=root.parentElement?.closest(eligible);if(el)localize(el);
  }else if(root.nodeType===Node.ELEMENT_NODE){
    const enclosing=root.closest(eligible);
    if(enclosing)localize(enclosing);
    root.querySelectorAll(eligible).forEach(localize);
  }
}
function refresh(){
  scan(document.body);
  document.querySelectorAll('[data-language]').forEach(button=>{
    button.setAttribute('aria-pressed',String(button.dataset.language===active));
  });
  document.querySelectorAll('.title-screen').forEach(el=>el.lang=active);
}
document.addEventListener('click',event=>{
  const button=event.target.closest('[data-language]');
  if(!button||!choices.includes(button.dataset.language))return;
  active=button.dataset.language;
  localStorage.setItem('complex.language',active);
  refresh();
  document.dispatchEvent(new Event('interface-language'));
});
refresh();
new MutationObserver(records=>{
  for(const record of records){
    if(record.type==='childList'){
      for(const node of record.addedNodes){
        if(node.nodeType===1&&node.matches('.panel')&&node.querySelector('.title-screen'))refresh();
        else if(active!=='ru')scan(node);
      }
    }else if(active!=='ru')scan(record.target);
  }
}).observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['title','aria-label']});
