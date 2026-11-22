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
// Read only quota type and retry guidance, never expose raw provider payloads.
export function classifyQuotaError(payload){
 const error=payload?.error||{};
 const details=Array.isArray(error.details)?error.details:[];
 const quota=details.flatMap(x=>Array.isArray(x.violations)?x.violations:[]);
 const signals=[String(error.message||''),...quota.flatMap(x=>[String(x.quotaMetric||''),String(x.quotaId||'')])].join(' ').toLowerCase();
 if(/(per[_ -]?day|requestsperday|daily|rpd|dayquota)/i.test(signals))return 'daily-quota';
 if(/(token.*minute|tokensperminute|tpm)/i.test(signals))return 'minute-token-quota';
 if(/(per[_ -]?minute|requestsperminute|rpm)/i.test(signals))return 'minute-request-quota';
 return 'quota-type-unknown';
}
export function visionRetryDelayMs({status,attempt,headers,payload}={}){
 if(status!==429)return attempt===1?3000:9000;
 const header=String(headers?.get?.('retry-after')||'').trim();
 const details=Array.isArray(payload?.error?.details)?payload.error.details:[];
 const retryInfo=details.find(x=>typeof x?.retryDelay==='string')?.retryDelay||'';
 let ms=null;
 if(/^\d+(?:\.\d+)?$/.test(header))ms=Number(header)*1000;
 else if(header){const date=Date.parse(header);if(Number.isFinite(date))ms=date-Date.now();}
 if(ms===null && /^(\d+(?:\.\d+)?)s$/.test(retryInfo))ms=Number(retryInfo.slice(0,-1))*1000;
 // Limit retries for short, transient throttle only; callers fail closed
 // for a daily quota or a reset that requires a longer interval.
 return ms===null||!Number.isFinite(ms)?3000:Math.max(0,Math.ceil(ms));
}
export async function reviewWithRetry({send,ids,wait=ms=>new Promise(r=>setTimeout(r,ms)),maxAttempts=3}){
 const failures=[];
 const schema=evidenceSchema(ids);
 let quota429Count=0;
 for(let attempt=1;attempt<=maxAttempts;attempt++){
  let reason,retryable=true,retryStatus=null,retryHeaders=null,retryPayload=null;
  try{
   const res=await send({schema,attempt,previousFailure:failures.at(-1)||null});
   if(!res.ok){
    reason='Provider HTTP '+res.status;
    retryStatus=res.status;retryHeaders=res.headers;
    retryable=[408,429,500,502,503,504].includes(res.status);
    if(res.status===400||res.status===429){
     try{retryPayload=await res.json();}catch{}
     if(res.status===400)reason+=' ('+classifyBadRequest(String(retryPayload?.error?.message||''))+')';
     if(res.status===429){
      quota429Count++;
      const quotaType=classifyQuotaError(retryPayload);
      reason+=' ('+quotaType+')';
      if(quotaType==='daily-quota')retryable=false;
     }
    }
   }
   else {
    const candidate=(await res.json()).candidates?.[0];
    if(candidate?.finishReason!=='STOP')throw Error('Incomplete provider response');
    const parsed=JSON.parse(candidate.content.parts.filter(p=>!p.thought).map(p=>p.text||'').join(''));
    return {status:'reviewed',review:validateReview(parsed,ids),attempts:attempt,failures};
   }
  }catch(e){reason=e instanceof SyntaxError?'Invalid JSON response':String(e?.message||'Vision request failed').slice(0,150);}
  failures.push(reason);
  if(!retryable||attempt===maxAttempts)break;
  const delay=visionRetryDelayMs({status:retryStatus,attempt,headers:retryHeaders,payload:retryPayload});
  // A second 429 without an intervening successful review is not a reason
  // to burn more quota or hold a runner for several minutes.
  if(retryStatus===429&&(quota429Count>=2||delay>20000))break;
  await wait(delay);
 }
 return {status:'unavailable',reason:failures.at(-1),attempts:failures.length,failures};
}
