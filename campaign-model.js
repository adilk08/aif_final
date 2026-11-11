import {search,vision,choose,step,actions} from './engine.js';
import {RELICS,navigationMap,routeForecast} from './mechanics.js';
import {DISTRICTS,DISTRICT_FIELDS,UPGRADES,EVIDENCE,makeDistrict,addOptionalSignals} from './campaign-content.js';
export const CAMPAIGN_KEY='neonLastRouteV1'; // Stable slot; payload v1 migrates to v2.
export const labels={home:'Поезд «Последний маршрут»',mechanic:'Механик Илья',archivist:'Архивист Мира',anchor:'Опора якоря',power:'Распределитель',boss:'Диспетчер',enemy:'Охранный дрон',pump:'Насос',record:'Запись',cache:'Припасы',drone:'Курьер'};
const hero=()=>({hp:100,max:100,atk:12,armor:1,energy:3,potions:3,coins:12,passives:{}});
export class Campaign {
  constructor(){
    this.version=2;this.area='train';this.chapter='copper';this.districts={};
    Object.assign(this,makeDistrict('copper'));this.player=hero();this.battle=null;this.choice=null;
    this.upgrades={hull:0,blade:0,plating:0};this.evidence=[];this.supportUsed=false;
    this.stats={steps:0,loss:0,launches:0,deaths:0};this.notes=['Радио: «Не ищи выход. Найди, куда должен прийти поезд».'];this.devUsed=false;this.reveal(true);
  }
  get district(){return DISTRICTS[this.chapter]}
  flagsOf(id){return id===this.chapter?this.flags:this.districts[id]?.flags}
  completed(id){return !!this.flagsOf(id)?.complete}
  get fragments(){return Object.keys(DISTRICTS).filter(id=>this.completed(id)).length}
  get passengers(){return Object.keys(DISTRICTS).filter(id=>this.flagsOf(id)?.rescued).length}
  unlocked(id){return id==='copper'||id==='archive'&&this.completed('copper')}
  snapshot(){return Object.fromEntries(DISTRICT_FIELDS.map(k=>[k,structuredClone(this[k])]))}
  reveal(expand=false){this.visible=vision(this.map,this.position%25+.5,Math.floor(this.position/25)+.5);if(expand)for(const id of this.visible)this.explored[id]=true;this.visible=this.visible.filter(id=>this.explored[id])}
  active(o){return !this.done.includes(o.key)&&!(['mechanic','archivist'].includes(o.type)&&(this.flags.rescued||this.companion!==null))&&!(o.type==='anchor'&&this.flags.anchor&&this.flags.anchor!==o.key)}
  objectAt(){return this.objects.find(o=>o.id===this.position&&this.active(o))}
  objective(){
    if(this.flags.complete)return this.chapter==='copper'?'Исследовать побочные сигналы или отправиться в Архив.':'Архив пройден. Исследовать оставшиеся сигналы.';
    if(!this.flags.met)return this.chapter==='archive'?'Найти Миру':'Найти Илью';
    if(this.chapter==='archive'){
      if(this.flags.pumps.length<2)return 'Запустить оба насоса';
      if(!this.flags.water)return 'Выбрать режим воды у насоса';
      if(!this.flags.record)return 'Забрать бумажный реестр';
      if(!this.flags.rescued&&this.companion===null)return 'Забрать Миру у её сигнала';
      if(!this.flags.boss)return 'Отключить Смотрителя';
      return 'Вернуться к поезду с Мирой';
    }
    if(!this.flags.anchor)return 'Закрепить дорогу';
    if(!this.flags.rescued&&this.companion===null)return 'Забрать Илью';
    if(!this.flags.power)return 'Распределить питание';
    if(!this.flags.boss)return 'Отключить Диспетчера';
    return 'Вернуться к поезду с Ильёй';
  }
  log(s){this.notes.unshift(s);this.notes=this.notes.slice(0,60)}
  addEvidence(id){if(!EVIDENCE[id]||this.evidence.includes(id))return false;this.evidence.push(id);this.log('Находка: '+EVIDENCE[id].title+'. '+EVIDENCE[id].text);return true}
  depart(id=this.chapter){
    if(this.area!=='train'||this.choice||this.battle||!this.unlocked(id))return false;
    if(id!==this.chapter){this.districts[this.chapter]=this.snapshot();const state=this.districts[id]||makeDistrict(id);delete this.districts[id];this.chapter=id;Object.assign(this,state);this.reveal(!this.explored.some(Boolean))}
    this.area=id;this.choice=null;this.player.hp=this.player.max;this.player.energy=3;this.position=26;this.route=[];this.routeGoal=null;this.reveal(false);
    this.log('Экспедиция: '+this.district.name+'. Разведка и решения сохраняются.');return true;
  }
  preview(id,alg){if(!Number.isInteger(id)||!this.map.cells[id]||(!this.explored[id]&&!this.objects.some(o=>o.id===id&&this.active(o))))return null;const r=search(navigationMap(this.map,this.visited,this.player.passives),this.position,id,alg);return {...r,...routeForecast(this.map,r.path,this.visited,this.player)}}
  travel(id,alg){if(this.area==='train'||this.battle||this.choice)return false;const price={dfs:0,bfs:2,ucs:3,astar:3}[alg],r=this.preview(id,alg);if(price===undefined||!r||r.path.length<2||this.player.coins<price)return false;this.player.coins-=price;this.route=r.path.slice(1);this.routeGoal=id;this.stats.launches++;return true}
  move(id,algorithm=false){
    if(this.area==='train'||this.battle||this.choice||!this.map.cells[id])return false;
    const x=this.position%25,y=Math.floor(this.position/25);
    if(Math.abs(id%25-x)+Math.abs(Math.floor(id/25)-y)!==1||!algorithm&&(!this.firstRoute||!this.explored[id]))return false;
    if(!algorithm){this.route=[];this.routeGoal=null}const old=this.position;this.position=id;if(algorithm)this.firstRoute=true;this.stats.steps++;
    if(this.companion!==null&&!this.flags.rescued)this.companion=old;
    if(!this.visited[id]&&algorithm){const loss=Math.min(Math.max(0,this.player.hp-10),this.map.cells[id]*.6*(this.player.passives.scout?.65:1));this.player.hp-=loss;this.stats.loss+=loss}
    if(algorithm)this.visited[id]=true;this.reveal(algorithm);return true;
  }
  tick(){if(!this.route.length||this.choice||this.battle)return false;const next=this.route.shift();if(!this.move(next,true)){this.route=[];return false}const o=this.objectAt();if(o){this.interact(o.key);return true}if(!this.route.length)this.log('Цель достигнута.');return true}
  bossReady(){return this.chapter==='copper'?!!(this.flags.power&&this.flags.anchor):!!(this.flags.water&&this.flags.record)}
  interact(key){
    if(this.area==='train'||this.battle||this.choice)return false;
    const o=this.objects.find(o=>o.key===key&&o.id===this.position&&this.active(o));if(!o)return false;
    if(o.type==='enemy'||o.type==='boss'){if(o.type==='boss'&&!this.bossReady()){this.choice={type:'locked'};return true}this.startBattle(o);return true}
    this.choice={type:o.type,key:o.key};return true;
  }
  resolve(action){
    const c=this.choice;if(!c)return false;let ok=true;
    if(action==='close'&&c.type!=='loot'){this.choice=null;return true}
    if(c.type==='mechanic'){
      if(action!=='meet')return false;this.flags.met=true;this.player.passives.scout=true;
      if(this.flags.anchor&&!this.flags.rescued){this.companion=this.position;this.log('Илья снова следует за вами.')}else this.log('Получен Разведчик. Илья ждёт установки якоря.');
    }else if(c.type==='anchor'){
      if(action!=='install'||!this.flags.met||this.flags.anchor)return false;
      this.flags.anchor=c.key;this.done.push(c.key);this.anchoredPath=search(this.map,this.position,26,'bfs').path;
      for(const id of this.anchoredPath)if(c.key==='anchor-safe'&&this.map.cells[id]>1)this.map.cells[id]=1;
      if(c.key==='anchor-short')this.player.coins+=6;this.companion=this.position;
      this.log('Якорь установлен: '+(c.key==='anchor-safe'?'служебная дорога':'короткая линия')+'. Илья следует за вами.');
    }else if(c.type==='power'){
      if(!['train','suppress'].includes(action)||this.flags.power)return false;
      this.flags.power=action;this.done.push('power');this.log(action==='suppress'?'Охрана подавлена. Канал Ильи сможет глушить охрану и в Архиве.':'Резерв поезду: +3 урона после главы и питание насосов Архива.');
    }else if(c.type==='archivist'){
      if(action!=='meet')return false;this.flags.met=true;this.companion=this.position;
      this.log('Мира присоединилась. Она отказывается считать архив доказательством: «Здесь умеют подделывать даже молчание».');
    }else if(c.type==='pump'){
      if(!this.flags.met)return false;
      if(action==='activate'&&!this.flags.pumps.includes(c.key)){
        this.flags.pumps.push(c.key);this.log('Включён '+(c.key==='pump-west'?'западный':'восточный')+' насос.');
        if(this.flags.pumps.length===2){this.choice={type:'water',key:c.key};return true}
      }else if(action==='configure'&&this.flags.pumps.length===2&&!this.flags.water){this.choice={type:'water',key:c.key};return true}else return false;
    }else if(c.type==='water'){
      if(!['drain','seal'].includes(action)||this.flags.pumps.length!==2||this.flags.water)return false;
      this.flags.water=action;this.done.push('pump-west','pump-east');
      if(action==='drain')this.map.cells=this.map.cells.map(v=>v>1?1:v);
      this.log(action==='drain'?'Вода отведена: путь стал безопаснее, но Смотритель получает полное питание.':'Шлюзы закрыты: вода остаётся, зато Смотритель теряет питание.');
      if(this.flagsOf('copper')?.power==='train'){this.player.potions+=2;this.log('Резерв Медного узла питает насосы. Илья подготовил 2 зелья.');}
    }else if(c.type==='record'){
      if(action!=='read'||this.done.includes(c.key))return false;
      if(c.key==='register'&&!this.flags.water)return false;
      const id={order:'copperOrder',register:'archiveConsent',echo:'archiveEcho',glass:'archiveGlass'}[c.key];if(!id)return false;
      this.addEvidence(id);this.done.push(c.key);this.player.coins+=4;
      if(c.key==='register')this.flags.record=true;
    }else if(c.type==='cache'){
      if(this.done.includes(c.key)||!['supplies','salvage'].includes(action))return false;
      if(action==='supplies'){this.player.potions+=2;this.player.hp=Math.min(this.player.max,this.player.hp+20)}else this.player.coins+=10;
      this.done.push(c.key);this.log(action==='supplies'?'Тайник: 2 зелья и до 20 HP.':'Тайник: детали проданы за 10 CR.');
    }else if(c.type==='drone'){
      if(this.done.includes(c.key)||!['repair','salvage'].includes(action)||action==='repair'&&this.player.coins<4)return false;
      if(action==='repair'){this.player.coins-=4;this.flags.courier=true;this.player.passives.shield=true;this.addEvidence('copperRescue');this.log('Курьер снова летает. Получен Аварийный щит и свидетельство эвакуации.')}else{this.player.coins+=8;this.log('Курьер разобран: +8 CR. Его память утрачена.');}
      this.done.push(c.key);
    }else if(c.type==='home'){
      if(action!=='return')return false;this.returnHome();
    }else if(c.type==='loot'){
      if(action==='attack')this.player.atk+=2;else if(action==='armor')this.player.armor++;else if(action==='heal')this.player.hp=Math.min(this.player.max,this.player.hp+25);else if(Object.keys(RELICS).includes(action)&&!this.player.passives[action])this.player.passives[action]=true;else ok=false;
    }else ok=false;
    if(ok)this.choice=null;return ok;
  }
  returnHome(){
    if(this.companion!==null&&!this.flags.rescued){this.flags.rescued=true;this.companion=null;this.log(this.district.passenger+' на борту. '+(this.chapter==='copper'?'Открыта мастерская.':'Открыт медотсек. Каждый выход начинается минимум с двух зелий.'));}
    this.area='train';this.route=[];this.routeGoal=null;this.position=26;this.player.hp=this.player.max;this.player.energy=3;this.supportUsed=false;
    if(this.flagsOf('archive')?.rescued)this.player.potions=Math.max(2,this.player.potions);
    if(this.flags.boss&&this.flags.rescued&&this.bossReady()&&!this.flags.complete){
      this.flags.complete=true;
      if(this.chapter==='copper'&&this.flags.power==='train')this.player.atk+=3;
      this.player.coins+=12;
      this.log(this.district.name+' завершён. +12 CR на улучшения. Фрагмент адреса '+this.fragments+'/4.');
      if(this.chapter==='archive')this.log('Второй фрагмент — время прибытия. Оно совпадает со временем катастрофы. АРИАДНА: «Теперь вы понимаете, почему я просила не торопиться».');
    }
    this.reveal(false);
  }
  upgrade(key){
    const u=UPGRADES[key],level=this.upgrades[key];
    if(this.area!=='train'||this.choice||this.battle||!this.flagsOf('copper')?.rescued||!u||level>=u.max||this.player.coins<u.cost*(level+1))return false;
    this.player.coins-=u.cost*(level+1);this.upgrades[key]++;
    if(key==='hull'){this.player.max+=20;this.player.hp+=20}else if(key==='blade')this.player.atk+=2;else this.player.armor++;
    this.log('Мастерская: '+u.name+', уровень '+this.upgrades[key]+'.');return true;
  }
  resupply(){if(this.area!=='train'||!this.flagsOf('copper')?.rescued||this.player.coins<4)return false;this.player.coins-=4;this.player.potions++;return true}
  drink(){if(this.area==='train'||this.battle||this.choice||this.player.potions<1||this.player.hp>=this.player.max)return false;this.player.potions--;this.player.hp=Math.min(this.player.max,this.player.hp+25);return true}
  get supportAvailable(){return this.chapter==='archive'&&!!this.flagsOf('copper')?.rescued&&!this.supportUsed&&!!this.battle&&!this.battle.pending}
  support(){
    if(!this.supportAvailable)return false;const p=this.battle.s[0];this.supportUsed=true;
    if(this.flagsOf('copper')?.power==='suppress'){p.guard=true;p.energy=Math.min(3,p.energy+1);this.battle.log.push('Илья: помеха включена. Щит и +1 энергия.');}
    else{p.hp=Math.min(p.max,p.hp+18);this.battle.log.push('Илья: аварийный ремонт. +18 HP.');}
    this.sync();return true; // Once per expedition, no extra enemy turn.
  }
  startBattle(o){
    const boss=o.type==='boss',archive=this.chapter==='archive',weak=boss&&(archive?this.flags.water==='seal':this.flags.power==='suppress');
    const role=boss?'boss':['sentinel','berserker','technician'][o.kind];
    const hp=boss?(archive?(weak?86:106):(weak?64:84)):(archive?[42,40,44]:[30,28,30])[o.kind];
    const e={hp,max:hp,atk:boss?(archive?(weak?11:12):(weak?9:11)):(archive?[10,12,10]:[8,10,8])[o.kind],armor:boss?(weak?0:3):[3,1,1][o.kind],energy:2,potions:0,guard:false,boss,role,phase2:false};
    this.battle={key:o.key,boss,s:[{...structuredClone(this.player),guard:false,shieldUsed:false},e],pending:false,intent:null,log:['Контакт: '+(boss?this.district.boss:'охранный дрон')]};this.plan();
  }
  plan(){if(this.battle){const r=choose(this.battle.s,4,true,true);this.battle.intent=r.action;this.battle.metrics={nodes:r.nodes,cuts:r.cuts}}}
  sync(){for(const k of ['hp','energy','potions'])this.player[k]=this.battle.s[0][k]}
  playerAct(a){const b=this.battle;if(!b||b.pending||!actions(b.s,0).includes(a))return false;b.s=step(b.s,0,a);b.log.push('Вы: '+a+(b.s.damage?' · '+b.s.damage:'')+(b.s.interrupted?' · ремонт прерван':''));this.sync();if(b.s[1].hp<=0)this.victory();else b.pending=true;return true}
  enemyAct(){
    const b=this.battle;if(!b||!b.pending)return false;b.s=step(b.s,1,b.intent);b.log.push('Враг: '+b.intent+(b.s.damage?' · '+b.s.damage:''));this.sync();
    if(this.player.hp<=0){this.stats.deaths++;this.player.hp=this.player.max;this.player.coins=Math.max(0,this.player.coins-8);this.player.potions=Math.max(this.flagsOf('archive')?.rescued?2:1,this.player.potions);this.player.energy=3;this.battle=null;this.route=[];this.area='train';this.position=26;this.companion=null;this.supportUsed=false;this.choice={type:'defeat'};this.log('Аварийная эвакуация. Потеряно до 8 CR; задачи и разведка сохранены.');this.reveal(false)}else{b.pending=false;this.plan()}return true;
  }
  victory(){const b=this.battle;if(!b||this.done.includes(b.key))return;this.done.push(b.key);this.player.coins+=8;this.player.hp=Math.min(this.player.max,this.player.hp+8);this.player.energy=3;if(b.boss){this.flags.boss=true;this.log(this.chapter==='copper'?'Диспетчер отключён. АРИАДНА: «Вы открыли линию, которую я закрыла ради вас».':'Смотритель отключён. На ленте два приказа АРИАДНЫ: «Не выпускать» и «Не впускать». Оба адресованы одному поезду.');}this.battle=null;this.choice={type:'loot',boss:b.boss};this.log('Победа. +8 CR, восстановлено до 8 HP. Выберите трофей.')}
  save(){const s=structuredClone(this);delete s.visible;return JSON.stringify(s)}
  static load(raw){
    const s=JSON.parse(raw);if(!s||![1,2].includes(s.version))throw Error('Несовместимое сохранение кампании');
    if(s.version===1){
      s.version=2;s.chapter='copper';s.districts={};s.upgrades={hull:0,blade:0,plating:0};s.evidence=[];s.supportUsed=false;s.anchoredPath??=[];
      validateDistrict(s);addOptionalSignals(s,'copper');
    }
    if(!DISTRICTS[s.chapter]||!['train',s.chapter].includes(s.area)||!s.districts||typeof s.districts!=='object')throw Error('Поврежден район');
    validateDistrict(s);
    for(const [id,state] of Object.entries(s.districts)){if(!DISTRICTS[id]||id===s.chapter)throw Error('Поврежден район');validateDistrict(state,id)}
    if(!s.player||!['hp','max','atk','armor','energy','potions','coins'].every(k=>Number.isFinite(s.player[k]))||s.player.hp<=0||s.player.hp>s.player.max||s.player.max<1||s.player.atk<0||s.player.armor<0||s.player.energy<0||s.player.energy>3||s.player.coins<0||s.player.potions<0||!s.player.passives||!Array.isArray(s.notes)||s.notes.some(n=>typeof n!=='string')||!Array.isArray(s.evidence)||s.evidence.some(id=>!EVIDENCE[id])||!s.upgrades||!Object.entries(UPGRADES).every(([k,v])=>Number.isInteger(s.upgrades[k])&&s.upgrades[k]>=0&&s.upgrades[k]<=v.max))throw Error('Повреждено сохранение кампании');
    if(s.battle&&(!s.battle.s||s.battle.s.length!==2||!s.battle.s.every(p=>Number.isFinite(p.hp)&&p.hp>=0&&Number.isFinite(p.energy))||!s.objects.some(o=>o.key===s.battle.key)))throw Error('Повреждено состояние боя');
    const c=Object.assign(Object.create(Campaign.prototype),s);if(c.chapter==='archive'&&!c.completed('copper'))throw Error('Закрытый район');c.reveal(false);return c;
  }
}
function validateDistrict(s,id=s.chapter||'copper'){
  if(s.map?.n!==25||s.map.cells?.length!==625||!s.map.cells.every(v=>[0,1,3,5].includes(v))||!Number.isInteger(s.position)||!s.map.cells[s.position]||!Array.isArray(s.objects)||s.objects.length<9||s.objects.length>12||!s.objects.every(o=>Number.isInteger(o.id)&&s.map.cells[o.id]&&typeof o.key==='string')||new Set(s.objects.map(o=>o.id)).size!==s.objects.length||new Set(s.objects.map(o=>o.key)).size!==s.objects.length||!['explored','visited'].every(k=>s[k]?.length===625&&s[k].every(v=>typeof v==='boolean'))||!s.flags||!Array.isArray(s.done)||!Array.isArray(s.route)||s.route.some(i=>!Number.isInteger(i)||!s.map.cells[i])||s.companion!==null&&!s.map.cells[s.companion])throw Error('Повреждено состояние района');
  if(id==='archive'&&(!Array.isArray(s.flags.pumps)||s.flags.pumps.some(k=>!['pump-west','pump-east'].includes(k))||new Set(s.flags.pumps).size!==s.flags.pumps.length||![null,'drain','seal'].includes(s.flags.water)))throw Error('Повреждены насосы');
}
