import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Campaign} from './campaign-model.js';
import {actions,step,search} from './engine.js';
import {makeDistrict} from './campaign-content.js';

function prepared(power='suppress'){
  const c=new Campaign();Object.assign(c.flags,{met:true,anchor:'anchor-safe',power,rescued:true,boss:true});c.player.passives.scout=true;c.returnHome();return c;
}
function at(c,key){c.choice=null;const o=c.objects.find(o=>o.key===key);c.position=o.id;assert.ok(c.interact(key));return o}
function fight(c){
  const score=s=>s[0].hp<=0?-1e6:s[1].hp<=0?1e6+s[0].hp:s[0].hp*1.2-s[1].hp*1.4+s[0].potions*10+s[0].energy*3;
  for(let i=0;c.battle&&i<100;i++){
    if(c.supportAvailable&&c.player.hp<c.player.max-18)c.support();
    if(c.battle.pending){c.enemyAct();continue}
    let best=-Infinity,act;
    for(const a of actions(c.battle.s,0)){let n=step(c.battle.s,0,a);if(n[1].hp>0)n=step(n,1,c.battle.intent);const value=score(n);if(value>best){best=value;act=a}}
    assert.ok(c.playerAct(act));c.enemyAct();assert.notEqual(c.area,'train','combat must survive without stat cheats: '+JSON.stringify({chapter:c.chapter,foe:c.battle?.key,player:c.player,stats:c.stats,notes:c.notes.slice(0,3)})+'');
  }
  assert.equal(c.battle,null);
}
function walk(c,key,answer){
  const target=c.objects.find(o=>o.key===key);
  if(c.position===target.id)c.interact(key);else assert.ok(c.travel(target.id,c.player.coins>=3?'astar':'dfs'));
  for(let i=0;i<2000;i++){
    if(c.battle)fight(c);
    if(c.choice){
      if(c.choice.type==='loot'){c.resolve('attack');if(key===target.key&&c.position===target.id)return}
      else if(c.position===target.id){assert.ok(c.resolve(answer),key+': '+answer);return}
      else c.resolve('close');
    }
    if(!c.route.length&&c.position===target.id)c.interact(key);else c.tick();
  }
  throw Error('Could not reach '+key);
}
test('legacy v1 migrates exact fog, pending combat, choices and route without resetting progression',()=>{
  // Synthetic fixture produced by the shipped 6c50714 v1 model, not a user's save.
  const raw=fs.readFileSync(new URL('./fixtures/campaign-v1.json',import.meta.url),'utf8');
  const old=JSON.parse(raw),c=Campaign.load(raw);
  assert.equal(c.version,2);assert.deepEqual(c.explored,old.explored);assert.deepEqual(c.visited,old.visited);assert.deepEqual(c.player,old.player);assert.deepEqual(c.flags,old.flags);assert.equal(c.position,old.position);assert.ok(c.battle.pending);assert.equal(c.objects.length,12);c.enemyAct();assert.equal(c.enemyAct(),false);
});
test('district maps remain reachable and have distinct unique optional signals',()=>{
  for(const id of ['copper','archive']){const s=makeDistrict(id);assert.equal(s.objects.length,12);assert.equal(new Set(s.objects.map(o=>o.id)).size,12);for(const o of s.objects)assert.ok(search(s.map,26,o.id,'bfs').path.length)}
  assert.notDeepEqual(makeDistrict('archive').map.cells,makeDistrict('copper').map.cells);
});
test('archive requires copper completion and district switching preserves fog and remaining objects',()=>{
  assert.equal(new Campaign().depart('archive'),false);
  const c=prepared();c.explored[27]=true;c.visited[27]=true;c.done.push('order');const copper=c.snapshot();
  assert.ok(c.depart('archive'));assert.equal(c.firstRoute,false);assert.equal(c.move(27),false);c.route=[27];c.returnHome();
  assert.ok(c.depart('copper'));assert.deepEqual(c.explored,copper.explored);assert.deepEqual(c.visited,copper.visited);assert.deepEqual(c.done,copper.done);assert.equal(c.route.length,0);
  c.returnHome();assert.ok(c.depart('archive'));const n=Campaign.load(c.save());assert.equal(n.chapter,'archive');assert.ok(n.completed('copper'));assert.ok(n.districts.copper.done.includes('order'));
});
test('both pumps, water decision and register gate the archive boss; revisiting pump resumes deferred choice',()=>{
  const c=prepared();c.depart('archive');at(c,'pump-west');assert.equal(c.resolve('activate'),false);
  at(c,'mira');c.resolve('meet');at(c,'pump-west');c.resolve('activate');at(c,'warden');assert.equal(c.choice.type,'locked');
  at(c,'pump-east');c.resolve('activate');assert.equal(c.choice.type,'water');c.resolve('close');at(c,'pump-west');c.resolve('configure');assert.equal(c.choice.type,'water');
  const n=Campaign.load(c.save());n.resolve('seal');at(n,'warden');assert.equal(n.choice.type,'locked');at(n,'register');assert.ok(n.resolve('read'));at(n,'warden');assert.ok(n.battle);
});
test('drain and seal have permanent distinct terrain and boss effects without revealing fog',()=>{
  for(const mode of ['drain','seal']){const c=prepared('train');c.depart('archive');c.flags.met=true;c.flags.pumps=['pump-west','pump-east'];c.choice={type:'water'};const before=[...c.explored],cells=[...c.map.cells],pots=c.player.potions;
    assert.ok(c.resolve(mode));assert.deepEqual(c.explored,before);assert.equal(c.player.potions,pots+2);
    if(mode==='drain')assert.ok(c.map.cells.every(v=>v<=1));else assert.deepEqual(c.map.cells,cells);
    c.choice={type:'water'};assert.equal(c.resolve(mode),false);assert.equal(c.player.potions,pots+2);c.choice=null;c.flags.record=true;at(c,'warden');assert.equal(c.battle.s[1].max,mode==='drain'?106:86);
  }
});
test('side quests and evidence pay once, repair and salvage are mutually exclusive',()=>{
  for(const action of ['repair','salvage']){const c=new Campaign();c.depart();at(c,'courier');const coins=c.player.coins;assert.ok(c.resolve(action));assert.equal(c.player.coins,coins+(action==='repair'?-4:8));assert.equal(c.evidence.includes('copperRescue'),action==='repair');assert.equal(c.interact('courier'),false);c.choice={type:'drone',key:'courier'};assert.equal(c.resolve(action),false)}
  const c=new Campaign();c.depart();at(c,'order');c.resolve('read');const coins=c.player.coins;c.choice={type:'record',key:'order'};assert.equal(c.resolve('read'),false);assert.equal(c.player.coins,coins);assert.deepEqual(c.evidence,['copperOrder']);
});
test('workshop purchases are capped, priced and persistent across districts; no in-field upgrades',()=>{
  const c=new Campaign();assert.equal(c.upgrade('hull'),false);c.flags.rescued=true;c.player.coins=100;assert.ok(c.upgrade('hull'));assert.equal(c.player.max,120);assert.equal(c.player.coins,88);assert.ok(c.upgrade('hull'));assert.equal(c.player.max,140);assert.equal(c.player.coins,64);assert.equal(c.upgrade('hull'),false);c.depart();assert.equal(c.upgrade('blade'),false);const n=Campaign.load(c.save());assert.equal(n.player.max,140);assert.equal(n.upgrades.hull,2);
});
test('Ilya support follows old power choice, preserves announced intent, survives reload and is once per expedition',()=>{
  for(const power of ['train','suppress']){const c=prepared(power);c.depart('archive');c.startBattle(c.objects.find(o=>o.type==='enemy'));c.battle.s[0].hp-=30;c.sync();const hp=c.player.hp,intent=c.battle.intent;assert.ok(c.support());assert.equal(c.battle.intent,intent);assert.equal(c.battle.pending,false);if(power==='train')assert.equal(c.player.hp,hp+18);else assert.ok(c.battle.s[0].guard);const n=Campaign.load(c.save());assert.equal(n.support(),false);n.battle=null;n.returnHome();n.depart('archive');n.startBattle(n.objects.find(o=>o.type==='enemy'));assert.ok(n.supportAvailable)}
});
test('Mira is not remotely rescued after a defeat, medbay refills only after she is onboard',()=>{
  const c=prepared();c.depart('archive');at(c,'mira');c.resolve('meet');c.startBattle(c.objects.find(o=>o.type==='enemy'));c.battle.s[0].hp=1;c.battle.s[0].potions=0;c.battle.s[1].atk=500;c.battle.intent='attack';c.battle.pending=true;c.enemyAct();assert.equal(c.flags.rescued,false);assert.equal(c.companion,null);c.resolve('close');c.depart('archive');c.returnHome();assert.equal(c.flags.rescued,false);c.depart('archive');at(c,'mira');c.resolve('meet');c.returnHome();assert.ok(c.flags.rescued);assert.equal(c.player.potions,2);
});
test('manual movement leaves uncharged cells chargeable and cannot reveal fog; exhaustion never heals',()=>{
  const c=new Campaign();c.depart();const path=search(c.map,26,c.objects[1].id,'bfs').path,id=path[1];c.firstRoute=true;c.explored[id]=true;const seen=[...c.explored];assert.ok(c.move(id));assert.equal(c.visited[id],false);assert.deepEqual(c.explored,seen);c.move(26);c.player.hp=7;assert.ok(c.move(id,true));assert.equal(c.player.hp,7);
});
test('four power/water combinations finish both chapters using actual navigation and shared combat',()=>{
  for(const power of ['suppress','train'])for(const water of ['drain','seal']){
    const c=new Campaign();c.depart();for(const [key,a] of [['ilya','meet'],['anchor-safe','install'],['power',power],['dispatcher','attack'],['home','return']])walk(c,key,a);
    assert.ok(c.completed('copper'));assert.ok(c.upgrade('hull'));assert.ok(c.depart('archive'));
    walk(c,'mira','meet');walk(c,'pump-west','activate');walk(c,'pump-east','activate');assert.ok(c.resolve(water));
    walk(c,'medicine','supplies');walk(c,'register','read');walk(c,'warden','attack');walk(c,'home','return');
    assert.ok(c.completed('archive'),power+'/'+water);assert.equal(c.fragments,2);assert.equal(c.passengers,2);assert.equal(c.stats.deaths,0);assert.ok(c.evidence.includes('archiveConsent'));assert.ok(c.player.potions>=2);
    const n=Campaign.load(c.save());assert.equal(n.fragments,2);assert.equal(n.flags.water,water);assert.equal(n.flagsOf('copper').power,power);
    const coins=n.player.coins;n.depart('archive');n.returnHome();assert.equal(n.player.coins,coins,'completion reward cannot be farmed');
  }
});
test('field potion has real resource cost, caps health and cannot bypass a combat turn',()=>{
  const c=new Campaign();assert.equal(c.drink(),false);c.depart();assert.equal(c.drink(),false);c.player.hp=90;assert.ok(c.drink());assert.equal(c.player.hp,100);assert.equal(c.player.potions,2);c.player.hp=30;c.startBattle(c.objects.find(o=>o.type==='enemy'));assert.equal(c.drink(),false);assert.equal(c.player.potions,2);
});
test('archive event choices and reload preserve the original paid route',()=>{
  const c=prepared();c.depart('archive');c.player.coins=30;assert.ok(c.travel(c.objects.find(o=>o.key==='warden').id,'bfs'));
  for(let i=0;i<500&&!c.choice&&!c.battle;i++)c.tick();assert.ok(c.choice);const path=[...c.route],coins=c.player.coins;
  const n=Campaign.load(c.save());assert.equal(n.tick(),false);assert.deepEqual(n.route,path);n.resolve(n.choice.type==='archivist'?'meet':'close');if(path.length){n.tick();assert.equal(n.position,path[0]);assert.equal(n.route.length,path.length-1)}assert.equal(n.player.coins,coins);
});
