// Notification only. This module cannot authorize, merge, dispatch or deploy a release.
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
const owner='lui020913',repo=owner+'/dongjak-ui-public-tests';
export function notificationDecision(comments,reactions,main){
 const plans=comments.flatMap(c=>{
  if(c.user?.login!==owner||!Number.isSafeInteger(c.id))return [];
  const matches=[...String(c.body||'').matchAll(/<!-- qa-approval:pending:([a-zA-Z0-9._-]{1,100});base=([a-f0-9]{40});head=([a-f0-9]{40})(?:;pr=([0-9]+))? -->/g)];
  if(matches.length!==1)return [];
  return [{id:c.id,plan:matches[0][1],base:matches[0][2],head:matches[0][3]}];
 }).filter(p=>p.base===main);
 if(plans.length!==1)return null;
 const p=plans[0],later=comments.filter(c=>c.id>p.id&&c.user?.login===owner);
 const decisions=later.filter(c=>['승인','거절'].includes(String(c.body||'').trim()));
 const ownerReactions=reactions.filter(r=>r.user?.login===owner);
 const reject=decisions.some(c=>String(c.body).trim()==='거절')||ownerReactions.some(r=>r.content==='-1');
 const approve=decisions.some(c=>String(c.body).trim()==='승인')||ownerReactions.some(r=>r.content==='+1');
 if(reject)return null;
 const kind=approve?'received':'request',marker='<!-- qa-bot-notification:'+p.plan+':'+kind+' -->';
 if(comments.some(c=>c.user?.login==='github-actions[bot]'&&String(c.body||'').includes(marker)))return null;
 const url='https://github.com/'+repo+'/issues/15#issuecomment-'+p.id;
 return {plan:p.plan,kind,marker,body:approve?'@'+owner+' **수정 승인 접수**\n\n승인을 확인했습니다. 승인 범위와 최신 소스를 검토한 뒤 자동 검증·배포 절차를 진행합니다.\n[승인 대상 확인]('+url+')\n'+marker:'@'+owner+' **안전지도 수정 승인 요청**\n\n한글 수정 계획을 확인하고 해당 댓글에 👍 또는 `승인`을 남겨 주세요. 승인 전에는 앱을 변경하지 않습니다.\n[수정 계획 확인 및 승인]('+url+')\n'+marker};
}
async function main(){
 if(process.env.GITHUB_REPOSITORY!==repo||process.env.GITHUB_REF!=='refs/heads/main')throw Error('Unexpected repository or branch');
 const key=process.env.GH_TOKEN;if(!key)throw Error('Missing bot token');
 const api=async(path,options={})=>{const res=await fetch('https://api.github.com/repos/'+repo+path,{...options,headers:{Authorization:'Bearer '+key,Accept:'application/vnd.github+json','Content-Type':'application/json','X-GitHub-Api-Version':'2022-11-28'},signal:AbortSignal.timeout(25000)});if(!res.ok)throw Error('GitHub HTTP '+res.status);return res.json();};
 const all=async(path)=>{const rows=[];for(let page=1;page<=20;page++){const batch=await api(path+'?per_page=100&page='+page);if(!Array.isArray(batch))throw Error('Invalid list');rows.push(...batch);if(batch.length<100)return rows;}throw Error('Comment history exceeds safe inspection limit');};
 const comments=await all('/issues/15/comments'),sha=(await api('/git/ref/heads/main')).object?.sha;
 const current=comments.filter(c=>c.user?.login===owner&&String(c.body||'').includes(';base='+sha+';head=')&&String(c.body||'').includes('<!-- qa-approval:pending:'));
 if(current.length!==1)return;
 const reactions=await all('/issues/comments/'+current[0].id+'/reactions');
 const decision=notificationDecision(comments,reactions,sha);
 if(!decision)return;
 if((await api('/git/ref/heads/main')).object?.sha!==sha)return;
 await api('/issues/15/comments',{method:'POST',body:JSON.stringify({body:decision.body})});
 console.log('GitHub bot notification posted: '+decision.kind);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
