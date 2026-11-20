import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2.57.0";
import webpush from "npm:web-push@3.6.7";
import {validPushEndpoint,validPushSubscription,notificationPayload} from "./push-policy.mjs";
function equalSecret(a:string,b:string){if(!a||a.length!==b.length)return false;let d=0;for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^b.charCodeAt(i);return d===0;}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get("origin")||"";
 const allowed=!origin||/^https:\/\/(?:[a-z0-9-]+\.)?dongjak-walk-safety(?:-preview)?\.pages\.dev$/i.test(origin)||/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/i.test(origin);
 const headers={"content-type":"application/json;charset=utf-8","cache-control":"no-store",...(allowed&&origin?{"access-control-allow-origin":origin,"vary":"Origin"}:{})};
 const send=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
 if(req.method==="OPTIONS")return new Response(null,{status:allowed?204:403,headers:{...headers,"access-control-allow-methods":"POST,OPTIONS","access-control-allow-headers":"authorization,apikey,content-type,x-client-info"}});
 if(!allowed||req.method!=="POST")return send({error:"허용되지 않은 요청"},403);
 const url=Deno.env.get("SUPABASE_URL"),secret=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!secret)return send({error:"알림 서버 준비 중"},503);
 const client=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const token=(req.headers.get("authorization")||"").replace(/^Bearer\s+/i,"");
 let body:any;
 try{const raw=await req.text();if(raw.length>4096)throw 0;body=JSON.parse(raw);}catch{return send({error:"입력 형식 오류"},400);}
 const publicKey=Deno.env.get("COMMUNITY_PUSH_VAPID_PUBLIC"),privateKey=Deno.env.get("COMMUNITY_PUSH_VAPID_PRIVATE"),subject=Deno.env.get("COMMUNITY_PUSH_VAPID_SUBJECT");
 const configured=Boolean(publicKey&&/^[A-Za-z0-9_-]{87}$/.test(publicKey)&&privateKey&&/^[A-Za-z0-9_-]{43}$/.test(privateKey)&&subject&&/^mailto:[^\s@]+@[^\s@]+$/.test(subject));
 if(body?.kind==="dispatch"){
  if(!equalSecret(token,secret))return send({error:"관리자 권한 필요"},403);
  if(!configured)return send({configured:false},503);
  const {data,error}=await client.rpc("community_push_claim");
  if(error)return send({error:"발송 대기열 오류"},503);
  let sent=0,retry=0,invalid=0;
  for(const job of data||[]){
   let status=0;
   try{
    const subscription={endpoint:job.endpoint,keys:{p256dh:job.p256dh,auth:job.auth_key}};
    if(!validPushSubscription(subscription))throw Error("invalid subscription");
    const details=webpush.generateRequestDetails(subscription,notificationPayload(),{TTL:3600,urgency:"normal",vapidDetails:{subject:subject!,publicKey:publicKey!,privateKey:privateKey!}});
    if(!validPushEndpoint(details.endpoint)||details.endpoint!==job.endpoint)throw Error("invalid destination");
    const requestHeaders=new Headers();for(const [k,v] of Object.entries(details.headers||{})){if(k.toLowerCase()!=="content-length")requestHeaders.set(k,String(v));}
    const response=await fetch(details.endpoint,{method:"POST",headers:requestHeaders,body:details.body?new Uint8Array(details.body):undefined,redirect:"error",signal:AbortSignal.timeout(7000)});
    status=response.status;
   }catch{/* no subscriber endpoint, keys, or raw provider error is logged */}
   if(status===404||status===410){await client.from("community_push_subscriptions").delete().eq("id",job.subscription_id);invalid++;continue;}
   const success=status>=200&&status<300,terminal=job.attempts>=3||(status>=400&&status<500&&status!==429);
   const {error:updateError}=await client.from("community_push_deliveries").update({state:success?"sent":terminal?"failed":"pending",available_at:new Date(Date.now()+120000).toISOString()}).eq("id",job.delivery_id).eq("state","leased").eq("attempts",job.attempts);
   if(success&&!updateError)sent++;else retry++;
  }
  // A delivery is only a hint; the source notification remains accessible inside the app.
  return send({configured:true,claimed:(data||[]).length,sent,retry,invalid});
 }
 const {data:auth,error:authError}=await client.auth.getUser(token);
 if(authError||!auth.user||auth.user.is_anonymous)return send({error:"로그인 후 사용해 주세요."},401);
 if(body?.kind==="status")return send({configured,publicKey:configured?publicKey:null});
 if(body?.kind==="unsubscribe"){
  if(!validPushEndpoint(body.endpoint))return send({error:"기기 정보 오류"},400);
  const {error}=await client.from("community_push_subscriptions").delete().eq("user_id",auth.user.id).eq("endpoint",body.endpoint);
  return error?send({error:"알림 해제 실패"},503):send({ok:true});
 }
 if(body?.kind==="subscribe"){
  if(!configured)return send({error:"기기 알림 발송을 준비 중입니다."},503);
  if(!validPushSubscription(body.subscription))return send({error:"지원하지 않는 알림 기기입니다."},400);
  const {endpoint,keys}=body.subscription;
  const {data,error}=await client.rpc("community_push_register",{p_user:auth.user.id,p_endpoint:endpoint,p_p256dh:keys.p256dh,p_auth:keys.auth});
  return error||data!==true?send({error:"기기 등록 실패 · 기존 기기 등록 수를 확인해 주세요."},409):send({ok:true});
 }
 return send({error:"잘못된 요청"},400);
});
