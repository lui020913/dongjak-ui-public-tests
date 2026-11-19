/* Same-origin Kakao OAuth popup bridge. Supabase remains the sole session owner.
 * No provider or Supabase access tokens are retained outside Supabase Auth. */
export const KAKAO_POPUP_MESSAGE='dongjak:kakao-popup-result:v831';
export function readPopupCallback(urlString){
  let url;
  try{url=new URL(urlString);}catch{return null;}
  const fragment=new URLSearchParams(url.hash.replace(/^#/,''));
  const search=url.searchParams;
  const error=fragment.get('error_description')||search.get('error_description')||fragment.get('error')||search.get('error');
  if(error)return {error:String(error).slice(0,180)};
  const accessToken=fragment.get('access_token'),refreshToken=fragment.get('refresh_token');
  if(accessToken&&refreshToken)return {accessToken,refreshToken,providerToken:fragment.get('provider_token')||''};
  const code=search.get('code');
  if(code)return {code};
  return null;
}
/** Refuse malformed authorize links before opening the provider flow.
 * Supabase must own OAuth callback exchange; the UI must never try to exchange
 * Kakao's one-time external code directly. */
export function assertSupabaseAuthorizeUrl(value,supabaseUrl,redirectTo){
  let actual,expected;
  try{actual=new URL(value);expected=new URL(supabaseUrl);}catch{throw new Error('인증 서버 URL 형식이 올바르지 않습니다.');}
  if(actual.protocol!=='https:'||actual.origin!==expected.origin||!['/auth/v1/authorize','/auth/v1/user/identities/authorize'].includes(actual.pathname))
    throw new Error('예상하지 않은 OAuth 인증 목적지입니다. Supabase Project URL을 확인해 주세요.');
  if(actual.searchParams.get('provider')!=='kakao')throw new Error('카카오 제공자 연결 주소가 아닙니다.');
  const callback=actual.searchParams.get('redirect_to')||'';
  if(callback!==redirectTo)throw new Error('카카오 인증 후 복귀 주소가 현재 지도와 일치하지 않습니다. Supabase Redirect URLs를 확인해 주세요.');
  return true;
}
export function isTrustedPopupEvent(event,popup,origin){
  return Boolean(popup&&event&&event.source===popup&&event.origin===origin&&event.data?.type===KAKAO_POPUP_MESSAGE);
}
export function openKakaoPopup(win=window){
  try{
    const popup=win.open('','_blank','popup=yes,width=460,height=740,scrollbars=yes,resizable=yes');
    if(!popup||popup.closed)return null;
    // A placeholder prevents a blank page while signInWithOAuth builds its URL.
    try{popup.document.title='동작구 지도 · 카카오 로그인';popup.document.body.innerHTML='<p style="font:16px system-ui,sans-serif;padding:30px">카카오 로그인 화면을 열고 있습니다.</p>';}catch{}
    return popup;
  }catch{return null;}
}
export function waitForKakaoPopup({popup,win=window,onResult,timeoutMs=150000}={}){
  return new Promise((resolve,reject)=>{
    if(!popup){reject(new Error('인증 창을 열지 못했습니다.'));return;}
    let ended=false;
    const finish=(error,data)=>{
      if(ended)return;
      ended=true;win.removeEventListener('message',onMessage);
      win.clearInterval(poll);win.clearTimeout(timeout);
      try{if(!popup.closed)popup.close();}catch{}
      if(error)reject(error);else resolve(data);
    };
    const onMessage=event=>{
      if(!isTrustedPopupEvent(event,popup,win.location.origin))return;
      const result=event.data.result;
      if(!result||typeof result!=='object')return finish(new Error('인증 결과가 올바르지 않습니다.'));
      if(result.error)return finish(new Error(String(result.error).slice(0,180)));
      if((typeof result.accessToken==='string'&&typeof result.refreshToken==='string')||typeof result.code==='string')return finish(null,result);
      finish(new Error('카카오 로그인 결과를 확인할 수 없습니다.'));
    };
    const poll=win.setInterval(()=>{try{if(popup.closed)finish(new Error('카카오 로그인 창이 닫혔습니다.'));}catch{}},500);
    const timeout=win.setTimeout(()=>finish(new Error('카카오 로그인 시간이 초과되었습니다. 다시 시도해 주세요.')),timeoutMs);
    win.addEventListener('message',onMessage);
  });
}
