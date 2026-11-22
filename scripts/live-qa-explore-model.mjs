/** Fail-closed model request with bounded retries and safe diagnostic messages.
 * The Playwright browser never receives the API key; Node calls Gemini only.
 * A valid model finding is returned unchanged, never rerolled.
 */
import {classifyQuotaError} from './live-qa-vision-retry.mjs';
const TRANSIENT_STATUS=new Set([408,500,502,503,504]);
export async function askGeminiModel({
  parts,schema,key,model='gemini-3.1-flash-lite',
  send=fetch,wait=ms=>new Promise(resolve=>setTimeout(resolve,ms)),
  maxAttempts=3,timeoutMs=90000
}={}){
  if(!key||!/^gemini-[a-z0-9.-]+$/.test(model)||!Array.isArray(parts)||!schema)
    throw Error('Model configuration unavailable');
  if(!Number.isInteger(maxAttempts)||maxAttempts<1||maxAttempts>4)
    throw Error('Invalid model retry policy');
  const url='https://generativelanguage.googleapis.com/v1beta/models/'+model+':generateContent';
  const body=JSON.stringify({contents:[{role:'user',parts}],generationConfig:{
    responseMimeType:'application/json',responseSchema:schema,maxOutputTokens:4096
  }});
  let last='Model response unavailable';
  for(let attempt=1;attempt<=maxAttempts;attempt++){
    try{
      const res=await send(url,{method:'POST',headers:{
        'Content-Type':'application/json','x-goog-api-key':key
      },body,signal:AbortSignal.timeout(timeoutMs)});
      if(!res?.ok){
        const status=Number(res?.status)||0;
        last='Model HTTP '+status;
        // A 429 is an exhausted provider quota, not a defective mobile UI.
        // Stop immediately and let the caller record a human-review-only skip.
        if(status===429){
          let payload;try{payload=await res.json();}catch{}
          throw Error('Model HTTP 429 ('+classifyQuotaError(payload)+')');
        }
        if(!TRANSIENT_STATUS.has(status))throw Error(last);
      }else{
        const candidate=(await res.json())?.candidates?.[0];
        if(candidate?.finishReason!=='STOP')last='Model response incomplete';
        else {
          try{
            return JSON.parse((candidate.content?.parts||[]).filter(p=>!p.thought).map(p=>p.text||'').join(''));
          }catch{last='Model response invalid JSON';}
        }
      }
    }catch(e){
      const message=String(e?.message||'');
      if(/^Model HTTP \d+(?: \([a-z-]+\))?$/.test(message))throw e; // Permanent 4xx / quota: do not burn retries.
      last=e?.name==='TimeoutError'||e?.name==='AbortError'?'Model request timed out':'Model network or response unavailable';
    }
    if(attempt<maxAttempts)await wait(attempt===1?2500:7000);
  }
  throw Error('Model unavailable after '+maxAttempts+' attempt(s): '+last);
}
