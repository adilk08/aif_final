import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DialogueSession,DialogueVoice,LINES,VOICE_SCRIPTS} from './campaign-presentation.js';
import {VOICE_MANIFEST} from './assets/voices/manifest.js';

test('paging dialogue never grants a reward or resolves a choice before its final line',()=>{
  let rewards=0;const s=new DialogueSession(['meet','anchor','scout'],[{run:()=>rewards++}]);
  assert.equal(s.choose(0),false);assert.equal(rewards,0);assert.equal(s.current.id,'meet');
  s.advance();assert.equal(s.choose(0),false);s.advance();assert.equal(s.last,true);
  assert.equal(s.advance(),false);assert.equal(s.choose(0),true);assert.equal(rewards,1);
  assert.equal(s.choose(0),false);assert.equal(s.advance(),false);assert.equal(rewards,1);
});
test('disabled dialogue answers cannot execute campaign actions',()=>{
  let calls=0;const s=new DialogueSession(['safe'],[{disabled:true,run:()=>calls++}]);
  assert.equal(s.choose(0),false);assert.equal(s.choose(9),false);assert.equal(calls,0);
  assert.throws(()=>new DialogueSession(['missing'],[]));
});
function audioHarness(){const made=[];const make=src=>{const a={src,paused:false,play:()=>Promise.resolve(),pause(){this.paused=true}};made.push(a);return a};return {made,make}}
test('voice is opt-in, and changing a phrase stops the previous audio',async()=>{
  const h=audioHarness(),v=new DialogueVoice({a:{src:'a'},b:{src:'b'}},h.make);
  assert.equal(await v.play('a'),false);assert.equal(h.made.length,0);v.setEnabled(true);
  assert.equal(await v.play('a'),true);assert.equal(await v.play('b'),true);
  assert.equal(h.made[0].paused,true);assert.equal(h.made[0].onerror,null);
  v.setEnabled(false);assert.equal(h.made[1].paused,true);assert.equal(v.audio,null);
});
test('late audio start cannot revive speech after a dialogue was closed',async()=>{
  let finish;const a={play:()=>new Promise(r=>finish=r),pause(){this.paused=true}};
  const v=new DialogueVoice({a:{src:'a'}},()=>a);v.setEnabled(true);const pending=v.play('a');v.stop();finish();
  assert.equal(await pending,false);assert.equal(v.audio,null);assert.ok(a.paused);
});
test('blocked or unavailable audio fails without blocking the text dialogue',async()=>{
  let errors=0;const v=new DialogueVoice({a:{src:'a'}},()=>({pause(){},play:()=>Promise.reject(Error('blocked'))}));v.setEnabled(true);v.onFailure=()=>errors++;
  assert.equal(await v.play('a'),false);assert.equal(v.audio,null);assert.equal(errors,1);
  assert.equal(await v.play('missing'),false);assert.equal(errors,1);
});
test('all subtitle phrases have real local audio and belong to one character script',()=>{
  const scriptIds=Object.values(VOICE_SCRIPTS).flat().map(line=>line.id);
  assert.equal(new Set(scriptIds).size,Object.keys(LINES).length);
  assert.deepEqual(Object.keys(VOICE_MANIFEST).sort(),Object.keys(LINES).sort());
  for(const [id,entry] of Object.entries(VOICE_MANIFEST)){
    assert.ok(entry.src.startsWith('assets/voices/'));assert.ok(entry.duration>0&&entry.duration<20,id);
    assert.ok(fs.statSync(entry.src).size>500,id);assert.ok(LINES[id].text.length<180,id);
  }
});
