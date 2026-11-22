import {GARDEN_LINES} from './garden-story.js';
import {CHAPTER_LINES} from './campaign-story.js';
// Presentation data has no access to campaign saves or game rules.
const drawings = {
  heart:'M12 21S2 15 2 8a5 5 0 0 1 10-2 5 5 0 0 1 10 2c0 7-10 13-10 13Z',
  bolt:'m14 2-9 12h6l-1 8 9-12h-6Z',
  coin:'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 4v12m4-10h-6a2 2 0 0 0 0 4h4a2 2 0 0 1 0 4H8',
  potion:'M9 2h6m-5 0v6L5 17q-2 5 3 5h8q5 0 3-5l-5-9V2M7 15h10',
  book:'M3 3h7l2 2 2-2h7v17h-7l-2 2-2-2H3Zm9 2v17',
  radio:'M12 7v10m-4-7v4m8-4v4M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14M2 2a15 15 0 0 0 0 20M22 2a15 15 0 0 1 0 20',
  speaker:'M3 9h5l6-5v16l-6-5H3Zm14-2q5 5 0 10m3-13q8 8 0 16',
  headphones:'M3 14V11a9 9 0 0 1 18 0v3M3 12h4v9H3Zm14 0h4v9h-4Z',
  soundwave:'M3 9v6m5-10v14m5-17v20m5-15v10m4-7v4',
  muted:'M3 9h5l6-5v16l-6-5H3Zm15 0 5 6m0-6-5 6',
  train:'M5 3h14v14H5Zm0 7h14M8 3v7m8-7v7M8 14h1m6 0h1M8 17l-3 5m11-5 3 5M7 20h10',
  wrench:'m14 5 5-3-1 6-5 3-8 11-4-3 9-11V3l4 2Z',
  anchor:'M12 3v17M9 5a3 3 0 1 0 6 0 3 3 0 1 0-6 0M4 12v3q0 7 8 7t8-7v-3M2 15l2-3 3 3m10 0 3-3 2 3',
  compass:'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm5 5-3 7-7 3 3-7Z',
  guard:'M12 2 3 6v7q0 6 9 9 9-3 9-9V6Zm0 5v10m-5-5h10',
  skull:'M5 16V9a7 7 0 0 1 14 0v7h-4v6H9v-6Zm3-6h1m6 0h1m-4 6v6',
  check:'m4 12 5 5L21 5',
  lock:'M7 10V6a5 5 0 0 1 10 0v4M4 10h16v12H4Zm8 4v4',
  arrow:'M3 12h18m-7-7 7 7-7 7',
  stop:'M5 5h14v14H5Z',
  help:'M9 8a3 3 0 1 1 5 2l-2 2v3m0 3v1M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z',
  replay:'M4 8a9 9 0 1 1 0 9M4 2v6h6',
  close:'m5 5 14 14M19 5 5 19',
  steps:'M5 5h4v5H5Zm10 9h4v5h-4ZM9 8l6 8',
  person:'M8 6a4 4 0 1 0 8 0 4 4 0 0 0-8 0M3 22v-6q0-5 9-5t9 5v6',
  code:'m8 5-6 7 6 7m8-14 6 7-6 7M14 2l-4 20',
};
export function icon(name, cls=''){return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${drawings[name]||drawings.compass}"/></svg>`}
export function routeIcon(alg){const paths={dfs:'M3 3h8v6H6v7h12v5m0-5v-6h5',bfs:'M3 3v9h9v9m0-9h9',ucs:'M3 20V8h8v8h10',astar:'m3 20 6-7 5-2 7-8'};return `<svg class="route-art" viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[alg]}"/><circle cx="3" cy="${alg==='dfs'||alg==='bfs'?3:20}" r="2"/><circle cx="21" cy="${alg==='astar'?3:alg==='bfs'?12:16}" r="2"/></svg>`}

export const LINES={
  ...CHAPTER_LINES, ...GARDEN_LINES,
  radio:{speaker:'aria',text:'Не ищи выход. Найди, куда должен прийти поезд.'},
  signal:{speaker:'aria',text:'Сигнал механика — в Медном узле. Я отметила его на карте.'},
  first:{speaker:'aria',text:'Выбери сигнал на карте, затем маршрут. Для первого выхода подойдёт бесплатная разведка.'},
  safe:{speaker:'aria',text:'Служебная опора очистит опасные покрытия на дороге к поезду.'},
  short:{speaker:'aria',text:'Короткая линия закрепит путь и даст шесть кредитов из сервисного отсека.'},
  power:{speaker:'aria',text:'Кому отдать мощность? Подавление ослабит Диспетчера. Резерв поезду усилит твоё оружие после возвращения.'},
  home:{speaker:'aria',text:'На базе можно восстановить здоровье. Всё, что ты уже сделал, сохранится.'},
  final:{speaker:'aria',text:'Диспетчер отключён. Илья у вагона. Пора запускать поезд.'},
  locked:{speaker:'aria',text:'Сначала установи якорь и выбери питание. Тогда линия к Диспетчеру откроется.'},
  defeat:{speaker:'aria',text:'Аварийная эвакуация завершена. Якорь и твои решения сохранены.'},
  boss:{speaker:'aria',text:'Вы открыли линию, которую я закрыла ради вас.'},
  arrival:{speaker:'aria',text:'Медный узел восстановлен. Получен первый фрагмент адреса станции Ноль.'},
  meet:{speaker:'ilya',text:'Илья. Механик аварийного состава. Я пытался вернуться, но дороги замкнулись.'},
  anchor:{speaker:'ilya',text:'У меня остался один якорь. Закрепи любую из двух опор — и я пойду за тобой.'},
  scout:{speaker:'ilya',text:'Забирай мой разведчик. Он поможет тратить меньше сил в пути.'},
  rejoin:{speaker:'ilya',text:'Ты вернулся. Я знал, что якорь удержит дорогу. Теперь я с тобой.'},
  thanks:{speaker:'ilya',text:'Я думал, что нас здесь забыли. Спасибо, проводник.'},
  hint:{speaker:'ilya',text:'Распределитель связан с охраной. Можно ослабить Диспетчера или оставить больше питания поезду.'},
  epilogue:{speaker:'ilya',text:'Ариадна закрыла линию после катастрофы. В архиве должны быть записи последнего поезда.'},
  aboard:{speaker:'ilya',text:'Я добрался. Открой вагон. К Диспетчеру мы можем вернуться позже.'},
};
export const SPEAKERS={lada:{name:'Лада',role:'Дежурная по свету',portrait:'assets/portraits/lada.webp'},driver:{name:'Проводник',role:'Ключ приёма'},ilya:{name:'Илья',role:'Механик',portrait:'assets/portraits/ilya.png'},mira:{name:'Мира',role:'Архивист · медик',portrait:'assets/portraits/mira.png'},aria:{name:'АРИАДНА',role:'Бортовая связь'}};
export const VOICE_SCRIPTS=Object.fromEntries(Object.keys(SPEAKERS).map(speaker=>[speaker,Object.entries(LINES).filter(([,v])=>v.speaker===speaker).map(([id,v])=>({id,text:v.text}))]));

export class DialogueSession{
  constructor(ids,options){this.frames=ids.map(id=>({id,...LINES[id]}));if(!this.frames.length||this.frames.some(f=>!f.text))throw Error('Unknown dialogue');this.index=0;this.options=options;this.chosen=false}
  get current(){return this.frames[this.index]}
  get last(){return this.index===this.frames.length-1}
  advance(){if(this.chosen||this.last)return false;this.index++;return true}
  choose(index){const option=this.options[index];if(this.chosen||!this.last||!option||option.disabled)return false;this.chosen=true;option.run();return true}
}

// Audio is optional. One controller cancels the previous phrase on page changes,
// closing a conversation, developer transitions and disabling voice.
export class DialogueVoice{
  constructor(manifest={},makeAudio=src=>new Audio(src)){this.manifest=manifest;this.makeAudio=makeAudio;this.audio=null;this.enabled=false;this.onFailure=()=>{};this.onStateChange=()=>{}}
  stop(){if(this.audio){this.audio.pause();this.audio.onended=null;this.audio.onerror=null;this.audio=null}this.onStateChange('idle')}
  async play(id){this.stop();if(!this.enabled)return false;const entry=this.manifest[id];if(!entry)return false;const audio=this.makeAudio(entry.src);this.audio=audio;audio.preload='auto';audio.volume=.85;this.onStateChange('loading');audio.onended=()=>{if(this.audio===audio)this.stop()};audio.onerror=()=>{if(this.audio===audio){this.stop();this.onFailure()}};try{await audio.play();if(this.audio!==audio)return false;this.onStateChange('playing');return true}catch(error){if(this.audio===audio){this.stop();this.onFailure(error)}return false}}
  setEnabled(value){this.enabled=!!value;if(!this.enabled)this.stop()}
}
