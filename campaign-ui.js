import './duel.js';
import {instrumentBounds,drawInstrument} from './navigation-display.js';
const encounterView=document.createElement('duel-view');
import {Campaign,CAMPAIGN_KEY,labels} from './campaign-model.js';
import {DISTRICTS,UPGRADES,EVIDENCE} from './campaign-content.js';
import {actions,search} from './engine.js';
import {RELICS} from './mechanics.js';
import {icon,routeIcon,DialogueSession,DialogueVoice,SPEAKERS} from './campaign-presentation.js';
import {VOICE_MANIFEST} from './assets/voices/manifest.js';

const $=s=>document.querySelector(s),scene=$('#scene'),dialog=$('#dialog');
const names={attack:'Атака',heavy:'Сильный удар',pierce:'Пробитие',guard:'Защита',heal:'Лечение',repair:'Ремонт',boom:'Размах стрелы',stalled:'Привод остановлен'};
let c,selected=null,frame=0,timer=null,battleFx=null,dev=false,sound=false,audio,noticeTimer,activeWindow=true,speed=1;
let conversation=null,restoreFocus=null;
try{c=Campaign.load(localStorage.getItem(CAMPAIGN_KEY))}catch{try{const raw=localStorage.getItem(CAMPAIGN_KEY);if(raw)localStorage.setItem(CAMPAIGN_KEY+'Damaged',raw)}catch{}c=new Campaign()}
const voice=new DialogueVoice(VOICE_MANIFEST);
try{const prefs=JSON.parse(localStorage.getItem('neonRoutePreferences')||'{}');sound=!!prefs.sound;voice.setEnabled(prefs.voice)}catch{}
voice.onStateChange=state=>{const el=$('#voice-status');if(el){el.dataset.state=state;el.setAttribute('aria-label',state==='playing'?'Голос воспроизводится':state==='loading'?'Загрузка голоса':'Голос остановлен')}};
voice.onFailure=error=>{if(error?.name!=='NotAllowedError')notify('Голос недоступен. Реплика остаётся в субтитрах.')};
function savePreferences(){try{localStorage.setItem('neonRoutePreferences',JSON.stringify({sound,voice:voice.enabled}))}catch{}}
function backupAvailable(){try{return!!localStorage.getItem(CAMPAIGN_KEY+'BeforeRestart')}catch{return false}}
function persist(){try{localStorage.setItem(CAMPAIGN_KEY,c.save())}catch{notify('Не удалось сохранить прогресс в браузере.')}}
function notify(text){$('#notice').textContent=text;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('#notice').textContent='',3800)}
function beep(f=500){if(!sound)return;try{audio??=new AudioContext();const o=audio.createOscillator(),g=audio.createGain();o.frequency.value=f;g.gain.value=.025;o.connect(g);g.connect(audio.destination);o.start();g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.15);o.stop(audio.currentTime+.15)}catch{}}
function utilityButton(id,glyph,label){return `<button id="${id}" class="icon-button" aria-label="${label}" title="${label}">${icon(glyph)}</button>`}
function hud(){
  $('#vitals').innerHTML=`<span class="health-stat" title="Здоровье ${Math.ceil(c.player.hp)} из ${c.player.max}" aria-label="Здоровье ${Math.ceil(c.player.hp)} из ${c.player.max}">${icon('heart')}<b>${Math.ceil(c.player.hp)}</b><span class="health-track"><i style="width:${c.player.hp/c.player.max*100}%"></i></span></span><span class="energy-stat" aria-label="Энергия ${c.player.energy} из 3">${[0,1,2].map(i=>icon('bolt',i<c.player.energy?'charged':'empty')).join('')}</span><span title="Кредиты" aria-label="Кредиты ${c.player.coins}">${icon('coin')}<b>${c.player.coins}</b></span><span title="Зелья" aria-label="Зелья ${c.player.potions}">${icon('potion')}<b>${c.player.potions}</b></span>${c.devUsed?'<small class="test">DEV</small>':''}`;
  $('#voice').innerHTML=icon('headphones');$('#voice').setAttribute('aria-pressed',String(voice.enabled));
  $('#voice').title=voice.enabled?'Озвучка включена':'Включить озвучку';
  $('#sound').innerHTML=icon('soundwave');$('#sound').setAttribute('aria-pressed',String(sound));
}
function portrait(speaker){return SPEAKERS[speaker]?.portrait?'<img src="'+SPEAKERS[speaker].portrait+'" alt="'+SPEAKERS[speaker].name+'">':'<div class="aria-orb">'+icon('radio')+'<i></i><i></i></div>'}
function escapeText(text){return String(text).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}
function goalText(){return c.objective()}

function progress(){const tasks=c.chapter==='gardens'?[[c.flags.met,'person','Найти Ладу'],[c.flags.tape,'radio','Проверить плёнку'],[c.flags.keeper,'bolt','Передать ключ'],[c.flags.boss,'skull','Остановить Садовника'],[c.flags.rescued,'train','Забрать смену']]:c.chapter==='archive'?[[c.flags.met,'person','Найти Миру'],[c.flags.water,'anchor','Настроить насосы'],[c.flags.record,'book','Забрать реестр'],[c.flags.boss,'skull','Отключить Смотрителя'],[c.flags.rescued,'train','Спасти Миру']]:[[c.flags.met,'person','Найти Илью'],[c.flags.anchor,'anchor','Закрепить дорогу'],[c.flags.power,'bolt','Выбрать питание'],[c.flags.boss,'skull','Отключить Диспетчера'],[c.flags.rescued,'train','Спасти Илью']];return tasks.map(([done,glyph,title])=>'<span class="quest-step '+(done?'done':'')+'" title="'+title+'" aria-label="'+title+': '+(done?'выполнено':'не выполнено')+'">'+icon(done?'check':glyph)+'</span>').join('')}

function render(){closeModal(false);hud();selected=null;scene.dataset.area=c.area;document.body.dataset.district=c.chapter;document.body.dataset.water=c.flags.water||'';document.body.dataset.light=c.flags.light||'';if(c.area==='train')renderTrain();else renderWorld();renderChoice();queueEnemy()}
function launchDistrict(id){const first=!c.flagsOf(id)?.met;if(!c.depart(id))return;fogShade.fill(0);persist();render();if(first)openConversation([id==='gardens'?'gardenIntro':id==='archive'?'archiveIntro':'first'],[{text:'Начать разведку',glyph:'compass',run:closeModal}])}
function renderTrain(){
  const next=!c.completed('copper')?'copper':!c.completed('archive')?'archive':!c.completed('gardens')?'gardens':c.chapter;
  const ready=c.completed('gardens'),ilya=c.flagsOf('copper')?.rescued,mira=c.flagsOf('archive')?.rescued;
  scene.innerHTML = `
    <section class="carriage" aria-labelledby="carriage-title">
      <div class="carriage-heading">
        <span class="eyebrow">СТАНЦИЯ НОЛЬ</span>
        <h1 id="carriage-title">Аварийный состав</h1>
        <span class="station-status"><i></i>${mira?'Медотсек работает':ilya?'Мастерская открыта':'Ожидание питания'}</span>
      </div>
      <div class="hub-counters">
        <span title="Фрагменты адреса">${icon('compass')} ${c.fragments}/4</span>
        <span title="Спасённые пассажиры">${icon('person')} ${c.passengers}</span>
      </div>
      <div class="carriage-stations" aria-label="Отсеки поезда">
        <button class="station-pin radio-pin" id="talk">${ilya?portrait(mira?'mira':'ilya'):icon('radio')}<span>${mira?'Пассажиры':ilya?'Илья':'Радиосвязь'}</span></button>
        <button class="station-pin bench-pin" id="workshop" ${ilya?'':'disabled'} aria-label="${ilya?'Мастерская':'Мастерская · Нужен механик'}">${icon(ilya?'wrench':'lock')}<span>Мастерская</span></button>
        <button class="station-pin lines-pin" id="destination">${icon('compass')}<span>Карта линий</span></button>
      </div>
      <div class="departure-board">
        <div><span class="eyebrow">${DISTRICTS[next].name}</span><h2>${ready?'Остались неуслышанные сигналы':next==='gardens'?'Принять сигнал оранжереи':next==='archive'?'Найти второй адрес':goalText()}</h2></div>
        <button class="primary" id="depart">${icon('train')} ${ready?'Вернуться в район':'Выйти в район'}</button>
      </div>
    </section>
    <div class="hub-footer"><button id="dossier" class="text-button">${icon('book')} Досье · ${c.evidence.length}</button><button id="replay" class="text-button">Новое путешествие</button>${backupAvailable()?'<button id="restore-chapter" class="text-button">Вернуть прошлое</button>':''}<a href="index.html">Классический режим</a></div>
    ${ready?'<button id="fourth-signal" class="text-button">Прослушать сигнал · Район повторений</button>':''}`;
  $('#depart').onclick=()=>launchDistrict(next);
  $('#fourth-signal')?.addEventListener('click',()=>openConversation([c.flagsOf('gardens').keeper==='lada'?'gardenCallLada':'gardenCallDriver','gardenTeaser'],[{text:'Отключить радио',glyph:'radio',run:closeModal}]));
  $('#talk').onclick=()=>openConversation(ready?['gardenAboard',...(c.flagsOf('gardens').tomato?[c.flagsOf('gardens').tomato==='share'?'gardenShare':'gardenSeeds']:[])]:mira?['miraAboard','archiveReply']:ilya?['thanks',c.completed('copper')?(c.flagsOf('copper').power==='train'?'ilyaArchiveTrain':'ilyaArchiveSuppress'):'hint']:['radio','signal'],[{text:'До связи',glyph:'check',run:closeModal}]);
  $('#workshop').onclick=showWorkshop;$('#destination').onclick=showLines;$('#dossier').onclick=showJournal;
  $('#replay').onclick=()=>showModal('Новое путешествие','Все три главы начнутся заново. Текущее путешествие останется в резервной точке.',[{text:'Начать заново',glyph:'replay',run:()=>{try{localStorage.setItem(CAMPAIGN_KEY+'BeforeRestart',c.save());c=new Campaign();persist();render()}catch{notify('Не удалось создать резервную точку.')}}},{text:'Отмена',run:closeModal}]);
  $('#restore-chapter')?.addEventListener('click',()=>{try{const previous=Campaign.load(localStorage.getItem(CAMPAIGN_KEY+'BeforeRestart'));localStorage.setItem(CAMPAIGN_KEY+'BeforeRestart',c.save());c=previous;persist();render();notify('Прошлое путешествие восстановлено.')}catch{notify('Резервная точка недоступна.')}});
}
function showLines(){
  const stops=Object.entries(DISTRICTS).map(([id,d])=>{
    const open=c.unlocked(id);
    return `<button class="line-stop ${open?'current':''}" data-line="${id}" ${open?'':'disabled'}>
      ${icon(c.completed(id)?'check':open?'compass':'lock')}<b>${d.name}</b>
      <small>${c.completed(id)?'Вернуться за находками':open?'Линия доступна':id==='gardens'?'Сначала завершите Затопленный архив':'Сначала восстановите Медный узел'}</small></button>`;
  });
  for(const [name,status] of [['Район повторений','Сигнал потерян']]){
    stops.push(`<div class="line-stop closed">${icon('lock')}<b>${name}</b><small>${status}</small></div>`);
  }
  showModal('Карта линий','<div class="line-map">'+stops.join('')+'</div>',[{text:'В поезд',glyph:'train',run:closeModal}]);
  dialog.querySelectorAll('[data-line]').forEach(b=>b.onclick=()=>launchDistrict(b.dataset.line));
  dialog.querySelector('.line-stop.current')?.focus({preventScroll:true});
}
function showWorkshop(){showModal('Мастерская Ильи',`<div class="equipment-summary"><span>${icon('heart')}${c.player.max}</span><span>${icon('wrench')}${c.player.atk}</span><span>${icon('guard')}${c.player.armor}</span><span>${icon('coin')}${c.player.coins}</span></div><p>Улучшения остаются с поездом во всех районах.</p>`,[...Object.entries(UPGRADES).map(([key,u])=>({text:u.name,detail:c.upgrades[key]>=u.max?'Максимум · '+u.max+'/'+u.max:u.detail+' · '+u.cost*(c.upgrades[key]+1)+' CR · '+c.upgrades[key]+'/'+u.max,image:key==='hull'?'heal':key==='blade'?'heavy':'guard',disabled:c.upgrades[key]>=u.max||c.player.coins<u.cost*(c.upgrades[key]+1),run:()=>{if(c.upgrade(key)){persist();hud();showWorkshop();beep(380)}}})),{text:'Зелье · 4 CR',glyph:'potion',disabled:c.player.coins<4,run:()=>{if(c.resupply()){persist();hud();showWorkshop()}}},{text:'В поезд',glyph:'train',run:closeModal}])}
function showJournal(){showModal('Досье проводника',`<div class="journal-summary"><span>${icon('compass')}${c.fragments}/4</span><span>${icon('person')}${c.passengers}</span></div><p class="dossier-question">АРИАДНА удерживает город — или удерживает что-то за его пределами?</p><div class="evidence-grid">${c.evidence.length?c.evidence.map(id=>{const e=EVIDENCE[id];return '<details class="evidence-card"><summary>'+icon('book')+'<span>'+e.title+'<small>'+e.source+'</small></span></summary><p>'+e.text+'</p></details>'}).join(''):'<p>Пока нет записей. Ищите сигналы книг и сломанного курьера.</p>'}</div><details class="travel-log"><summary>Журнал путешествия</summary><ol class="journal-list">${c.notes.map(note=>'<li>'+escapeText(note)+'</li>').join('')}</ol></details>`,[{text:'Закрыть',glyph:'book',run:closeModal}])}
const objectIcon=o=>({operator:'person',switch:'bolt',fan:'radio',relay:'wrench',tomato:'heart',home:'train',mechanic:'person',archivist:'person',anchor:'anchor',power:'bolt',boss:'skull',enemy:'guard',pump:'anchor',record:'book',cache:'potion',drone:'wrench'})[o.type];
const objectName=o=>c.chapter==='gardens'&&o.key==='gardener'&&c.flags.boss?'Посадочная':o.label||(o.key==='anchor-safe'?'Служебная опора':o.key==='anchor-short'?'Короткая линия':o.type==='mechanic'?'Илья':o.type==='archivist'?'Мира':o.type==='home'?'Поезд':o.type==='boss'?c.district.boss:o.type==='enemy'?['Страж','Берсерк','Техник'][o.kind]:labels[o.type]);

function renderWorld(){
  scene.innerHTML=`<div class="expedition-heading"><div><span class="eyebrow">РАЙОН ${c.district.number}</span><h1>${c.district.name}</h1></div><div class="quest-progress" aria-label="Прогресс экспедиции">${progress()}</div></div><div class="world-layout"><section class="map-column"><div class="map-box"><span class="map-label">${icon('compass')} РАЗВЕДКА</span><canvas id="map" aria-label="Карта ${c.district.name}"></canvas><div class="map-task">${icon('compass')}<span id="objective">${goalText()}</span></div></div><div class="route-dock"><p id="route-title">Выберите сигнал на карте</p><div id="routes" class="navigation"></div></div><div class="world-controls"><button id="interact" class="primary" aria-label="Взаимодействовать">${icon('person')} Взаимодействовать <kbd>E</kbd></button><div class="movement-hint"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd><span>открытая местность</span></div><button id="drink" class="icon-button" aria-label="Выпить зелье" title="Зелье · Q">${icon('potion')}</button><button id="stop" class="icon-button" aria-label="Остановить маршрут" title="Стоп · Space">${icon('stop')}</button><button id="speed" class="icon-button" aria-label="Скорость движения">×${speed}</button><div class="dpad">${[['↑',-25],['←',-1],['↓',25],['→',1]].map(([s,d])=>`<button data-step="${d}" aria-label="Шаг ${s}">${s}</button>`).join('')}</div></div></section><aside class="signal-dock"><h2>Сигналы</h2><div class="signal-list">${c.objects.filter(o=>c.active(o)).map(o=>`<button data-target="${o.id}" class="signal-tile ${o.type}" aria-label="${objectName(o)}" title="${objectName(o)}"><span>${['operator','mechanic','archivist'].includes(o.type)?portrait(o.type==='operator'?'lada':o.type==='mechanic'?'ilya':'mira'):icon(objectIcon(o))}</span><small>${objectName(o)}</small></button>`).join('')}</div><button class="text-button" id="navigation-help">${icon('help')} Как идти?</button></aside></div>`;
  $('#map').onclick=mapClick;document.querySelectorAll('[data-target]').forEach(b=>b.onclick=()=>selectTarget(+b.dataset.target));
  $('#interact').onclick=()=>{const o=c.objectAt();if(o){c.interact(o.key);persist();renderChoice();queueEnemy()}};
  $('#stop').onclick=stopRoute;$('#drink').onclick=()=>{if(c.drink()){persist();updateWorld();beep(520);notify('Восстановлено до 25 HP.')}else notify(c.player.potions?'Здоровье полное.':'Нет зелий.');};
  $('#speed').onclick=()=>{speed=speed===1?2:1;$('#speed').textContent='×'+speed};
  $('#navigation-help').onclick=showHelp;
  document.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>manual(+b.dataset.step));drawMap();updateWorld();
}
function updateWorld(){hud();if(!$('#objective'))return;if(c.flags.boarding)$('#route-title').textContent='Поезд подходит к посадочной';else if(!c.route.length&&!$('#routes').children.length)$('#route-title').textContent='Выберите следующий сигнал';$('#objective').textContent=goalText();const o=c.objectAt();$('#interact').innerHTML=icon(o?objectIcon(o):'person')+(o?objectName(o):'Подойти к сигналу')+' <kbd>E</kbd>';$('#interact').disabled=!o||!!c.flags.boarding;}
function mapClick(e){
  if(!dialog.hidden||dev)return;
  const {r,sx,sy,ox,oy}=instrumentBounds(e.currentTarget);
  const x=Math.floor((e.clientX-r.left-ox)/sx),y=Math.floor((e.clientY-r.top-oy)/sy);
  if(x>=0&&y>=0&&x<25&&y<25)selectTarget(y*25+x);
}
function selectTarget(id){
  if(!dialog.hidden||dev||c.flags.boarding||!c.preview(id,'dfs'))return;selected=id;const o=c.objects.find(o=>o.id===id&&c.active(o));if(o&&id===c.position){c.interact(o.key);persist();renderChoice();queueEnemy();return}$('#route-title').textContent=(o?objectName(o):'Точка на карте')+' · выберите маршрут';
  $('#routes').innerHTML=['dfs','bfs','ucs','astar'].map(alg=>{const p=c.preview(id,alg),cost={dfs:0,bfs:2,ucs:3,astar:3}[alg],name={dfs:'Разведка',bfs:'Короткий',ucs:'Бережный',astar:'Навигатор'}[alg];return `<button data-alg="${alg}" class="route-card" aria-label="${alg==='astar'?'A*':alg.toUpperCase()}: ${name}, ${cost} кредитов, ${p.path.length-1} шагов, ${p.loss.toFixed(1)} здоровья" title="${p.visits.length} исследованных узлов · ${p.ms.toFixed(2)} мс" ${p.path.length<2||c.player.coins<cost?'disabled':''}>${routeIcon(alg)}<span><b>${name}</b><small>${alg==='astar'?'A*':alg.toUpperCase()}</small></span><em>${cost?cost+' CR':'Бесплатно'}</em><div class="route-stats"><span>${icon('steps')}${Math.max(0,p.path.length-1)}</span><span>${icon('heart')}${p.loss<.05?'0':'−'+p.loss.toFixed(1)}</span></div></button>`}).join('');
  document.querySelectorAll('[data-alg]').forEach(b=>b.onclick=()=>{if(c.travel(id,b.dataset.alg)){persist();$('#routes').innerHTML='';$('#route-title').textContent='Маршрут запущен · Space — остановить';updateWorld();beep()}});drawMap();
}

function activateOverlay(mode){if(dialog.hidden)restoreFocus=document.activeElement;scene.inert=true;$('header').inert=true;dialog.className=mode;dialog.hidden=false;}
function showModal(title,text,opts){voice.stop();conversation=null;activateOverlay('modal-mode');dialog.innerHTML=`<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><h2 id="modal-title">${title}</h2><div class="modal-copy">${text}</div><div class="options">${opts.map((o,i)=>`<button data-option="${i}" ${o.disabled?'disabled':''}>${o.image?`<img class="reward-art" src="assets/sector/${o.image}.webp" alt="">`:o.glyph?icon(o.glyph):''}<span>${o.text}</span>${o.detail?`<small>${o.detail}</small>`:''}</button>`).join('')}</div></div>`;dialog.querySelectorAll('[data-option]').forEach(b=>b.onclick=opts[+b.dataset.option].run);dialog.querySelector('button:not(:disabled)')?.focus({preventScroll:true})}
let fanEffect=null,fanCaptionTimer=null;
function stopFan(){fanEffect?.pause();fanEffect=null;clearTimeout(fanCaptionTimer)}
function closeModal(restore=true){stopFan();voice.stop();conversation=null;dialog.hidden=true;dialog.className='';dialog.innerHTML='';scene.inert=false;$('header').inert=false;if(restore&&restoreFocus?.isConnected)restoreFocus.focus({preventScroll:true});restoreFocus=null;}
function openConversation(ids,options){voice.stop();conversation=new DialogueSession(ids,options);activateOverlay('dialogue-mode');paintConversation()}
function paintConversation(){
  const session=conversation,frame=session.current,speaker=SPEAKERS[frame.speaker];
  dialog.innerHTML=`<div class="conversation" role="dialog" aria-modal="true" aria-labelledby="speaker-name" aria-describedby="spoken-line"><div class="portrait ${frame.speaker}">${portrait(frame.speaker)}</div><div class="conversation-body"><div class="speaker-row"><div><h2 id="speaker-name">${speaker.name}</h2><small>${speaker.role}</small><span id="voice-status" class="voice-status" data-state="idle" aria-label="Голос остановлен"><i></i><i></i><i></i></span></div><div class="conversation-tools">${utilityButton('repeat-line','replay','Повторить реплику')}<button id="dialogue-voice" class="icon-button" aria-label="Озвучка диалога" aria-pressed="${voice.enabled}" title="${voice.enabled?'Выключить озвучку':'Включить озвучку'}">${icon(voice.enabled?'speaker':'muted')}</button></div></div><p id="spoken-line" aria-live="polite">${frame.text}</p><div class="dialogue-bottom"><span class="page-dots" aria-label="Реплика ${session.index+1} из ${session.frames.length}">${session.frames.map((_,i)=>`<i class="${i===session.index?'current':''}"></i>`).join('')}</span><div class="dialogue-options">${session.last?session.options.map((o,i)=>`<button data-answer="${i}" ${o.disabled?'disabled':''} class="${i===0?'primary':''}">${o.glyph?icon(o.glyph):''}<span>${o.text}</span>${o.detail?`<small>${o.detail}</small>`:''}</button>`).join(''):`<button id="next-line" class="primary">Далее ${icon('arrow')}</button>`}</div></div></div></div>`;
  $('#next-line')?.addEventListener('click',()=>{if(session.advance())paintConversation()});
  dialog.querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>session.choose(+b.dataset.answer));
  $('#repeat-line').onclick=()=>{if(!voice.enabled){voice.setEnabled(true);savePreferences();hud();$('#dialogue-voice').setAttribute('aria-pressed','true');$('#dialogue-voice').innerHTML=icon('headphones')}voice.play(frame.id)};
  $('#dialogue-voice').onclick=()=>{voice.setEnabled(!voice.enabled);savePreferences();hud();$('#dialogue-voice').setAttribute('aria-pressed',String(voice.enabled));$('#dialogue-voice').innerHTML=icon(voice.enabled?'speaker':'muted');if(voice.enabled)voice.play(frame.id)};
  (session.last?dialog.querySelector('[data-answer]:not(:disabled)'):$('#next-line'))?.focus({preventScroll:true});
  if(navigator.userActivation?.hasBeenActive!==false)voice.play(frame.id);
}
function resolve(action){const completed=c.flags.complete,courier=c.choice?.type==='drone'&&action==='repair';if(c.resolve(action)){persist();beep();render();if(!completed&&c.flags.complete)openConversation(c.chapter==='gardens'?['gardenArrival','gardenAboard']:c.chapter==='archive'?['archiveArrival','archiveReply']:['arrival'],[{text:'К поезду',glyph:'train',run:closeModal}]);else if(courier)openConversation(['courierMemory'],[{text:'Продолжить',glyph:'check',run:closeModal}])}}
function renderChoice(){
  if(c.battle){conversation=null;voice.stop();activateOverlay('battle-mode');renderBattle();return}
  const q=c.choice;if(!q){closeModal(false);return}
  const later={text:'Позже',glyph:'close',run:()=>resolve('close')};
  if(c.chapter==='gardens'&&gardenChoice(q,later))return;
  if(q.type==='mechanic')openConversation(c.flags.anchor?['rejoin']:c.flags.met?['anchor']:['meet','anchor','scout'],[{text:c.flags.anchor?'Пойдём':c.flags.met?'Договорились':'Принять модуль',glyph:'person',run:()=>resolve('meet')},later]);
  if(q.type==='anchor')openConversation([q.key==='anchor-safe'?'safe':'short'],[{text:'Установить якорь',glyph:'anchor',disabled:!c.flags.met||!!c.flags.anchor,detail:c.flags.met?'Одна опора на всю главу':'Сначала найдите Илью',run:()=>resolve('install')},later]);
  if(q.type==='power')openConversation(['power'],[{text:'Подавить охрану',glyph:'guard',detail:'Босс: 64 HP · 9 урона · 0 брони',run:()=>resolve('suppress')},{text:'Питание поезду',glyph:'train',detail:'Босс: 84 HP · 11 урона · 3 брони; награда +3 урона',run:()=>resolve('train')},later]);
  if(q.type==='home')openConversation(c.chapter!=='copper'?['home']:[c.companion!==null&&!c.flags.rescued?(c.flags.boss?'final':'aboard'):'home'],[{text:'В поезд',glyph:'train',run:()=>resolve('return')},{text:'Остаться',glyph:'compass',run:()=>resolve('close')}]);
  if(q.type==='locked')openConversation([c.chapter==='gardens'?'gardenLocked':c.chapter==='archive'?'archiveLocked':'locked'],[{text:'Понятно',glyph:'check',run:()=>resolve('close')}]);
  if(q.type==='defeat')openConversation(['defeat'],[{text:'Продолжить',glyph:'train',detail:'Потеряно до 8 CR',run:()=>resolve('close')}]);
  if(q.type==='archivist')openConversation(c.flags.met?['miraRejoin']:['miraMeet','miraDoubt'],[{text:'Идём вместе',glyph:'person',run:()=>resolve('meet')},later]);
  if(q.type==='pump')openConversation(['pump'],[{text:c.flags.pumps.length===2?'Выбрать режим':'Запустить насос',glyph:'anchor',disabled:!c.flags.met||c.flags.pumps.includes(q.key)&&c.flags.pumps.length<2,detail:!c.flags.met?'Сначала найдите Миру':c.flags.pumps.length+' / 2 запущено',run:()=>resolve(c.flags.pumps.length===2?'configure':'activate')},later]);
  if(q.type==='water')openConversation(['water'],[{text:'Осушить коридоры',glyph:'steps',detail:'Путь без опасных покрытий · босс 106 HP / 12 урона',run:()=>resolve('drain')},{text:'Закрыть шлюзы',glyph:'guard',detail:'Вода остаётся · босс 86 HP / 11 урона / 0 брони',run:()=>resolve('seal')},later]);
  if(q.type==='record'){const locked=q.key==='register'&&!c.flags.water;openConversation([locked?'registerLocked':q.key==='boxes'?'gardenBoxes':q.key],[{text:'Сохранить запись',glyph:'book',detail:locked?'Сначала настройте насосы':'+4 CR · новая находка в досье',disabled:locked,run:()=>resolve('read')},later])}
  if(q.type==='cache')openConversation([c.chapter==='gardens'?'gardenMeds':c.chapter==='archive'?'archiveSupplies':'supplies'],[{text:'Лекарства',glyph:'potion',detail:'2 зелья · до +20 HP',run:()=>resolve('supplies')},{text:'Запчасти',glyph:'coin',detail:'+10 CR',run:()=>resolve('salvage')},later]);
  if(q.type==='drone')openConversation(['courier'],[{text:'Починить',glyph:'wrench',detail:'−4 CR · реликвия Щит и запись',disabled:c.player.coins<4,run:()=>resolve('repair')},{text:'Разобрать',glyph:'coin',detail:'+8 CR · память будет потеряна',run:()=>resolve('salvage')},later]);
  if(q.type==='loot'){
    const loot=()=>showModal('Выберите трофей','<span class="loot-summary">+8 CR · энергия восстановлена · до +8 HP</span>',[{text:'Урон +2',image:'heavy',run:()=>resolve('attack')},{text:'Броня +1',image:'guard',run:()=>resolve('armor')},{text:'Здоровье +25',image:'heal',run:()=>resolve('heal')},...Object.entries(RELICS).filter(([k])=>!c.player.passives[k]).slice(0,1).map(([k,v])=>({text:v.name,detail:v.text,image:k==='vampirism'?'vampirism':k==='scout'?'scout':k==='shield'?'guard':'pierce',run:()=>resolve(k)}))]);
    if(q.boss)openConversation([c.chapter==='gardens'?'gardenBoss':c.chapter==='archive'?'archiveBoss':'boss'],[{text:'Забрать трофей',glyph:'coin',run:loot}]);else loot();
  }
}
function gardenChoice(q,later){
  const f=c.flags,reserve=c.flagsOf('copper')?.power==='train';
  const button=(text,glyph,action,disabled=false,detail='')=>({text,glyph,disabled,detail,run:()=>resolve(action)});
  switch(q.type){
    case 'operator':
      openConversation(['gardenTape','gardenMeet','gardenPromise',c.flagsOf('archive')?.water==='drain'?'gardenDrain':'gardenLift'],[button('Помочь смене','person','meet'),later]);break;
    case 'switch':
      openConversation(['gardenSwitch',reserve?'gardenReserve':'gardenPatrol'],[button('Тёплая галерея','bolt','warm',!f.met,'Свет у посадочной'),button('Холодная галерея','bolt','cold',!f.met,'Питание вентиляционной'),later]);break;
    case 'fan': {
      const listen=()=>{
        stopFan();
        openConversation(['gardenListen'],[button('Сохранить запись','book','listen'),later]);
      };
      const start=()=>{
        showModal('Вентиляционная','<p id="fan-caption" role="status">Вентилятор затихает…</p><div class="fan-wave" aria-hidden="true"></div>',[{text:'Перейти к записи',glyph:'arrow',run:listen}]);
        if(sound){fanEffect=new Audio('assets/voices/garden-fan.mp3');fanEffect.volume=.48;fanEffect.play().catch(()=>{});}
        fanCaptionTimer=setTimeout(()=>{const el=$('#fan-caption');if(el)el.textContent='Два звонких касания ложки о стакан.';fanCaptionTimer=setTimeout(listen,3850)},5150);
      };
      const on=!!f.light&&(reserve||f.light==='cold');
      openConversation(['gardenFan','gardenTape'],[{text:'Прислушаться',detail:on?'9 секунд':'Включите холодный свет у пульта',glyph:'radio',disabled:!on,run:start},later]);break;
    }
    case 'relay':
      openConversation(['gardenKey'],[button('Передать Ладе','person','lada',!f.tape,'Голос Лады'),button('Оставить себе','radio','driver',!f.tape,'Голос проводника'),later]);break;
    case 'tomato':
      openConversation(['gardenTomato'],[button('Разделить на шестерых','heart','share'),button('Оставить на семена','book','seeds'),later]);break;
    case 'dispatch':
      openConversation([f.keeper==='lada'?'gardenCallLada':'gardenCallDriver','gardenBoard'],[button('Подать состав','train','call'),later]);break;
    case 'boarding':
      openConversation([f.keeper==='lada'?'gardenCallLada':'gardenCallDriver'],[button('Посадить смену','train','board')]);break;
    default:return false;
  }
  return true;
}
function showHelp(){
  if(!dialog.hidden)return;
  showModal('Как играть','<game-guide></game-guide>',[{text:'Вернуться в игру',glyph:'check',run:closeModal}]);
  dialog.querySelector('#modal-title').setAttribute('data-ui','');
}



const fogShade=Array(625).fill(0);let mapFrame=0;
function drawMap(){
  const canvas=$('#map');
  if(canvas)drawInstrument(canvas,c,selected,fogShade);
}
function battleEffect(before,after,who,act){const hit=before[1-who].hp-after[1-who].hp,heal=after[who].hp-before[who].hp;return {who,action:act,target:1-who,hit:Math.max(0,hit),heal:Math.max(0,heal),symbol:act==='guard'?'🛡':act==='repair'?'⚙':'',at:performance.now()}}
function renderBattle(){const b=c.battle,[p,e]=b.s,trait=b.key==='gardener'?'Каждый третий ход погрузчик поднимает стрелу. Защита или пробитие останавливают привод. При 40% HP урон растёт.':b.boss?(c.chapter==='archive'?(c.flags.water==='seal'?'Шлюзы изолированы. Смотритель ослаблен. ':'Коридоры осушены. Смотритель работает на полной мощности. '):(c.flags.power==='suppress'?'Помехи распределителя ослабляют Диспетчера. ':'Питание направлено поезду; охрана работает на полной мощности. '))+(e.phase2?'Фаза II: урон повышен.':'При 40% HP — вторая фаза.'):e.role==='sentinel'?(e.charged?'Заряд +5! Пробитие снимет заряд.':'Защита заряжает следующий удар.'):e.role==='berserker'?'На половине HP урон возрастает на 3.':e.repairing?'Ремонт готов. Прервите его сильным ударом или пробитием.':'Техник может подготовить один ремонт.';dialog.hidden=false;dialog.innerHTML=`<div class="modal" role="dialog" aria-modal="true"><div class="battle-top"><div><span class="eyebrow">ТАКТИЧЕСКИЙ КОНТАКТ</span><h2>${b.boss?c.district.boss:['Страж','Берсерк','Техник'][e.role==='sentinel'?0:e.role==='berserker'?1:2]}</h2>${e.hp} / ${e.max} HP · броня ${e.armor}</div><div class="intent">Следующий ход<br><b>${names[b.intent]}</b>${b.intent==='boom'?'<small>Защита / Пробитие</small>':''}</div></div><details class="battle-trait"><summary>Особенность</summary><p>${trait}</p></details><div class="combat-stage"><div id="encounter-view"></div><div class="duel-vitals">${[p,e].map((v,i)=>`<span>${i?(b.boss?c.district.boss:'Охрана'):'Проводник'} <b>${Math.ceil(v.hp)} / ${v.max}</b><meter min="0" max="${v.max}" value="${v.hp}" aria-label="Здоровье"></meter></span>`).join('')}</div></div><div class="battle-cards">${['attack','heavy','pierce','guard','heal'].map(a=>`<button data-act="${a}" ${b.pending||!actions(b.s,0).includes(a)?'disabled':''}><img src="assets/sector/${a}.webp" alt=""><b>${names[a]}</b><small>${({attack:'Урон '+p.atk+' · +1 энергия',heavy:'Урон '+Math.round(p.atk*1.8)+' · −2 энергии',pierce:'Игнорирует броню · −1',guard:'Половина урона · +2',heal:'+25 HP · 1 зелье'})[a]}</small></button>`).join('')}</div>${c.chapter!=='copper'?`<button id="crew-support" class="crew-support" ${c.supportAvailable?'':'disabled'}>${icon('radio')} Илья · ${c.supportUsed?'помощь использована':c.flagsOf('copper')?.power==='suppress'?'щит и +1 энергия':'+18 HP'}<small>Один раз за выход · без траты хода</small></button>`:''}<p class="battle-log">${b.log.slice(-2).map(s=>s.replace(/attack|heavy|pierce|guard|heal|repair|boom|stalled/g,v=>names[v])).join('<br>')}</p><details class="ai-details"><summary>AI-анализ</summary><small>Minimax / Alpha-Beta · ${b.metrics.nodes} узлов · ${b.metrics.cuts} отсечений</small></details></div>`;
  $('#encounter-view').append(encounterView);
  encounterView.configure(b.boss?(c.chapter==='gardens'?'gardener':c.chapter==='archive'?'warden':'dispatcher'):e.role,c.chapter,battleFx);
  $('#crew-support')?.addEventListener('click',()=>{const before=structuredClone(c.battle.s);if(c.support()){battleFx=battleEffect(before,c.battle.s,0,'guard');persist();hud();renderBattle()}});dialog.querySelectorAll('[data-act]').forEach(btn=>btn.onclick=()=>{const active=c.battle,before=structuredClone(active.s);c.playerAct(btn.dataset.act);battleFx=battleEffect(before,active.s,0,btn.dataset.act);if(!c.battle)endEncounter(battleFx);persist();hud();renderChoice();queueEnemy();beep(650)})}
function endEncounter(event){
  encounterView.configure(encounterView.foe,c.chapter,event);
  encounterView.finishBeat();
  battleFx=null;
}
function queueEnemy(){if(timer||!c.battle?.pending||dev)return;const b=c.battle;timer=setTimeout(()=>{timer=null;if(c.battle===b&&!dev){const before=structuredClone(b.s),act=b.intent;c.enemyAct();battleFx=battleEffect(before,b.s,1,act);if(!c.battle)endEncounter(battleFx);persist();if(c.battle){hud();renderBattle()}else render()}else queueEnemy()},550)}

function developer(){
  dev=!dev;$('#developer').hidden=!dev;if(!dev){if($('#fan-caption'))renderChoice();queueEnemy();return}
  $('#developer').innerHTML='<h2>DEV / '+c.district.name+'</h2><p>Изменения тестовые. Кнопка возврата восстановит всё путешествие.</p><div class="dev-options"><button data-dev="resources">HP и ресурсы</button><button data-dev="map">Открыть карту</button><button data-dev="archive">Открыть Архив</button><button data-dev="gardens">Открыть Сады</button><button data-dev="win">Победить в бою</button>'+c.objects.filter(o=>c.active(o)).map(o=>'<button data-dev="warp:'+o.key+'">'+objectName(o)+'</button>').join('')+'<button data-dev="restore">Вернуть до DEV</button><button data-dev="close">Закрыть DEV</button></div>';
  $('#developer').querySelectorAll('[data-dev]').forEach(b=>b.onclick=()=>{
    const a=b.dataset.dev;if(a==='close'){developer();return}
    if(a==='restore'){try{c=Campaign.load(localStorage.getItem(CAMPAIGN_KEY+'BeforeDev'));dev=false;$('#developer').hidden=true;persist();render();notify('Сохранение до DEV восстановлено.')}catch{notify('Нет корректной точки возврата.')}return}
    if(!c.devUsed){try{localStorage.setItem(CAMPAIGN_KEY+'BeforeDev',c.save())}catch{notify('Не удалось создать точку возврата.');return}c.devUsed=true}
    if(a==='resources'){c.player.hp=c.player.max;c.player.energy=3;c.player.coins+=100;c.player.potions+=5;if(c.battle)Object.assign(c.battle.s[0],c.player)}
    else if(a==='map'){c.explored.fill(true);c.visited.fill(true);c.firstRoute=true;c.reveal(false)}
    else if(a==='archive'||a==='gardens'){c.battle=null;c.choice=null;c.route=[];c.area='train';if(c.chapter==='copper'){Object.assign(c.flags,{met:true,anchor:'anchor-safe',power:c.flags.power||'suppress',boss:true,rescued:true,complete:true});c.done=[...new Set([...c.done,'anchor-safe','power','dispatcher'])];c.companion=null;c.player.passives.scout=true}c.depart('archive');if(a==='gardens'){Object.assign(c.flags,{met:true,pumps:['pump-west','pump-east'],water:c.flags.water||'seal',record:true,rescued:true,boss:true,complete:true});c.done=[...new Set([...c.done,'pump-west','pump-east','register','warden'])];c.companion=null;c.area='train';c.depart('gardens')}}
    else if(a==='win'&&c.battle){c.battle.s[1].hp=0;c.victory()}
    else if(a.startsWith('warp:')){if(c.area==='train')c.depart();c.battle=null;c.choice=null;c.route=[];const o=c.objects.find(o=>o.key===a.slice(5));if(o){c.position=o.id;c.visited[o.id]=true;c.firstRoute=true;c.reveal(true);c.interact(o.key)}}
    persist();dev=false;$('#developer').hidden=true;render();
  });
}

function stopRoute(){c.route=[];selected=null;if($('#routes'))$('#routes').innerHTML='';if($('#route-title'))$('#route-title').textContent='Маршрут остановлен · выберите цель';persist();drawMap();notify('Маршрут остановлен.')}
function manual(delta){if(dev||!dialog.hidden||c.battle||c.choice||c.area==='train')return;const id=c.position+delta;c.route=[];c.routeGoal=null;if($('#routes'))$('#routes').innerHTML='';if($('#route-title'))$('#route-title').textContent='Выберите следующую цель';persist();if(!c.move(id,false))notify(c.firstRoute?'Здесь стена или туман. Выберите маршрут.':'Первый шаг — по маршруту. Выберите сигнал пассажира.');else{selected=null;$('#routes').innerHTML='';$('#route-title').textContent='Выберите следующую цель';persist();drawMap();updateWorld();beep(180)}}
$('#journal').onclick=()=>{if(dialog.hidden)showJournal()};
$('#help').onclick=showHelp;
$('#voice').onclick=()=>{voice.setEnabled(!voice.enabled);savePreferences();hud();notify(voice.enabled?'Озвучка включена':'Озвучка выключена')};
$('#sound').onclick=()=>{sound=!sound;savePreferences();hud();beep()};
$('#dev').onclick=()=>{voice.stop();stopFan();developer()};
let keyAt=0;
addEventListener('keydown',e=>{
  if(e.key==='F2'){e.preventDefault();if(!e.repeat){voice.stop();developer()}return}
  if(e.key==='Escape'){if(dev)developer();else if($('#fan-caption')){stopFan();resolve('close')}else if(conversation&&c.choice&&c.choice.type!=='loot')resolve('close');else if(!c.choice&&!c.battle)closeModal();return}
  if(dev||e.target.tagName==='INPUT')return;
  if(!dialog.hidden){
    if(e.key==='Tab'){const buttons=[...dialog.querySelectorAll('button:not(:disabled), summary, a[href], [tabindex="0"]')];const first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}
    if(conversation&&e.code==='KeyE'){e.preventDefault();if(!e.repeat&&conversation.advance())paintConversation()}
    return;
  }
  const delta=({KeyW:-25,KeyS:25,KeyA:-1,KeyD:1,ArrowUp:-25,ArrowDown:25,ArrowLeft:-1,ArrowRight:1})[e.code];
  if(delta){e.preventDefault();if(performance.now()-keyAt>120){manual(delta);keyAt=performance.now()}}
  if(e.code==='KeyE')$('#interact')?.click();
  if(e.code==='KeyQ'&&!e.repeat)$('#drink')?.click();
  if(e.code==='Space'){e.preventDefault();stopRoute()}
});
addEventListener('resize',drawMap);addEventListener('pagehide',()=>{voice.stop();persist()});
addEventListener('blur',()=>{activeWindow=false;voice.stop();persist()});addEventListener('focus',()=>{activeWindow=true});
function loop(t){if(c.area!=='train'&&(!c.battle)&&t-mapFrame>16){mapFrame=t;drawMap()}if(activeWindow&&c.area!=='train'&&!dev&&dialog.hidden&&t-frame>320/speed){frame=t;if(c.tick()){persist();updateWorld();drawMap();renderChoice();queueEnemy()}}requestAnimationFrame(loop)}
persist();render();requestAnimationFrame(loop);
