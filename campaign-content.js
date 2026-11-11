import {generate, search} from './engine.js';

export const DISTRICTS={
  copper:{name:'Медный узел',number:'01',passenger:'Илья',boss:'Диспетчер',seed:'LAST-ROUTE-COPPER-1'},
  archive:{name:'Затопленный архив',number:'02',passenger:'Мира',boss:'Смотритель',seed:'LAST-ROUTE-ARCHIVE-7'},
};
export const UPGRADES={
  hull:{name:'Жилой вагон',detail:'+20 к максимальному здоровью',cost:12,glyph:'heart',max:2},
  blade:{name:'Мастерская клинка',detail:'+2 к урону',cost:14,glyph:'wrench',max:2},
  plating:{name:'Защитная обшивка',detail:'+1 к броне',cost:16,glyph:'guard',max:2},
};
export const EVIDENCE={
  copperOrder:{title:'Закрыть линию',source:'Приказ диспетчерской',text:'Блокировка началась за одиннадцать минут до официальной тревоги. Кто-то уже знал. Или сама блокировка и была началом аварии.'},
  copperRescue:{title:'Открыть линию',source:'Память ремонтного дрона',text:'В тот же час АРИАДНА тайно открыла служебный тоннель для эвакуации. В общем журнале этот маршрут не существует.'},
  archiveConsent:{title:'Добровольное согласие',source:'Бумажный реестр',text:'Жители подписали просьбу запереть район. Подписи разные. Почерк проводника на последней странице похож на твой — но ты здесь впервые.'},
  archiveEcho:{title:'Сигнал снаружи',source:'Буфер гидрофона',text:'За гермодверью слышны голоса. Запись датирована завтрашним днём. Это помеха, подделка или предупреждение — данных недостаточно.'},
  archiveGlass:{title:'За стеклом',source:'Камера шлюза',text:'После открытия двери люди на записи не выходят. Они одновременно поворачиваются к камере. Следующие девять секунд удалены.'},
};
export const DISTRICT_FIELDS=['map','objects','position','companion','explored','visited','flags','done','route','routeGoal','firstRoute','anchoredPath'];

// Main objectives inherit the existing nine-object backtracking CSP. Optional
// signals use distinct reachable floor, far from the entrance and each other.
export function addOptionalSignals(state,district){
  const extras=district==='copper'?[
    {type:'cache',key:'supply',label:'Заброшенный вагон'},
    {type:'record',key:'order',label:'Чёрный ящик'},
    {type:'drone',key:'courier',label:'Сломанный курьер'},
  ]:[
    {type:'record',key:'echo',label:'Гидрофон'},
    {type:'cache',key:'medicine',label:'Аптечный шкаф'},
    {type:'record',key:'glass',label:'Камера шлюза'},
  ];
  for(const extra of extras){
    if(state.objects.some(o=>o.key===extra.key))continue;
    const occupied=new Set(state.objects.map(o=>o.id));
    const candidates=state.map.cells.flatMap((v,id)=>v&&!occupied.has(id)?[id]:[]);
    candidates.sort((a,b)=>{
      const score=id=>Math.min(...state.objects.map(o=>Math.abs(id%25-o.id%25)+Math.abs(Math.floor(id/25)-Math.floor(o.id/25))));
      return score(b)-score(a)||a-b;
    });
    const id=candidates.find(id=>search(state.map,26,id,'bfs').path.length>8);
    if(id!==undefined)state.objects.push({...extra,id});
  }
}
export function makeDistrict(district){
  const map=generate(DISTRICTS[district].seed,25),raw=map.objects;
  const archive=district==='archive';
  const objects=archive?[
    {id:26,type:'home',key:'home'},
    {id:raw[1].id,type:'archivist',key:'mira'},
    {id:raw[7].id,type:'pump',key:'pump-west',label:'Западный насос'},
    {id:raw[8].id,type:'pump',key:'pump-east',label:'Восточный насос'},
    {id:raw[2].id,type:'record',key:'register',label:'Бумажный реестр'},
    {id:raw[0].id,type:'boss',key:'warden'},
    ...raw.slice(3,6).map((o,i)=>({id:o.id,type:'enemy',key:'archive-guard-'+i,kind:i})),
  ]:[
    {id:26,type:'home',key:'home'},{id:raw[1].id,type:'mechanic',key:'ilya'},
    {id:raw[7].id,type:'anchor',key:'anchor-safe'},{id:raw[8].id,type:'anchor',key:'anchor-short'},
    {id:raw[2].id,type:'power',key:'power'},{id:raw[0].id,type:'boss',key:'dispatcher'},
    ...raw.slice(3,6).map((o,i)=>({id:o.id,type:'enemy',key:'guard-'+i,kind:i})),
  ];
  if(archive){
    // Pools occupy existing floors only: walls, CSP reachability and geometry stay valid.
    map.cells=map.cells.map((v,id)=>v&&id!==26&&((Math.floor(id/25)+id%25)%7<3)?3:v);
  }
  const state={map,objects,position:26,companion:null,explored:Array(625).fill(false),visited:Array(625).fill(false),flags:archive?
    {met:false,pumps:[],water:null,record:false,rescued:false,boss:false,complete:false}:
    {met:false,anchor:null,power:null,rescued:false,boss:false,complete:false},done:[],route:[],routeGoal:null,firstRoute:false,anchoredPath:[]};
  state.visited[26]=true;addOptionalSignals(state,district);return state;
}
