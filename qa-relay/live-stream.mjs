// Dedicated per-lane, in-memory WebSocket fan-out. No frame storage or HTTP polling.
export function liveRole(req){
 const url=new URL(req.url),lane=url.searchParams.get('lane'),p=(req.headers.get('Sec-WebSocket-Protocol')||'').split(',').map(x=>x.trim());
 if(req.method!=='GET'||req.headers.get('Upgrade')?.toLowerCase()!=='websocket'||!/^([1-9]|1[0-9]|20)$/.test(lane||'')||p.length!==2||!['qa-v2.writer','qa-v2.viewer'].includes(p[0]))return null;
 const role=p[0].split('.')[1];if(role==='viewer'&&req.headers.get('Origin')!==url.origin)return null;
 return {role,lane,protocol:p[0],key:p[1]};
}
export function liveMessage(role,message){
 if(role==='writer'){
  if(message instanceof ArrayBuffer)return message.byteLength>0&&message.byteLength<=225000?{type:'frame',data:message}:null;
  if(typeof message!=='string'||message.length>8000)return null;
  try{const d=JSON.parse(message);return d.type==='state'&&typeof d.run==='string'&&d.run.length<100&&Number.isInteger(d.lane)?{type:'state',data:message}:null;}catch{return null;}
 }
 if(role==='viewer'&&typeof message==='string'&&message.length<128){try{const d=JSON.parse(message);if(d.type==='pause'&&typeof d.paused==='boolean')return {type:'pause',paused:d.paused};}catch{}}
 return null;
}
export const liveDashboard=`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>안전지도 · Live QA</title><style>body{margin:20px;background:#121a16;color:#e3efe7;font:15px system-ui}main{display:grid;grid-template-columns:minmax(220px,390px) minmax(240px,1fr);gap:18px;max-width:1000px;margin:auto}section{background:#202c25;border-radius:12px;padding:16px}canvas{width:100%;border-radius:10px;background:#14201a;aspect-ratio:390/844;object-fit:contain}button,input,select{font:inherit;padding:8px;background:#344a3b;color:white;border:1px solid #728779;border-radius:6px}pre{white-space:pre-wrap;overflow-wrap:anywhere}h1{font-size:20px}small{color:#9db6a5}a{color:#a9e3ba}@media(max-width:700px){main{grid-template-columns:1fr}}</style><h1>동작하는 안전지도 · Live QA</h1><p><input id="key" type="password" autocomplete="current-password" placeholder="운영자 접근 키"> <button id="login">연결</button> <label>실행기 <select id="lane"></select></label> <span id="state">미연결</span></p><main><section><canvas id="screen" width="390" height="844"></canvas><p>수신 <b id="received">0</b> FPS · 표시 <b id="fps">0</b> FPS (목표 60)</p><button id="pause">다음 장면에서 정지</button> <button id="resume">재개</button><p><small>실행기별 전송 · Chromium 화면 변화에 따라 실제 FPS가 달라집니다. WebKit은 영상 기록을 별도로 확인하세요.</small></p></section><section><h2 id="title">장면 대기</h2><pre id="metrics"></pre><pre id="summary"></pre><p><a href="/legacy">기존 1 FPS 관제</a></p></section></main><script>
const $=id=>document.getElementById(id),canvas=$('screen'),ctx=canvas.getContext('2d');let key='',ws,latest=null,busy=false,incoming=0,shown=0;
for(let i=1;i<=20;i++){const o=document.createElement('option');o.value=i;o.textContent='실행기 '+i;$('lane').append(o);}
function status(s){$('state').textContent=s;}
function connect(){if(!key)return;if(ws)ws.close();latest=null;ctx.clearRect(0,0,canvas.width,canvas.height);$('title').textContent='장면 대기';$('metrics').textContent='';$('summary').textContent='';incoming=shown=0;status('연결 중');const url=new URL('/api/live',location.href);url.protocol='wss:';url.searchParams.set('lane',$('lane').value);const socket=new WebSocket(url,['qa-v2.viewer',key]);ws=socket;socket.binaryType='arraybuffer';
socket.onopen=()=>{if(ws===socket)status('실행기 대기');};socket.onclose=()=>{if(ws===socket)status('연결 종료 또는 키 확인 필요');};socket.onerror=()=>{if(ws===socket)status('연결 실패');};
socket.onmessage=e=>{if(ws!==socket)return;if(e.data instanceof ArrayBuffer){incoming++;latest={bytes:e.data,socket};return;}try{const d=JSON.parse(e.data);if(d.type==='state'){status(d.result===null?'검증 진행 중':d.result===0?'검증 완료':'검증 실패');$('title').textContent=(d.scene?.project||'')+' '+(d.scene?.title||'준비 중');$('metrics').textContent=JSON.stringify(d.metrics||{},null,2);$('summary').textContent=JSON.stringify({lane:d.lane,passed:d.passed,failed:d.failed,result:d.result},null,2);}else if(d.type==='availability'&&!d.online)status('실행기 대기 또는 종료');}catch{}};
}
$('login').onclick=()=>{const v=$('key').value;if(v)key=v;$('key').value='';try{connect();}catch{status('키 형식을 확인하세요');}};$('lane').onchange=()=>connect();
for(const [id,paused] of [['pause',true],['resume',false]])$(id).onclick=()=>{if(ws?.readyState===1)ws.send(JSON.stringify({type:'pause',paused}));};
setInterval(()=>{$('received').textContent=incoming;$('fps').textContent=shown;incoming=shown=0;},1000);
async function draw(){if(!busy&&latest){const {bytes,socket}=latest;latest=null;busy=true;try{const bitmap=await createImageBitmap(new Blob([bytes],{type:'image/jpeg'}));if(ws===socket){canvas.width=bitmap.width;canvas.height=bitmap.height;ctx.drawImage(bitmap,0,0);shown++;}bitmap.close();}catch{}finally{busy=false;}}requestAnimationFrame(draw);}requestAnimationFrame(draw);
</script></html>`;
