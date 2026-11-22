// Retry only unavailable or invalid review responses; do not retry valid findings.
const severity=['critical','major','minor','suggestion'];
// Keep provider grammar small and constant. Strict evidence validation stays local.
export function evidenceSchema(ids){
 if(!ids.length||new Set(ids).size!==ids.length||!ids.every(x=>/^E\d{2}$/.test(x)))throw Error('Invalid evidence catalog');
 return {type:'OBJECT',properties:{findings:{type:'ARRAY',items:{type:'OBJECT',properties:{severity:{type:'STRING',enum:severity},evidence:{type:'ARRAY',items:{type:'STRING'}},summary:{type:'STRING'}},required:['severity','evidence','summary']}}},required:['findings']};
}
export function validateReview(parsed,ids){
 if(!Array.isArray(parsed?.findings)||parsed.findings.length>30||!parsed.findings.every(x=>severity.includes(x.severity)&&typeof x.summary==='string'&&x.summary.trim().length>0&&x.summary.length<=1200&&Array.isArray(x.evidence)&&x.evidence.length>0&&x.evidence.length<=ids.length&&x.evidence.every(id=>ids.includes(id))))throw Error('Unverifiable review evidence');
 return {findings:parsed.findings.map(f=>({severity:f.severity,summary:f.summary,evidence:[...new Set(f.evidence)]}))};
}
export function classifyBadRequest(detail){
 if(/schema|constraint|branching|too many states|generationconfig/i.test(detail))return 'schema rejected';
 if(/payload|request size|too large|request body|token limit/i.test(detail))return 'request size rejected';
 if(/mime|image format|image data|invalid image/i.test(detail))return 'image rejected';
 return 'invalid request; no sensitive provider details logged';
}
// Respect provider Retry-After; a 429 is a shared quota signal, never a valid design review.
export function visionRetryDelayMs({status,attempt,headers}={}){
 if(status!==429)return attempt===1?3000:9000;
 const header=String(headers?.get?.('retry-after')||'').trim();
 let ms=null;
 if(/^\d+(?:\.\d+)?$/.test(header))ms=Number(header)*1000;
 else if(header){const date=Date.parse(header);if(Number.isFinite(date))ms=date-Date.now();}
 if(ms!==null&&Number.isFinite(ms))return Math.max(15000,Math.min(120000,Math.ceil(ms)));
 return [15000,35000,70000,105000][Math.min(3,Math.max(0,(attempt||1)-1))];
}
export async function reviewWithRetry({send,ids,wait=ms=>new Promise(r=>setTimeout(r,ms)),maxAttempts=3}){
 const failures=[];
 const schema=evidenceSchema(ids);
 for(let attempt=1;attempt<=maxAttempts;attempt++){
  let reason,retryable=true,retryStatus=null,retryHeaders=null;
  try{
   const res=await send({schema,attempt,previousFailure:failures.at(-1)||null});
   if(!res.ok){reason='Provider HTTP '+res.status;retryStatus=res.status;retryHeaders=res.headers;retryable=[408,429,500,502,503,504].includes(res.status);if(res.status===400){let detail='';try{detail=String((await res.json()).error?.message||'');}catch{}reason+=' ('+classifyBadRequest(detail)+')';}}
   else {
    const candidate=(await res.json()).candidates?.[0];
    if(candidate?.finishReason!=='STOP')throw Error('Incomplete provider response');
    const parsed=JSON.parse(candidate.content.parts.filter(p=>!p.thought).map(p=>p.text||'').join(''));
    return {status:'reviewed',review:validateReview(parsed,ids),attempts:attempt,failures};
   }
  }catch(e){reason=e instanceof SyntaxError?'Invalid JSON response':String(e?.message||'Vision request failed').slice(0,150);}
  failures.push(reason);
  if(!retryable||attempt===maxAttempts)break;
  await wait(visionRetryDelayMs({status:retryStatus,attempt,headers:retryHeaders}));
 }
 return {status:'unavailable',reason:failures.at(-1),attempts:failures.length,failures};
}
