/**
 * Start the MapLibre/Vite application and the local Seoul transport API proxy
 * together. Does not change keys or kill other processes.
 */
import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const vite=join(root,'node_modules','vite','bin','vite.js');
const api=join(root,'server','transport-proxy.mjs');
if(!existsSync(vite)){
  console.error('[실행 중단] 먼저 프로젝트 폴더에서 npm ci 를 실행하세요.');
  process.exit(1);
}
if(!existsSync(join(root,'.env'))){
  console.warn('[인증키 누락] .env 파일이 없습니다. 인증키 없이 교통정보를 가져올 수 없습니다.');
}

const processes=[];
let closing=false;
function launch(label,args){
  const child=spawn(process.execPath,args,{cwd:root,stdio:'inherit',windowsHide:false});
  processes.push(child);
  child.on('error',err=>{
    console.error(`[${label}] 실행 실패: ${err.message}`);
    shutdown(1);
  });
  child.on('exit',(code,signal)=>{
    if(closing)return;
    console.error(`[${label}] 종료됨 (${signal||code}). 실행 중인 서버를 함께 종료합니다.`);
    shutdown(code||1);
  });
}
function shutdown(code=0){
  if(closing)return;
  closing=true;
  for(const p of processes){
    try{if(!p.killed)p.kill();}catch{}
  }
  // Windows spawn() child is a Node process; both listen on localhost only.
  setTimeout(()=>process.exit(code),350).unref();
}
process.on('SIGINT',()=>shutdown(0));
process.on('SIGTERM',()=>shutdown(0));
console.log('[동작하는 안전지도] 지도 5195 + 교통 API 5178을 한 터미널에서 실행합니다.');
console.log('지도: http://127.0.0.1:5195/');
console.log('교통 API 확인: http://127.0.0.1:5195/api/transport/status');
console.log('종료: Ctrl+C');
launch('교통 API',[api]);
launch('지도',[vite,'--config','vite.config.js','--host','127.0.0.1','--port','5195','--strictPort']);
