import {liveRole,liveMessage,liveDashboard} from './live-stream.mjs';
// Optional isolated Cloudflare Durable Object relay. No app routes or app bindings.
const MAX=450_000, LOCK='live-qa-single-operator';
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
async function equals(a,b){
 if(typeof a!=='string'||typeof b!=='string'||!b||a.length>512)return false;
 const enc=new TextEncoder(),x=new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(a))),y=new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(b)));
 let d=0;for(let i=0;i<x.length;i++)d|=x[i]^y[i];return d===0;
}
const dashboard=`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>안전지도 · 원격 QA</title><style>body{margin:20px;background:#121a16;color:#e3efe7;font:15px system-ui}main{display:grid;grid-template-columns:minmax(220px,390px) minmax(240px,1fr);gap:18px;max-width:1000px;margin:auto}section{background:#202c25;border-radius:12px;padding:16px}img{width:100%;border-radius:10px}button,input{font:inherit;padding:8px;background:#344a3b;color:white;border:1px solid #728779;border-radius:6px}pre{white-space:pre-wrap;overflow-wrap:anywhere}h1{font-size:20px}small{color:#9db6a5}@media(max-width:700px){main{grid-template-columns:1fr}}</style><h1>동작하는 안전지도 · 원격 검증</h1><p><input id="key" type="password" autocomplete="current-password" placeholder="운영자 접근 키"><button id="login">연결</button> <span id="state">미연결</span></p><main><section><img id="screen" alt="검증 화면 대기"><p><button id="pause">다음 장면에서 정지</button> <button id="resume">재개</button></p><small>최신 이미지 약 1초 간격 · 영상 녹화와 별도</small></section><section><h2 id="title">장면 대기</h2><pre id="metrics"></pre><pre id="errors"></pre><p><small>전체 녹화 및 프레임 탐색은 GitHub 결과물 또는 로컬 콘솔에서 확인합니다.</small></p></section></main><script>
let key='',timer=null;const $=id=>document.getElementById(id);async function api(path,method='GET',data){const r=await fetch(path,{method,headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},...(data?{body:JSON.stringify(data)}:{})});if(!r.ok)throw Error(r.status);return r.json()}
async function tick(){if(!key)return;try{const d=await api('/api/watch');$('state').textContent=d.stale?'연결 대기 또는 종료':d.packet?.summary?.result===0?'검증 완료':typeof d.packet?.summary?.result==='number'?'검증 실패':d.paused?'일시정지 예약':'연결됨';$('title').textContent=d.packet?.scene?.title||'장면 대기';$('metrics').textContent=JSON.stringify(d.packet?.metrics||{},null,2);$('errors').textContent=JSON.stringify(d.packet?.summary||{},null,2);if(d.packet?.image)$('screen').src='data:image/jpeg;base64,'+d.packet.image;else $('screen').removeAttribute('src')}catch(e){$('state').textContent='접속 실패: '+e.message}finally{if(key)timer=setTimeout(tick,1000)}}
$('login').onclick=()=>{clearTimeout(timer);key=$('key').value;$('key').value='';tick()};for(const [id,paused] of [['pause',true],['resume',false]])$(id).onclick=()=>api('/api/control','POST',{paused}).catch(e=>$('state').textContent='제어 실패: '+e.message);
</script></html>`;
export default {
 async fetch(req,env){
  const u=new URL(req.url), p=u.pathname;
  if(req.method==='GET'&&(p==='/'||p==='/legacy'))return new Response(p==='/'?liveDashboard:dashboard,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Frame-Options':'DENY','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'self' wss:; frame-ancestors 'none'"}});
  if(p==='/api/live'){
   const auth=liveRole(req);
   if(!auth)return json({error:'invalid websocket'},400);
   if(!env.QA_WRITER_KEY||!env.QA_VIEWER_KEY||env.QA_WRITER_KEY.length<32||env.QA_VIEWER_KEY.length<32||env.QA_WRITER_KEY===env.QA_VIEWER_KEY)return json({error:'not configured'},503);
   if(!await equals(auth.key,auth.role==='writer'?env.QA_WRITER_KEY:env.QA_VIEWER_KEY))return json({error:'unauthorized'},401);
   const internal=new Request(req.url,{headers:{Upgrade:'websocket','Sec-WebSocket-Protocol':auth.protocol,'X-QA-Role':auth.role}});
   return env.QA_SESSION.get(env.QA_SESSION.idFromName('live-lane-'+auth.lane)).fetch(internal);
  }
  const writer=p==='/api/publish'||p==='/api/runner';
  const viewer=p==='/api/watch'||p==='/api/control';
  if(!writer&&!viewer)return json({error:'not found'},404);
  if(!env.QA_WRITER_KEY||!env.QA_VIEWER_KEY||env.QA_WRITER_KEY.length<32||env.QA_VIEWER_KEY.length<32||env.QA_WRITER_KEY===env.QA_VIEWER_KEY)return json({error:'not configured'},503);
  if(!await equals(req.headers.get('Authorization')||'','Bearer '+(writer?env.QA_WRITER_KEY:env.QA_VIEWER_KEY)))return json({error:'unauthorized'},401);
  const wanted=p==='/api/publish'||p==='/api/control'?'POST':'GET';
  if(req.method!==wanted)return json({error:'method'},405);
  if(p==='/api/control'&&req.headers.get('Origin')!==u.origin)return json({error:'origin'},403);
  if(req.method==='POST'){
   const reader=req.body?.getReader();let length=0;const chunks=[];
   if(!reader)return json({error:'empty'},400);
   for(;;){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>MAX){await reader.cancel();return json({error:'too large'},413)}chunks.push(value)}
   const b=new Uint8Array(length);let n=0;for(const c of chunks){b.set(c,n);n+=c.length}
   req=new Request(req.url,{method:'POST',body:b,headers:{'Content-Type':'application/json'}});
  }
  return env.QA_SESSION.get(env.QA_SESSION.idFromName(LOCK)).fetch(req);
 }
};
export class QASession{
 constructor(ctx){this.ctx=ctx;this.storage=ctx.storage;this.paused=false;}
 async fetch(req){
  const p=new URL(req.url).pathname;
  if(p==='/api/live'){
   const role=req.headers.get('X-QA-Role'),protocol=req.headers.get('Sec-WebSocket-Protocol');
   if(!['writer','viewer'].includes(role)||protocol!=='qa-v2.'+role)return json({error:'invalid role'},400);
   if(role==='writer'&&this.ctx.getWebSockets('writer').length)return json({error:'lane busy'},409);
   const pair=new WebSocketPair(),[client,server]=Object.values(pair);
   this.ctx.acceptWebSocket(server,[role]);server.serializeAttachment({role,paused:false});
   this.liveControl();
   if(role==='viewer')this.emit(server,JSON.stringify({type:'availability',online:this.ctx.getWebSockets('writer').length>0}));
   return new Response(null,{status:101,webSocket:client,headers:{'Sec-WebSocket-Protocol':protocol}});
  }
  const control=await this.storage.get('control')||{paused:false};
  if(p==='/api/runner')return json(control);
  if(p==='/api/control'){
   let body;try{body=await req.json()}catch{return json({error:'invalid JSON'},400)}
   if(typeof body.paused!=='boolean')return json({error:'invalid control'},400);
   await this.storage.put('control',{paused:body.paused});return json({ok:true});
  }
  if(p==='/api/watch'){
   const packet=await this.storage.get('packet');
   const stale=!packet||Date.now()-packet.received>30_000;
   // Old images are not shown indefinitely. No permanent remote capture history.
   return json({paused:control.paused,stale,packet:stale?null:packet});
  }
  if(p==='/api/publish'){
   let d;try{d=await req.json()}catch{return json({error:'invalid JSON'},400)}
   if(!d||typeof d.run!=='string'||d.run.length>100||typeof d.image!=='string'||d.image.length>300_000||!(/^[A-Za-z0-9+/]*={0,2}$/.test(d.image))||!d.scene||typeof d.scene.title!=='string'||d.scene.title.length>600)return json({error:'invalid packet'},400);
   const previous=await this.storage.get('packet');
   if(previous&&previous.run!==d.run&&Date.now()-previous.received<30_000&&previous.summary?.result===null)return json({error:'another active runner'},409);
   if(previous&&previous.run!==d.run)await this.storage.put('control',{paused:false});
   await this.storage.put('packet',{run:d.run,image:d.image,scene:d.scene,metrics:d.metrics||{},summary:d.summary||{},received:Date.now()});
   await this.storage.setAlarm(Date.now()+120_000);
   return json({ok:true});
  }
  return json({error:'not found'},404);
 }
 emit(ws,message){try{ws.send(message);}catch{try{ws.close(1011,'send failed');}catch{}}}
 liveControl(exclude){
  const viewers=this.ctx.getWebSockets('viewer').filter(w=>w!==exclude);
  const writers=this.ctx.getWebSockets('writer').filter(w=>w!==exclude);
  for(const w of writers){
   const a=w.deserializeAttachment()||{role:'writer',paused:false};
   this.emit(w,JSON.stringify({type:'control',watching:viewers.length>0,paused:a.paused===true}));
  }
 }
 webSocketMessage(ws,message){
  const role=ws.deserializeAttachment()?.role,m=liveMessage(role,message);if(!m)return;
  if(role==='writer'){
   for(const v of this.ctx.getWebSockets('viewer'))this.emit(v,m.data);
  }else if(m.type==='pause'){
   for(const w of this.ctx.getWebSockets('writer'))w.serializeAttachment({role:'writer',paused:m.paused});
   this.liveControl();
  }
 }
 webSocketClose(ws,code){
  const role=ws.deserializeAttachment()?.role;
  try{ws.close(code===1006?1011:code,'closed');}catch{}
  if(role==='viewer'){
   if(!this.ctx.getWebSockets('viewer').some(v=>v!==ws)){
    for(const w of this.ctx.getWebSockets('writer'))w.serializeAttachment({role:'writer',paused:false});
   }
   this.liveControl(ws);
  }else if(role==='writer'){
   for(const v of this.ctx.getWebSockets('viewer'))this.emit(v,JSON.stringify({type:'availability',online:false}));
  }
 }
 webSocketError(ws){this.webSocketClose(ws,1011);}
 async alarm(){await this.storage.deleteAll();}
}
