import {readFileSync,writeFileSync,unlinkSync,statSync,existsSync} from 'node:fs';
import {join,basename} from 'node:path';
export function startLiveStream({root,scenes,result,lane}){
 const uri=process.env.QA_RELAY_URL,key=process.env.QA_WRITER_KEY;
 if(!uri&&!key)return null;
 if(!uri||!key||!/^[-_a-zA-Z0-9]{32,128}$/.test(key))throw Error('Invalid relay credentials');
 const url=new URL(uri);
 if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/')throw Error('Invalid relay origin');
 url.protocol='wss:';url.pathname='/api/live';url.searchParams.set('lane',String(lane));
 let ws,done=false,watching=false,reconnect,timer,scene=null,lastMeta=0,lastFrame='',lastSend=0,failures=0;
 const flag=(name,on)=>{const p=join(root,name);if(on){if(!existsSync(p))writeFileSync(p,'');}else if(existsSync(p))unlinkSync(p);};
 function control(on,pause){watching=on;flag('watching',on);if(typeof pause==='boolean')flag('pause',pause);}
 function sendMeta(){
  const all=scenes();scene=all.findLast(s=>s.status==='running')||all.at(-1);
  let metrics={};if(scene){try{const rows=readFileSync(join(root,scene.id,'metrics.ndjson'),'utf8').trim().split('\n').slice(-60).map(JSON.parse);const dt=rows.map(x=>x.dt).filter(v=>Number.isFinite(v)&&v>0);metrics={samples:dt.length,over34Ms:dt.filter(v=>v>34).length,last:dt.at(-1)||null};}catch{}}
  ws.send(JSON.stringify({type:'state',run:basename(root),lane,scene:scene?{title:scene.title,project:scene.project,status:scene.status}:null,metrics,result:result(),passed:all.filter(s=>s.status==='passed').length,failed:all.filter(s=>['failed','timedOut','interrupted'].includes(s.status)).length}));
 }
 function tick(){
  if(done||ws?.readyState!==1)return;
  try{
   const now=performance.now();
   if(now-lastMeta>=500){sendMeta();lastMeta=now;}
   if(!watching||!scene||ws.bufferedAmount>500000||now-lastSend<1000/60)return;
   const p=join(root,scene.id,'latest.jpg');
   let st;try{st=statSync(p);}catch{return;}
   const id=p+':'+st.mtimeMs+':'+st.size;
   if(id===lastFrame||st.size>225000)return;
   const bytes=readFileSync(p);
   ws.send(bytes);lastFrame=id;lastSend=now;
  }catch(e){if(++failures===1||failures%100===0)console.error('Live QA stream frame unavailable: '+e.message);}
 }
 function connect(){
  if(done)return;
  const socket=new WebSocket(url,['qa-v2.writer',key]);ws=socket;
  socket.addEventListener('open',()=>{if(ws!==socket)return;lastMeta=0;lastFrame='';console.log('Live QA lane '+lane+' connected');sendMeta();});
  socket.addEventListener('message',e=>{if(ws!==socket||typeof e.data!=='string')return;try{const d=JSON.parse(e.data);if(d.type==='control')control(d.watching===true,d.paused);}catch{}});
  socket.addEventListener('error',()=>{if(++failures===1||failures%10===0)console.error('Live QA lane '+lane+' connection unavailable; reconnecting');});
  socket.addEventListener('close',()=>{if(ws!==socket)return;control(false,false);if(!done)reconnect=setTimeout(connect,1500);});
 }
 connect();timer=setInterval(tick,8);
 return {async finish(){done=true;clearInterval(timer);clearTimeout(reconnect);control(false,false);if(ws?.readyState===1){try{sendMeta();}catch{}await new Promise(r=>setTimeout(r,500));ws.close(1000,'finished');}else if(ws?.readyState===0)ws.close();}};
}
