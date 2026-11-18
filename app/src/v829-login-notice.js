/** Optional Kakao self-message on a *new* interactive Kakao OAuth sign-in.
 * No Kakao token or Supabase refresh token is written to localStorage.
 * A short-lived sessionStorage intent prevents messages on reload/token refresh.
 */
export const NOTICE_PREF='dj-map-v829-kakao-login-notice-optin';
export const NOTICE_OWNER='dj-map-v829-kakao-login-notice-owner';
export const NOTICE_INTENT='dj-map-v829-kakao-login-notice-intent';
const INTENT_MAX_AGE_MS=15*60*1000;
export function safeNoticePreference(store, userId){
  return Boolean(userId&&store?.getItem(NOTICE_PREF)==='1'&&store?.getItem(NOTICE_OWNER)===userId);
}
export function planKakaoSignIn({store,sessionStore,now=Date.now(),linkExisting=false}={}){
  const owner=store?.getItem(NOTICE_OWNER)||'';
  const enabled=!linkExisting&&safeNoticePreference(store,owner);
  if(enabled)sessionStore?.setItem(NOTICE_INTENT,JSON.stringify({owner,created:now}));
  else sessionStore?.removeItem(NOTICE_INTENT);
  return enabled?{scopes:'talk_message'}:{};
}
/** Claim a send request exactly once; no refresh or account-switch notifications. */
export function consumeKakaoNoticeIntent({sessionStore,session,now=Date.now()}={}){
  const raw=sessionStore?.getItem(NOTICE_INTENT);
  if(!raw||!session?.provider_token||!session?.user?.id)return null;
  sessionStore.removeItem(NOTICE_INTENT);
  try{
    const intent=JSON.parse(raw);
    if(!intent||intent.owner!==session.user.id||!Number.isFinite(intent.created)||now-intent.created<0||now-intent.created>INTENT_MAX_AGE_MS)return null;
    return {accessToken:session.provider_token,userId:session.user.id};
  }catch{return null;}
}
export async function sendKakaoSelfLoginNotice(accessToken,{fetcher=fetch,endpoint='/api/account/login-notification'}={}){
  if(typeof accessToken!=='string'||accessToken.length<16||accessToken.length>8192)throw new Error('카카오 액세스 토큰을 확인할 수 없습니다.');
  const response=await fetcher(endpoint,{
    method:'POST',headers:{'Authorization':`Bearer ${accessToken}`,'Content-Type':'application/json'},
    body:JSON.stringify({event:'interactive_kakao_login'}),credentials:'same-origin'
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok||data.sent!==true)throw new Error(data.message||'카카오톡 메시지 전송에 실패했습니다. 추가 동의 또는 Pages 배포 상태를 확인해 주세요.');
  return true;
}
