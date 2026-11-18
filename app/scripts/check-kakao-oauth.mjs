/**
 * Kakao OAuth preflight (no secrets printed, no sign-in performed).
 * Follows Supabase /auth/v1/authorize redirects ONLY up to Kakao's authorize URL.
 * Usage: node scripts/check-kakao-oauth.mjs [--show-client-id]
 * Reads PUBLIC VITE_SUPABASE_* vars from local production/development env files.
 */
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const ENV_FILES=['.env','.env.production','.env.local','.env.production.local'];
export const REDIRECT='https://dongjak-walk-safety-preview.pages.dev/';

export function parseEnvFile(text){
  const values={};
  for(const line of String(text||'').split(/\r?\n/)){
    const match=line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if(!match)continue;
    let value=match[2].trim();
    if(value.startsWith('"')||value.startsWith("'")){
      const quote=value[0]; const closing=value.lastIndexOf(quote);
      if(closing>0)value=value.slice(1,closing);
    }else value=value.replace(/\s+#.*$/,'').trim();
    values[match[1]]=value;
  }
  return values;
}
export function loadPublicCloudConfig(root=ROOT,files=ENV_FILES,environment=process.env){
  let settings={};const used=[];
  for(const file of files){
    const path=resolve(root,file);
    if(!existsSync(path))continue;
    settings={...settings,...parseEnvFile(readFileSync(path,'utf8'))};used.push(file);
  }
  settings={...settings,...Object.fromEntries(Object.entries(environment).filter(([key])=>key.startsWith('VITE_SUPABASE_')))};
  const raw=String(settings.VITE_SUPABASE_URL||'').trim().replace(/\/$/,'');
  const publicKey=String(settings.VITE_SUPABASE_PUBLISHABLE_KEY||settings.VITE_SUPABASE_ANON_KEY||'').trim();
  if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(raw)){
    throw new Error('Supabase Project URL을 확인할 수 없습니다. 프로젝트 최상위에 .env.production.local의 VITE_SUPABASE_URL을 설정하세요.');
  }
  if(!/^(sb_publishable_[\w-]{10,}|eyJ[\w-]+\.eyJ[\w-]+\.[\w-]+)$/.test(publicKey)){
    throw new Error('Supabase 공개키(Publishable Key 또는 anon key)가 없습니다. .env.production.local에 VITE_SUPABASE_PUBLISHABLE_KEY를 설정하세요. Secret Key를 사용하지 마세요.');
  }
  return {url:raw,publicKey,sources:used};
}
export function kakaoRedirectInfo(location){
  const url=new URL(String(location));
  if(url.protocol!=='https:'||url.hostname!=='kauth.kakao.com'||url.pathname!=='/oauth/authorize'){
    throw new Error(`예상하지 않은 인증 목적지입니다: ${url.hostname}${url.pathname}`);
  }
  const clientId=url.searchParams.get('client_id')||'';
  const scopes=String(url.searchParams.get('scope')||'').split(/[\s,]+/).filter(Boolean);
  const redirectUri=url.searchParams.get('redirect_uri')||'';
  if(!clientId)throw new Error('카카오 OAuth 인증 주소에 client_id가 없습니다. Supabase Kakao Provider를 확인하세요.');
  return {clientId,scopes,redirectUri,host:url.hostname};
}
export async function inspectKakaoAuthorize({url,publicKey,redirectTo=REDIRECT,fetchFn=fetch}={}){
  if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(String(url||'')))throw new Error('Supabase URL 형식이 잘못됐습니다.');
  const expectedHost=new URL(url).host;
  const next=new URL('/auth/v1/authorize',url);
  next.searchParams.set('provider','kakao');next.searchParams.set('redirect_to',redirectTo);
  let current=next.href;
  for(let attempt=0;attempt<5;attempt++){
    const requestUrl=new URL(current);
    if(requestUrl.protocol!=='https:'||requestUrl.host!==expectedHost)throw new Error('Supabase 외부 URL로 리다이렉트되어 검사를 중단했습니다.');
    const response=await fetchFn(current,{redirect:'manual',headers:{apikey:publicKey,'X-Client-Info':'dongjak-kakao-preflight-v828'}});
    const location=response.headers?.get?.('location');
    if(response.status>=300&&response.status<400&&location){
      const destination=new URL(location,current);
      if(destination.hostname==='kauth.kakao.com')return kakaoRedirectInfo(destination.href);
      if(destination.protocol==='https:'&&destination.host===expectedHost){current=destination.href;continue;}
      throw new Error(`예상하지 않은 로그인 대상: ${destination.hostname}`);
    }
    throw new Error(`Supabase Kakao 로그인 요청이 HTTP ${response.status}로 중단됐습니다. Authentication > Providers > Kakao 및 Redirect URLs를 확인하세요.`);
  }
  throw new Error('로그인 요청의 리다이렉트 횟수가 비정상적으로 많습니다.');
}
export function maskPublicClientId(clientId){
  const s=String(clientId||'');return s.length<=9?'(짧은 ID, --show-client-id 옵션으로 직접 확인)':s.slice(0,4)+'…'+s.slice(-4);
}

const invoked=process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(invoked){
  try{
    const config=loadPublicCloudConfig();
    console.log('\n[동작하는 안전지도] 카카오 OAuth 실제 요청 진단');
    console.log('Supabase 프로젝트:',new URL(config.url).host);
    console.log('환경변수 파일:',config.sources.join(', ')||'(실행 환경변수 사용)');
    console.log('검사 대상:',REDIRECT);
    console.log('주의: 브라우저의 임시 Supabase 설정(localStorage)이 있는 경우 앱에서는 다른 프로젝트를 사용할 수도 있습니다.');
    const result=await inspectKakaoAuthorize(config);
    console.log('\n[카카오 인증 서버로 전달되는 값]');
    console.log('REST API client_id:',process.argv.includes('--show-client-id')?result.clientId:maskPublicClientId(result.clientId));
    console.log('동의항목(scope):',result.scopes.length?result.scopes.join(', '):'(없음)');
    console.log('카카오 Redirect URI:',result.redirectUri);
    console.log('\n[확인사항]');
    console.log('1. 이 client_id가 카카오디벨로퍼스에서 동의항목을 설정한 동일한 앱의 REST API 키인지 비교하세요.');
    console.log('   비교용 전체 키: node scripts/check-kakao-oauth.mjs --show-client-id (화면을 타인에게 공유하지 마세요)');
    console.log('2. 카카오 동의항목 설정에 위 scope가 모두 있는지 확인하세요.');
    if(result.scopes.includes('openid'))console.log('   주의: openid 요청이 있습니다. 카카오 OIDC 설정 활성화 여부를 확인하세요.');
    if(!result.scopes.includes('account_email'))console.log('   참고: account_email 요청은 현재 결과에 포함되지 않습니다.');
    const expectedCallback=`${config.url}/auth/v1/callback`;
    if(result.redirectUri!==expectedCallback)console.log('3. 주의: Kakao redirect_uri가 기본 Supabase Callback URL과 다릅니다. 실제 등록된 URI를 확인하세요.');
    else console.log('3. 카카오디벨로퍼스 Redirect URI에 이 주소가 등록됐는지 확인하세요:',expectedCallback);
    console.log('4. 실사이트의 Supabase 프로젝트가 위 프로젝트와 같은지 비교하세요.');
    console.log('\n※ 카카오 관리자 동의항목과 Supabase Client ID는 ZIP에서 변경할 수 없습니다.\n');
  }catch(error){
    console.error('\n[진단 중단]',String(error?.message||error));
    console.error('이 스크립트는 로그인하거나 비밀키를 출력하지 않습니다. 필요 시 Supabase 제공자 설정을 확인하세요.');
    process.exitCode=1;
  }
}
