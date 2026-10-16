import {spawn} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {setTimeout as pause} from 'node:timers/promises';
import assert from 'node:assert/strict';

const exe=resolve(process.argv[2]??'release-staging/desktop/win-unpacked/Figma Designer.exe');
const record=join(process.env.APPDATA,'Figma Designer/desktop-status.json');
const launchedAt=Date.now(),child=spawn(exe,[],{stdio:'ignore',windowsHide:true});
let status,health;
try{
  for(let i=0;i<120;i++){try{status=JSON.parse(await readFile(record,'utf8'));if(status.pid===child.pid)break;}catch{}if(child.exitCode!==null)throw Error('Desktop exited before ready');await pause(500);}
  assert.equal(status?.pid,child.pid,'Only this smoke test may own/stop the desktop');
  const originURL=new URL(status.origin);assert.equal(originURL.hostname,'127.0.0.1');const origin=originURL.origin;
  for(let i=0;i<90;i++){try{health=await fetch(origin+'/api/app/status').then(r=>r.json());if(['READY','EXTERNAL'].includes(health.engine?.state))break;}catch{}await pause(500);}
  assert.equal(health.runtime,'VERIFIED');assert.equal(health.engine.state,'READY');
  const restored=await fetch(origin+'/api/runs').then(r=>r.json());
  assert.ok(restored.every(run=>run.state!=='RUNNING'&&Date.parse(run.startedAt)<=launchedAt),'Startup may restore history but must not submit a task');
  const duplicate=spawn(exe,[],{stdio:'ignore',windowsHide:true});
  await new Promise((resolve,reject)=>{duplicate.once('error',reject);duplicate.once('exit',code=>code===0?resolve():reject(Error('Second launch failed')));});
  const same=JSON.parse(await readFile(record,'utf8'));assert.equal(same.pid,child.pid);assert.equal(same.servicePid,status.servicePid);
  child.kill();
  let stopped=false;for(let i=0;i<100;i++){try{await fetch(origin,{signal:AbortSignal.timeout(500)});}catch{stopped=true;break;}await pause(250);}
  assert.equal(stopped,true,'Owned service must close after shell termination');
  let engineStopped=false;for(let i=0;i<100;i++){try{await fetch('http://127.0.0.1:'+health.engine.port+'/api/info',{signal:AbortSignal.timeout(500)});}catch{engineStopped=true;break;}await pause(250);}
  assert.equal(engineStopped,true,'Owned engine must stop after shell termination');
  const proof={startup:'PASS',runtime:health.runtime,engine:'READY',singleInstance:'PASS',startupTasks:0,forceCloseService:'PASS',forceCloseEngine:'PASS'};
  await writeFile('release-staging/desktop/DESKTOP_SMOKE.json',JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));
}finally{if(status?.pid===child.pid&&child.exitCode===null)child.kill();}
