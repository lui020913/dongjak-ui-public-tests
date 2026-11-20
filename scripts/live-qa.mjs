import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {mkdirSync,readFileSync,readdirSync,existsSync,writeFileSync,unlinkSync,appendFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {startRemoteRelay} from './live-qa-relay.mjs';

const ci=process.argv.includes('--ci'), root=resolve('qa-artifacts',new Date().toISOString().replace(/[:.]/g,'-'));
mkdirSync(root,{recursive:true});
const target=new URL(process.env.DONGJAK_TARGET_URL||'https://dongjak-walk-safety-preview.pages.dev/');
if(target.protocol!=='https:'||target.username||target.password||target.search||target.hash||!/^([a-z0-9-]+\.)?dongjak-walk-safety-preview\.pages\.dev$/.test(target.hostname))throw Error('Only anonymous Dongjak Pages targets allowed');
const token=randomUUID(), port=Number(process.env.QA_PORT||8765);
let result=null;
const projects=process.argv.includes('--full')?['mobile375','mobile390','mobile430','mobile390-webkit-header']:['mobile390'];
const args=['exec','--','playwright','test','--config=playwright.v911-remote.config.mjs','--workers=1',...projects.map(p=>'--project='+p)];
if(process.argv.includes('--smoke-target'))args.push('--grep','phone weather single window and layer grid dark surfaces');
const safeId=/^[a-f0-9-]{36}$/;
const scenes=()=>readdirSync(root).filter(n=>safeId.test(n)).flatMap(id=>{try{return [JSON.parse(readFileSync(join(root,id,'meta.json'),'utf8'))]}catch{return []}}).sort((a,b)=>a.start-b.start);
const remote=startRemoteRelay({root,scenes,result:()=>result});
const childEnv={...process.env,DONGJAK_TARGET_URL:target.href,DONGJAK_LIVE_QA_DIR:root,DONGJAK_FULL_MOBILE_QA:process.argv.includes('--full')?'1':'0'};
for(const k of ['QA_WRITER_KEY','QA_VIEWER_KEY','QA_RELAY_URL','GEMINI_API_KEY','CLOUDFLARE_API_TOKEN','QA_CF_API_TOKEN'])delete childEnv[k];
const child=spawn(process.platform==='win32'?'npm.cmd':'npm',args,{stdio:['ignore','pipe','pipe'],env:childEnv,shell:process.platform==='win32'});
for(const [stream,dst] of [[child.stdout,process.stdout],[child.stderr,process.stderr]])stream.on('data',b=>{dst.write(b);appendFileSync(join(root,'runner.log'),b);});
child.on('error',e=>{result=1;console.error(e);});
child.on('close',async code=>{result=code??1;writeFileSync(join(root,'result.json'),JSON.stringify({code:result,target:target.href}));if(ci)process.exitCode=result;if(remote)await remote.finish();});
if(!ci){
  const html=readFileSync(fileURLToPath(new URL('./live-qa.html',import.meta.url)),'utf8');
  const send=(res,status,body,type='application/json')=>{res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY','Content-Security-Policy':"default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self'; connect-src 'self'; frame-ancestors 'none'"});res.end(body);};
  const json=(res,val)=>send(res,200,JSON.stringify(val));
  const server=createServer(async(req,res)=>{
    try{
      if(req.headers.host!=='127.0.0.1:'+port)return send(res,403,'{}');
      const url=new URL(req.url,'http://127.0.0.1:'+port), parts=url.pathname.split('/');
      if(req.method==='GET'&&url.pathname==='/')return send(res,200,html.replace('__CONTROL_TOKEN__',token),'text/html; charset=utf-8');
      if(req.method==='GET'&&url.pathname==='/api/state')return json(res,{scenes:scenes(),result,target:target.href,paused:existsSync(join(root,'pause'))});
      if(req.method==='GET'&&safeId.test(parts[2]||'')&&parts.length===4){
        const dir=join(root,parts[2]), file=parts[3];
        if(parts[1]==='frame'&&/^\d{6}\.jpg$/.test(file))return send(res,200,readFileSync(join(dir,'frames',file)),'image/jpeg');
        if(parts[1]==='data'&&['metrics.ndjson','frame-times.ndjson','events.ndjson'].includes(file))return send(res,200,readFileSync(join(dir,file)),'text/plain; charset=utf-8');
      }
      if(req.method==='POST'&&req.headers.origin==='http://127.0.0.1:'+port&&req.headers['x-qa-token']===token){
        if(url.pathname==='/api/pause'){writeFileSync(join(root,'pause'),'');return json(res,{ok:true});}
        if(url.pathname==='/api/resume'){if(existsSync(join(root,'pause')))unlinkSync(join(root,'pause'));return json(res,{ok:true});}
        if(url.pathname==='/api/report'){
          let b='';for await(const c of req){b+=c;if(b.length>5000)return send(res,413,'{}');}
          const d=JSON.parse(b);
          if(!safeId.test(d.id)||!scenes().some(s=>s.id===d.id)||!Number.isInteger(d.frame)||!Number.isFinite(d.x)||!Number.isFinite(d.y)||d.x<0||d.x>1||d.y<0||d.y>1||typeof d.note!=='string')return send(res,400,'{}');
          appendFileSync(join(root,'manual-bugs.ndjson'),JSON.stringify({id:d.id,frame:d.frame,x:d.x,y:d.y,note:d.note.slice(0,1000),t:Date.now()})+'\n');
          return json(res,{ok:true});
        }
      }
      send(res,404,'{}');
    }catch{send(res,404,'{}');}
  });
  server.listen(port,'127.0.0.1',()=>console.log('Live QA: http://127.0.0.1:'+port+' — '+root));
  process.on('SIGINT',()=>{child.kill();server.close();});
}
