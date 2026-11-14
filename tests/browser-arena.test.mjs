import test from 'node:test';
import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import { once } from 'node:events';
import { readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { browserEngine } from '../war-integration/browser/engine.ts';
import { recordResult, readResults, localProgress, assertUnlocked } from '../src/war/browser-state.ts';

test('browser config hides enemy source in event and exposes both programs in spectator',()=>{
  const event=browserEngine({action:'config',opponent:'claude',mode:'event'});
  assert.equal(event.villains[0].program,undefined);
  assert.ok(event.starter.body.length);
  const spectator=browserEngine({action:'config',opponent:'astra',agentA:'claude',mode:'spectator'});
  assert.ok(spectator.villains[0].program.body.length);
  assert.ok(spectator.starter.body.length);
  assert.throws(()=>browserEngine({action:'config',opponent:'evil-darwin'}));
});

test('local victories unlock missions, draws and defeats do not, duplicate results do not count',()=>{
  const storage=new Map();
  globalThis.localStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)};
  assert.throws(()=>assertUnlocked('astra'));
  recordResult('loss','claude','B');
  recordResult('draw','claude','DRAW');
  assert.throws(()=>assertUnlocked('astra'));
  recordResult('win','claude','A');recordResult('win','claude','A');
  assert.deepEqual(localProgress().unlockedChallengeIds,['easy','medium']);
  assert.doesNotThrow(()=>assertUnlocked('astra'));
  assert.equal(readResults().wins,1);
  assert.equal(readResults().losses,1);
  assert.equal(readResults().draws,1);
  recordResult('second','astra','A');
  assert.ok(localProgress().unlockedChallengeIds.includes('hard'));
});

test('compiled browser worker returns config and executes a real match without an HTTP API',{timeout:60000,skip:!existsSync(new URL('../dist/assets/',import.meta.url))},async()=>{
  const files=await readdir(new URL('../dist/assets/',import.meta.url));
  const filename=files.find(file=>/^worker-.*\.js$/.test(file));
  assert.ok(filename,'Build the site before running this integration check.');
  const url=new URL('../dist/assets/'+filename,import.meta.url).href;
  const worker=new Worker('const {parentPort}=require("node:worker_threads");globalThis.self=globalThis;self.postMessage=value=>parentPort.postMessage(value);import('+JSON.stringify(url)+').then(()=>{parentPort.on("message",data=>self.onmessage({data}));parentPort.postMessage({ready:true});});',{eval:true});
  try {
    await once(worker,'message');
    worker.postMessage({action:'catalog'});
    const [catalog]=await once(worker,'message');assert.equal(catalog.result.agents.length,3);
    worker.postMessage({action:'match',mode:'spectator',agentA:'claude',villainId:'astra',durationSeconds:1});
    const [match]=await once(worker,'message');assert.ok(!match.error,match.error);
    assert.ok(['A','B','DRAW'].includes(match.result.winner));assert.equal(match.result.durationLimit,1);
    assert.ok(match.result.debugFrames.length);
    worker.postMessage({action:'match',program:{schemaVersion:1,body:[{op:'wait',seconds:1}]},villainId:'claude',durationSeconds:1});
    const [event]=await once(worker,'message');assert.ok(!event.error,event.error);
    assert.equal(event.result.durationLimit,720);
  } finally {await worker.terminate();}
});
