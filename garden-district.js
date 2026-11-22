import {search} from './engine.js';

const cell = (x,y) => y*25+x;
const train = cell(1,1), panel = cell(11,10), relay = cell(19,12), platform = cell(20,20);
const warmGate = cell(17,17), coldGate = cell(13,7);

export function makeGardens(){
  const map={n:25,cells:Array(625).fill(0)};
  function passage(x,y,endX,endY,cost=1){
    while(true){
      map.cells[cell(x,y)]=cost;
      if(x===endX&&y===endY)break;
      if(x!==endX)x+=Math.sign(endX-x);else y+=Math.sign(endY-y);
    }
  }
  passage(1,1,4,1);passage(4,1,4,17);passage(4,4,11,4);passage(11,4,11,17);
  passage(1,10,20,10);passage(4,17,20,17,3);passage(20,10,20,20);
  passage(4,7,20,7,3);passage(20,7,20,10);passage(7,7,7,4);
  passage(19,10,19,12);passage(19,12,20,12);passage(20,7,22,7);passage(22,3,22,7);
  passage(7,17,7,22);passage(7,22,12,22);passage(12,22,12,20);
  passage(20,20,23,20);passage(23,16,23,20);passage(4,14,1,14);
  const objects=[
    [train,'home','home','Поезд'],[cell(4,4),'operator','lada','Лада'],
    [panel,'switch','lamps','Пульт ламп'],[cell(22,3),'fan','fan','Вентиляционная'],
    [relay,'relay','key','Сигнальное реле'],[platform,'boss','gardener','Садовник'],
    [cell(7,7),'enemy','garden-guard-0','Страж'],[cell(20,15),'enemy','garden-guard-1','Берсерк'],
    [cell(7,20),'enemy','garden-guard-2','Техник'],[cell(12,20),'tomato','tomato','Последний томат'],
    [cell(23,16),'record','boxes','Седьмой ящик'],[cell(1,14),'cache','garden-meds','Шкаф смены']
  ].map(([id,type,key,label],i)=>({id,type,key,label,...(type==='enemy'?{kind:i-6}:{})}));
  map.cells[warmGate]=0;map.cells[coldGate]=0;
  const explored=Array(625).fill(false),visited=[...explored];visited[train]=true;
  return {map,objects,position:train,companion:null,explored,visited,done:[],route:[],routeGoal:null,
    firstRoute:false,anchoredPath:[],flags:{met:false,light:null,tape:false,keeper:null,boss:false,
      rescued:false,complete:false,boarding:null,trainPosition:train,tomato:null}};
}

export function inheritGardenRoutes(c){
  const drained=c.flagsOf('archive')?.water==='drain';
  for(let x=11;x<=19;x++)c.map.cells[cell(x,drained?12:9)]=1;
  if(!drained)c.map.cells[cell(19,10)]=1;
  if(c.flagsOf('copper')?.power==='suppress'){
    c.anchoredPath=search(c.map,panel,cell(22,3),'ucs').path;
    for(const id of c.anchoredPath)c.map.cells[id]=1;
  }
}

export function gardenObjective(c){
  const f=c.flags;
  if(f.complete)return 'Осмотреть Сады или послушать радио в поезде';
  if(f.boarding)return 'Дождаться поезда на посадочной';
  if(!f.met)return 'Найти Ладу у рассадных ламп';
  if(!f.light)return 'Подать свет с пульта ламп';
  if(!f.tape&&f.light==='warm'&&c.flagsOf('copper')?.power!=='train')return 'Включить холодную галерею у пульта';
  if(!f.tape)return 'Прослушать плёнку в вентиляционной';
  if(!f.keeper)return 'Назначить дежурного у сигнального реле';
  if(f.light!=='warm'&&c.flagsOf('copper')?.power!=='train')return 'Вернуть тёплый свет к посадочной';
  if(!f.boss)return 'Освободить платформу от Садовника';
  return 'Вызвать поезд на посадочную';
}

export function resolveGarden(c,action){
  const f=c.flags,q=c.choice;
  switch(q.type){
    case 'operator':
      if(action!=='meet')return false;
      f.met=true;c.done.push(q.key);break;
    case 'switch': {
      if(!f.met||!['warm','cold'].includes(action))return false;
      const reserve=c.flagsOf('copper')?.power==='train';
      f.light=action;c.map.cells[warmGate]=(reserve||action==='warm')?1:0;
      c.map.cells[coldGate]=(reserve||action==='cold')?1:0;
      if(c.route.length&&c.routeGoal!=null)c.route=search(c.map,c.position,c.routeGoal,c.routeAlgorithm||'bfs').path.slice(1);
      break;
    }
    case 'fan':
      if(action!=='listen'||!f.light||f.tape||(f.light!=='cold'&&c.flagsOf('copper')?.power!=='train'))return false;
      f.tape=true;c.done.push(q.key);c.addEvidence('gardenLoop');break;
    case 'relay':
      if(!f.tape||f.keeper||!['lada','driver'].includes(action))return false;
      f.keeper=action;c.done.push(q.key);break;
    case 'tomato':
      if(f.tomato||!['share','seeds'].includes(action))return false;
      f.tomato=action;c.done.push(q.key);c.addEvidence(action==='share'?'gardenSlices':'gardenSeeds');break;
    case 'dispatch':
      if(action!=='call'||!f.boss||f.complete||f.boarding)return false;
      f.boarding=search(c.map,train,platform,'bfs').path.slice(1);
      f.trainPosition=train;c.route=[];c.routeGoal=null;break;
    case 'boarding':
      if(action!=='board'||!Array.isArray(f.boarding)||f.boarding.length)return false;
      f.rescued=true;f.boarding=null;c.addEvidence('gardenAddress');c.returnHome();break;
    default:return false;
  }
  return true;
}

export function tickGardenTrain(c){
  if(!Array.isArray(c.flags.boarding))return false;
  if(c.flags.boarding.length)c.flags.trainPosition=c.flags.boarding.shift();
  if(!c.flags.boarding.length)c.choice={type:'boarding'};
  return true;
}
