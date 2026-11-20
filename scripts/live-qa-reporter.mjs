import {copyFileSync,existsSync,readFileSync,writeFileSync,renameSync} from 'node:fs';
import {join} from 'node:path';
export default class AuditReporter {
 onBegin(_config,suite){const root=process.env.DONGJAK_LIVE_QA_DIR;if(root)writeFileSync(join(root,'expected-tests'),String(suite.allTests().length));}
 onTestEnd(test,result){
  const root=process.env.DONGJAK_LIVE_QA_DIR;if(!root)return;
  const id=[...(result.annotations||[]),...(test.annotations||[])].find(a=>a.type==='live-qa-scene')?.description;
  if(!id||!(/^[a-f0-9-]{36}$/.test(id)))return;
  const dir=join(root,id),file=join(dir,'meta.json');
  if(!existsSync(file))return;
  const meta=JSON.parse(readFileSync(file,'utf8'));
  const video=result.attachments.find(a=>a.contentType==='video/webm'&&a.path&&existsSync(a.path));
  if(video){copyFileSync(video.path,join(dir,'recording.webm'));meta.video=id+'/recording.webm';}
  else meta.videoMissing=true;
  meta.status=result.status;
  meta.errors=result.errors.map(e=>String(e.message||'').slice(0,3000));
  writeFileSync(file+'.reporter',JSON.stringify(meta));renameSync(file+'.reporter',file);
 }
}
