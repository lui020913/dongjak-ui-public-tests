import {readFileSync,existsSync,writeFileSync,unlinkSync} from 'node:fs';
import {join,basename} from 'node:path';

// Explicitly opted in. Credentials are used only by this parent process, not the browser.
export function startRemoteRelay({root,scenes,result}){
 const uri=process.env.QA_RELAY_URL,key=process.env.QA_WRITER_KEY;
 if(!uri&&!key)return null;
 if(!uri||!key||key.length<32)throw Error('Remote relay requires HTTPS URL and a strong writer key');
 const url=new URL(uri);
 if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/')throw Error('Invalid relay origin');
 const run=basename(root);
 let stopped=false,timer=null,current=null,failures=0;
 const api=async(path,body)=>{
  const r=await fetch(new URL(path,url),{method:body?'POST':'GET',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),redirect:'error',signal:AbortSignal.timeout(6000)});
  if(!r.ok)throw Error('Relay HTTP '+r.status);
  return r.json();
 };
 async function publish(){
  const all=scenes(),s=all.findLast(x=>x.status==='running')||all.at(-1);
  let image='',metrics={};
  if(s?.frames){
   try{const b=readFileSync(join(root,s.id,'frames',String(s.frames).padStart(6,'0')+'.jpg'));if(b.length<=225000)image=b.toString('base64');}catch{}
  }
  if(s){
   try{const path=join(root,s.id,'metrics.ndjson');const data=readFileSync(path,'utf8').trim().split('\n').slice(-60).map(JSON.parse);const dt=data.map(x=>x.dt).filter(v=>Number.isFinite(v)&&v>0);metrics={samples:dt.length,over34Ms:dt.filter(v=>v>34).length,last:dt.at(-1)||null,viewport:data.at(-1)?.viewport||null};}catch{}
  }
  await api('/api/publish',{run,image,scene:{id:s?.id||null,title:s?.title||'검증 준비 중',project:s?.project||'',status:s?.status||'starting',frames:s?.frames||0},metrics,summary:{result:result(),scenes:all.length,passed:all.filter(x=>x.status==='passed').length,failed:all.filter(x=>['failed','timedOut','interrupted'].includes(x.status)).length}});
  if(result()===null){
    const control=await api('/api/runner');
    const pause=join(root,'pause');
    if(control.paused)writeFileSync(pause,'');
    else if(existsSync(pause))unlinkSync(pause);
  }
 }
 async function tick(){
  if(stopped)return;
  try{await publish();failures=0;}catch(e){if(++failures===1||failures%10===0)console.error('Remote QA unavailable: '+e.message);}
  if(!stopped)timer=setTimeout(()=>{current=tick();},1000);
 }
 current=tick();
 return {async finish(){stopped=true;clearTimeout(timer);await current;try{await publish();}catch(e){console.error('Final remote QA update unavailable: '+e.message);}}};
}
