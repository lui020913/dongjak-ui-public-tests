/** Optional account-backed bookmarks via Supabase Auth + PostgREST + RLS.
 * No service_role key is ever sent to the browser. Without configuration the
 * existing guest/local-first favorites keep working offline. */
import {favoritesSnapshot,replaceFavoritesSnapshot,mergeFavoritesSnapshots} from './v815-place-store.js';
import {openKakaoPopup,waitForKakaoPopup,assertSupabaseAuthorizeUrl} from './v831-kakao-popup.js';
import {NOTICE_PREF,NOTICE_OWNER,NOTICE_INTENT,safeNoticePreference,planKakaoSignIn,consumeKakaoNoticeIntent,sendKakaoSelfLoginNotice} from './v829-login-notice.js';

let sharedCloudClient=null;
export function getActiveCloudClient(){return sharedCloudClient;}

const ID_KEY='dj-map-v824-cloud-user';
const DIRTY_KEY='dj-map-v824-cloud-dirty';
const PUBLIC_CONFIG_URL_KEY='dj-map-v813-supabase-url';
const PUBLIC_CONFIG_KEY_KEY='dj-map-v813-supabase-publishable-key';
const CLIENT_URL='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.0/+esm';
const env=typeof import.meta.env==='object'&&import.meta.env?import.meta.env:{};
const readPublicSetting=key=>{try{return localStorage.getItem(key)||'';}catch{return '';}};
export function validPublicCloudCredentials(url,key){
  const base=String(url||'').trim();const publicKey=String(key||'').trim();
  return /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(base)
    && (/^sb_publishable_[A-Za-z0-9_-]{10,}$/.test(publicKey)
      || /^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(publicKey))
    && !/sb_secret_|service_role/i.test(publicKey);
}
export function cloudConfiguration(){
  const envUrl=String(env.VITE_SUPABASE_URL||'').trim();
  const envKey=String(env.VITE_SUPABASE_PUBLISHABLE_KEY||env.VITE_SUPABASE_ANON_KEY||'').trim();
  const deviceUrl=readPublicSetting(PUBLIC_CONFIG_URL_KEY).trim();
  const deviceKey=readPublicSetting(PUBLIC_CONFIG_KEY_KEY).trim();
  // Deployed build settings take precedence over this device's temporary setup.
  const fromBuild=validPublicCloudCredentials(envUrl,envKey);
  const url=fromBuild?envUrl:deviceUrl;
  const key=fromBuild?envKey:deviceKey;
  return {url,key,configured:validPublicCloudCredentials(url,key),source:fromBuild?'build':'device'};
}
async function browserClientFactory(config){
  // A pinned, remote official SDK avoids altering the application's build
  // dependency tree; it is requested ONLY when Supabase is configured.
  const module=await import(/* @vite-ignore */ CLIENT_URL);
  return module.createClient(config.url,config.key,{
    auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true},
    global:{headers:{'X-Client-Info':'dongjak-favorites-v824'}}
  });
}
const readValue=key=>{try{return localStorage.getItem(key)||'';}catch{return '';}};
const setValue=(key,value)=>{try{if(value==null)localStorage.removeItem(key);else localStorage.setItem(key,String(value));}catch{}};
const safeLocalStorage=()=>{try{return window.localStorage;}catch{return null;}};
const safeSessionStorage=()=>{try{return window.sessionStorage;}catch{return null;}};
export function friendlyError(error){
  let message=String(error?.message||error||'요청에 실패했습니다.');
  // OAuth error_description can arrive double URL-encoded by upstream providers.
  for(let i=0;i<2&&/%[0-9a-f]{2}/i.test(message);i++){
    try{message=decodeURIComponent(message);}catch{break;}
  }
  if(/unable to exchange external code/i.test(message))
    return '카카오 인증코드를 Supabase 서버가 교환하지 못했습니다. 카카오 REST API 키·활성 Client Secret·Supabase 콜백 URL을 확인하고, 아래 ‘카카오 로그인 오류·연결 설정 확인’을 열어 주세요. 자세한 원인은 Supabase Auth 로그에서 확인해야 합니다.';
  if(/code verifier|pkce|invalid grant/i.test(message))
    return '로그인 인증정보가 만료되거나 일치하지 않습니다. 열린 인증 창을 닫고 새로 로그인해 주세요.';
  if(/fetch|network|failed to/i.test(message))return '서버에 연결할 수 없습니다. 인터넷 연결을 확인해 주세요.';
  return message.slice(0,190);
}
export function isValidEmail(value){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value||'').trim());}
/** Server shape belongs to ONE Supabase auth.uid(). RLS filters every row. */
export async function readCloudSnapshot(client,userId){
  const {data,error}=await client.from('user_favorite_state').select('snapshot').eq('user_id',userId).maybeSingle();
  if(error)throw error;
  return data?.snapshot||null;
}
export async function saveCloudSnapshot(client,userId,snapshot){
  const {error}=await client.from('user_favorite_state').upsert({
    user_id:userId,snapshot,updated_at:new Date().toISOString()
  },{onConflict:'user_id'});
  if(error)throw error;
  return true;
}
/** Wire account actions into an existing DOM container; no account/server
 * functionality is claimed until Supabase is configured and login completes. */
export function installFavoritesCloud({root,clientFactory=browserClientFactory,config=cloudConfiguration()}={}){
  if(!root||typeof document==='undefined')return null;
  const section=document.createElement('section');section.className='dj824-account';
  section.id='dj824-account';section.setAttribute('aria-label','즐겨찾기 계정');
  const header=document.createElement('div');header.className='dj824-account-header';
  const title=document.createElement('strong');title.textContent='즐겨찾기 계정';
  const toggle=document.createElement('button');toggle.type='button';toggle.className='dj824-account-toggle';
  toggle.textContent='로그인';toggle.setAttribute('aria-controls','dj824-account-details');toggle.setAttribute('aria-expanded','false');
  header.append(title,toggle);
  const status=document.createElement('p');status.className='dj815-helper dj824-account-status';status.setAttribute('role','status');
  status.setAttribute('aria-live','polite');
  const details=document.createElement('div');details.id='dj824-account-details';details.className='dj824-account-details';details.hidden=true;
  const instructions=document.createElement('p');instructions.className='dj815-helper dj824-account-instructions';
  instructions.textContent='아직 서버가 연결되지 않았습니다. Supabase의 Project URL과 Publishable Key를 입력하면 이 기기에서 로그인할 수 있습니다. 모든 방문자에게 자동으로 적용하려면 프로젝트의 .env.production.local을 설정한 뒤 배포해야 합니다.';
  // Browser-only public credentials are an optional preview path; production
  // deployments should always embed these two PUBLIC values at build time.
  const setup=document.createElement('form');setup.className='dj824-cloud-setup';
  setup.setAttribute('aria-label','이 기기에서 Supabase 공개 연결 정보 설정');
  const urlLabel=document.createElement('label');urlLabel.textContent='Project URL';
  const urlInput=document.createElement('input');urlInput.type='url';urlInput.required=true;
  urlInput.placeholder='https://프로젝트ID.supabase.co';urlInput.autocomplete='off';
  urlLabel.append(urlInput);
  const keyLabel=document.createElement('label');keyLabel.textContent='Publishable Key (공개키만)';
  const keyInput=document.createElement('input');keyInput.type='text';keyInput.required=true;
  keyInput.autocomplete='off';keyInput.spellcheck=false;keyInput.placeholder='sb_publishable_...';
  keyLabel.append(keyInput);
  const setupNote=document.createElement('p');setupNote.className='dj824-cloud-help';
  setupNote.textContent='이 설정은 현재 브라우저에만 저장됩니다. Secret Key·service_role·DB 비밀번호는 절대 입력하지 마세요.';
  const setupSubmit=document.createElement('button');setupSubmit.type='submit';setupSubmit.textContent='이 기기에 서버 연결';
  setup.append(urlLabel,keyLabel,setupNote,setupSubmit);
  // v8.2.0: one account hub for sign-in, sign-up and self-service profile.
  // Passwords are passed only to Supabase Auth over TLS; never store them locally.
  const make=(tag,cls='',txt='')=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt)e.textContent=txt;return e;};
  const authPanel=make('div','dj820-auth-panel');
  const authTabs=make('div','dj820-auth-tabs');authTabs.setAttribute('role','group');authTabs.setAttribute('aria-label','로그인 방식');
  const authModes=[['password','비밀번호 로그인'],['signup','회원가입'],['email','이메일 링크']];
  const authButtons=new Map();let authMode='password';
  for(const [mode,label] of authModes){const btn=make('button','dj820-auth-tab',label);btn.type='button';btn.dataset.authMode=mode;authTabs.append(btn);authButtons.set(mode,btn);}
  const form=make('form','dj824-login-form dj820-credentials-form');
  const input=make('input');input.type='email';input.autocomplete='email';input.placeholder='이메일 주소';input.setAttribute('aria-label','로그인 이메일 주소');input.required=true;
  const password=make('input');password.type='password';password.autocomplete='current-password';password.placeholder='비밀번호 (8자 이상)';password.setAttribute('aria-label','계정 비밀번호');password.minLength=8;
  const pwConfirm=make('input');pwConfirm.type='password';pwConfirm.autocomplete='new-password';pwConfirm.placeholder='비밀번호 확인';pwConfirm.setAttribute('aria-label','비밀번호 확인');
  const submit=make('button','','로그인');submit.type='submit';
  const kakaoSignIn=make('button','dj821-kakao-login','카카오로 계속하기');kakaoSignIn.type='button';kakaoSignIn.setAttribute('aria-label','카카오 계정으로 로그인');
  const kakaoFallback=make('button','dj820-text-action','인증 창이 작동하지 않을 때 · 일반 카카오 로그인');kakaoFallback.type='button';kakaoFallback.hidden=true;
  const resetPassword=make('button','dj820-text-action','비밀번호 재설정 메일 받기');resetPassword.type='button';
  const authHelp=make('p','dj815-helper dj820-auth-help','로그인하면 개인 즐겨찾기·그룹을 서버와 동기화합니다.');
  // Only PUBLIC connection diagnostics are shown. The Kakao REST API key and
  // Client Secret live in Supabase admin settings and MUST NOT be exposed here.
  const makeKakaoTroubleshooter=()=>{
    const box=make('details','dj828-kakao-help');
    const heading=make('summary','','카카오 로그인 오류·연결 설정 확인');
    const project=make('p','',`현재 연결된 Supabase: ${config.configured?new URL(config.url).host:'미설정'} (${config.source==='build'?'배포 설정':'이 기기 설정'})`);
    const callback=make('p','',`카카오 Redirect URI: ${config.configured?config.url.replace(/\/$/,'')+'/auth/v1/callback':'서버 설정 후 표시'}`);
    const check=make('p','','KOE205가 계속되면 카카오디벨로퍼스에서 세 동의항목(account_email·profile_image·profile_nickname)을 활성화한 앱과 Supabase Kakao Provider의 REST API Client ID가 같은 앱인지 확인하세요. OIDC를 사용하지 않으면 openid를 요청하지 않아야 합니다.');
    const note=make('p','','실제 로그인 요청의 client_id와 scope는 프로젝트 터미널에서 npm run check:kakao 명령으로 확인할 수 있습니다. Secret Key는 지도에 입력하지 마세요.');
    const link=make('a','','카카오 개발자 앱 설정 열기');
    link.href='https://developers.kakao.com/console/app';link.target='_blank';link.rel='noopener noreferrer';
    const token=make('p','','‘Unable to exchange external code’는 Supabase Auth 서버가 카카오 인증코드를 토큰으로 바꾸지 못했다는 뜻입니다. 같은 카카오 앱의 REST API 키와 활성 Client Secret을 Supabase Kakao Provider에 등록하고, 카카오 REST API 키에 연결된 로그인 Redirect URI가 위 Supabase /auth/v1/callback과 정확히 일치해야 합니다. 비밀키는 브라우저·공유 ZIP에 입력하지 마세요.');
    const logs=make('a','','Supabase 인증 로그 확인');
    logs.href='https://supabase.com/dashboard/project/'+(config.configured?new URL(config.url).hostname.split('.')[0]:'_')+'/logs/auth-logs';
    logs.target='_blank';logs.rel='noopener noreferrer';
    box.append(heading,project,callback,check,token,note,link,logs);return box;
  };
  form.append(input,password,pwConfirm,submit);
  authPanel.append(authTabs,form,kakaoSignIn,kakaoFallback,resetPassword,authHelp,makeKakaoTroubleshooter());
  const accountPanel=make('div','dj820-account-panel');
  const userCard=make('div','dj820-account-user');
  userCard.classList.add('dj829-signed-summary');
  const avatar=make('span','dj820-account-avatar','사');avatar.classList.add('dj829-summary-avatar');avatar.setAttribute('aria-hidden','true');
  const identity=make('div','dj820-account-identity');identity.classList.add('dj829-summary-copy');
  const displayName=make('strong','dj820-display-name','내 계정');
  const emailLine=make('span','dj820-email-line');
  const providerSummary=make('small','dj829-summary-provider');
  identity.append(displayName,emailLine,providerSummary);userCard.append(avatar,identity);
  const noticeSettings=make('section','dj829-notice-settings');
  const noticeTitle=make('strong','','카카오 로그인 알림');
  const noticeToggleLabel=make('label','dj829-notice-toggle');
  const noticeCheckbox=make('input');noticeCheckbox.type='checkbox';noticeCheckbox.setAttribute('role','switch');noticeCheckbox.setAttribute('aria-label','카카오 로그인 시 내 카카오톡으로 알림 받기');
  const noticeToggleText=make('span','','카카오 로그인 시 내 카카오톡으로 알림 받기');
  noticeToggleLabel.append(noticeCheckbox,noticeToggleText);
  const noticeHelp=make('p','dj815-helper','다음 카카오 로그인부터 메시지 권한 동의 후 알림을 보냅니다.');
  const noticeStatus=make('p','dj829-notice-status');noticeStatus.setAttribute('role','status');noticeStatus.setAttribute('aria-live','polite');
  noticeSettings.append(noticeTitle,noticeToggleLabel,noticeHelp,noticeStatus);noticeSettings.hidden=true;
  const manageTabs=make('div','dj820-manage-tabs');manageTabs.setAttribute('role','group');manageTabs.setAttribute('aria-label','계정 관리 메뉴');
  const managePanels=new Map();const manageButtons=new Map();
  for(const [mode,label] of [['profile','내 정보'],['security','보안 설정'],['identities','연결된 계정']]){
    const btn=make('button','dj820-manage-tab',label);btn.type='button';btn.dataset.manageTab=mode;manageTabs.append(btn);manageButtons.set(mode,btn);
    const panel=make('section','dj820-manage-panel');panel.dataset.managePanel=mode;panel.hidden=true;managePanels.set(mode,panel);
  }
  const profileForm=make('form','dj820-settings-form');
  const profileLabel=make('label','','표시 이름');const profileName=make('input');profileName.type='text';profileName.maxLength=30;profileName.autocomplete='nickname';profileName.placeholder='앱에서 사용할 이름';profileLabel.append(profileName);
  const emailDisplay=make('p','dj820-account-readonly');
  const profileSave=make('button','','프로필 저장');profileSave.type='submit';profileSave.dataset.saved='false';
  const profileNotice=make('p','dj856-profile-status');profileNotice.hidden=true;
  profileNotice.setAttribute('role','status');profileNotice.setAttribute('aria-live','polite');
  profileForm.append(profileLabel,emailDisplay,profileSave,profileNotice);managePanels.get('profile').append(profileForm);
  profileName.addEventListener('input',()=>{profileNotice.hidden=true;profileNotice.textContent='';});
  const securityPanel=managePanels.get('security');
  const passwordForm=make('form','dj820-settings-form');
  const newPasswordLabel=make('label','','새 비밀번호');const newPassword=make('input');newPassword.type='password';newPassword.minLength=8;newPassword.autocomplete='new-password';newPassword.placeholder='8자 이상';newPassword.required=true;newPasswordLabel.append(newPassword);
  const newPasswordConfirmLabel=make('label','','새 비밀번호 확인');const newPasswordConfirm=make('input');newPasswordConfirm.type='password';newPasswordConfirm.autocomplete='new-password';newPasswordConfirm.required=true;newPasswordConfirmLabel.append(newPasswordConfirm);
  const changePassword=make('button','','비밀번호 설정·변경');changePassword.type='submit';passwordForm.append(newPasswordLabel,newPasswordConfirmLabel,changePassword);securityPanel.append(passwordForm);
  const changeEmailForm=make('form','dj820-settings-form');
  const changeEmailLabel=make('label','','이메일 변경');const changeEmail=make('input');changeEmail.type='email';changeEmail.autocomplete='email';changeEmail.required=true;changeEmail.placeholder='새 이메일 주소';changeEmailLabel.append(changeEmail);
  const changeEmailSubmit=make('button','','변경 확인 메일 보내기');changeEmailSubmit.type='submit';changeEmailForm.append(changeEmailLabel,changeEmailSubmit);securityPanel.append(changeEmailForm);
  const securityHelp=make('p','dj815-helper','이메일 변경은 인증 메일 확인 후 적용됩니다. 비밀번호는 서버에서 관리하며 앱에 저장되지 않습니다.');securityPanel.append(securityHelp);
  const identityPanel=managePanels.get('identities');
  const linkedProviders=make('p','dj820-linked-providers');
  const linkKakao=make('button','dj821-kakao-login','현재 계정에 카카오 연결');linkKakao.type='button';linkKakao.setAttribute('aria-label','현재 로그인된 계정에 카카오 계정 연결');
  const linkNote=make('p','dj815-helper','기존 즐겨찾기를 유지하려면 현재 이메일 계정에 로그인한 상태에서 카카오를 연결하세요. Supabase의 수동 계정 연결(Manual Linking)을 활성화해야 할 수 있습니다. 카카오로 별도 가입하면 즐겨찾기 계정이 분리될 수 있습니다.');
  identityPanel.append(linkedProviders,linkKakao,linkNote,makeKakaoTroubleshooter());
  const logout=make('button','dj820-logout','로그아웃');logout.type='button';
  accountPanel.append(userCard,noticeSettings,manageTabs,...managePanels.values(),logout);
  noticeCheckbox.addEventListener('change',()=>{
    if(!user?.id){noticeCheckbox.checked=false;return;}
    if(noticeCheckbox.checked){
      setValue(NOTICE_PREF,'1');setValue(NOTICE_OWNER,user.id);
      noticeStatus.textContent='알림을 켰습니다. 다음 카카오 로그인부터 적용됩니다.';
    }else{
      setValue(NOTICE_PREF,null);setValue(NOTICE_OWNER,null);
      noticeStatus.textContent='알림을 껐습니다. 카카오 메시지 권한을 요청하지 않습니다.';
    }
  });
  details.append(instructions,setup,authPanel,accountPanel);section.append(header,status,details);root.append(section);
  function setAuthMode(mode){authMode=mode;
    for(const [name,btn] of authButtons){const selected=name===mode;btn.classList.toggle('active',selected);btn.setAttribute('aria-pressed',String(selected));}
    password.hidden=mode==='email';password.required=mode!=='email';password.autocomplete=mode==='signup'?'new-password':'current-password';
    pwConfirm.hidden=mode!=='signup';pwConfirm.required=mode==='signup';
    submit.textContent=mode==='signup'?'이메일로 회원가입':mode==='email'?'로그인 링크 받기':'비밀번호로 로그인';
    resetPassword.hidden=mode==='email';
  }
  for(const [mode,btn] of authButtons)btn.addEventListener('click',()=>setAuthMode(mode));setAuthMode('password');
  let manageMode='profile';
  function setManageMode(mode){manageMode=mode;
    for(const [name,btn] of manageButtons){const selected=name===mode;btn.classList.toggle('active',selected);btn.setAttribute('aria-pressed',String(selected));managePanels.get(name).hidden=!selected;}
  }
  for(const [mode,btn] of manageButtons)btn.addEventListener('click',()=>setManageMode(mode));setManageMode('profile');
  let client=null,user=null,flushPromise=null,needsSave=false,saveTimer=null,alive=true,syncReady=false;
  const statusText=text=>{status.textContent=text;};
  const authApp=document.getElementById('app');
  // Publish an explicit loading state before the asynchronous Supabase client
  // is ready. The onboarding module must not mistake an unresolved session
  // for a logged-out visitor and flash the guest tour over an authenticated user.
  if(authApp&&!authApp.dataset.djAuthState)authApp.dataset.djAuthState='checking';
  const publishAuthState=authUser=>{
    const authenticated=Boolean(authUser?.id);
    if(authApp)authApp.dataset.djAuthState=authenticated?'signed-in':'signed-out';
    section.dataset.authState=authenticated?'signed-in':'guest';
    const mineTab=document.querySelector('#bottom-nav .nav-tab[data-tab="mine"]');
    if(mineTab)mineTab.dataset.authState=authenticated?'signed-in':'guest';
    window.dispatchEvent(new CustomEvent('dongjak:auth-state',{detail:{authenticated}}));
  };
  const updateAccountPanel=()=>{
    if(!user)return;
    const name=String(user.user_metadata?.display_name||user.user_metadata?.full_name||user.email?.split('@')[0]||'사용자');
    displayName.textContent=name;avatar.textContent=name.slice(0,1);emailLine.textContent=user.email||'이메일 없음';
    emailDisplay.textContent=`가입 이메일: ${user.email||'확인되지 않음'}`;
    if(document.activeElement!==profileName)profileName.value=String(user.user_metadata?.display_name||user.user_metadata?.full_name||'');
    const savedProfile=Boolean(String(user.user_metadata?.display_name||'').trim());
    profileSave.textContent=savedProfile?'변경사항 저장':'이름 저장';profileSave.dataset.saved=String(savedProfile);
    profileSave.setAttribute('aria-label',savedProfile?'표시 이름 변경사항 저장':'표시 이름 저장');
    const securityTab=manageButtons.get('security');
    const recoveryMode=manageMode==='security'&&window.location.href.includes('type=recovery');
    if(securityTab)securityTab.hidden=!recoveryMode;
    if(!recoveryMode&&manageMode==='security')setManageMode('profile');
    const providers=Array.isArray(user.identities)?user.identities.map(item=>item.provider):[];
    if(!providers.length&&user.app_metadata?.providers)providers.push(...user.app_metadata.providers);
    const names=[...new Set(providers)];linkedProviders.textContent=`연결된 로그인: ${names.length?names.map(x=>x==='kakao'?'카카오':x==='google'?'Google':x==='email'?'이메일':x).join(' · '):'이메일'}`;
    providerSummary.textContent=names.length?names.map(x=>x==='kakao'?'카카오':x==='google'?'Google':x==='email'?'이메일':x).join(' · '):'이메일 계정';
    linkKakao.hidden=names.includes('kakao');
    noticeSettings.hidden=!names.includes('kakao');
    noticeCheckbox.checked=safeNoticePreference(safeLocalStorage(),user.id);
    noticeStatus.textContent=noticeCheckbox.checked
      ?'알림 설정됨 · 다음 카카오 로그인부터 적용됩니다.'
      :'알림 꺼짐 · 카카오 메시지 권한을 요청하지 않습니다.';
  };
  const updateUI=()=>{
    section.dataset.authState=user?'signed-in':'guest';
    const mineTab=document.querySelector('#bottom-nav .nav-tab[data-tab="mine"]');
    if(mineTab)mineTab.dataset.authState=user?'signed-in':'guest';
    userCard.hidden=!user;
    if(!config.configured){
      statusText('기기에만 저장 중 · 서버 로그인 설정 필요');
      toggle.textContent='로그인';authPanel.hidden=true;accountPanel.hidden=true;instructions.hidden=false;setup.hidden=false;
      return;
    }
    instructions.hidden=true;setup.hidden=true;
    if(user){
      authPanel.hidden=true;accountPanel.hidden=false;toggle.textContent='내 계정';updateAccountPanel();
      statusText(`${user.email||'로그인한 사용자'} · 개인 즐겨찾기 동기화 중`);
    }else{
      authPanel.hidden=false;accountPanel.hidden=true;toggle.textContent='로그인·회원가입';
      statusText('로그인 전 · 이 기기에 저장 중 (로그인하면 서버 동기화)');
    }
  };
  toggle.addEventListener('click',()=>{
    const willOpen=details.hidden;
    details.hidden=!willOpen;
    toggle.setAttribute('aria-expanded',String(willOpen));
    if(willOpen&&config.configured&&!user&&window.matchMedia?.('(min-width:700px)')?.matches)input.focus();
    else if(willOpen&&!config.configured)urlInput.focus();
  });
  setup.addEventListener('submit',event=>{
    event.preventDefault();
    const url=urlInput.value.trim().replace(/\/$/,'');
    const key=keyInput.value.trim();
    if(!validPublicCloudCredentials(url,key)){
      statusText('공개 Supabase Project URL과 Publishable Key 형식을 확인해 주세요. Secret Key는 사용할 수 없습니다.');
      return;
    }
    setValue(PUBLIC_CONFIG_URL_KEY,url);setValue(PUBLIC_CONFIG_KEY_KEY,key);
    statusText('현재 기기의 접속 정보를 저장했습니다. 로그인 창을 다시 여는 중입니다.');
    window.location.reload();
  });
  updateUI();
  if(!config.configured){publishAuthState(null);return {configured:false,element:section};}
  function flush(){
    if(flushPromise)return flushPromise;
    if(!client||!user||!syncReady)return Promise.resolve(false);
    flushPromise=(async()=>{
      try{
        while(needsSave&&user&&alive){
          const ownerId=user.id;
          needsSave=false;
          const snapshot=favoritesSnapshot();
          await saveCloudSnapshot(client,ownerId,snapshot);
          if(user?.id!==ownerId)return false;
          if(!needsSave){setValue(DIRTY_KEY,'');statusText('서버에 저장 완료 · 다른 기기에서 같은 이메일로 로그인하면 불러옵니다.');}
        }
        return !needsSave&&readValue(DIRTY_KEY)!=='1';
      }catch(error){
        needsSave=true;setValue(DIRTY_KEY,'1');
        statusText(`기기에 저장됨 · 서버 동기화 실패: ${friendlyError(error)} (온라인 복귀 시 재시도)`);
        return false;
      }finally{flushPromise=null;}
    })();
    return flushPromise;
  }
  function scheduleSave(){
    if(!user||!alive)return;
    needsSave=true;setValue(DIRTY_KEY,'1');
    if(!syncReady)return;
    if(saveTimer!=null)clearTimeout(saveTimer);
    saveTimer=setTimeout(()=>{saveTimer=null;void flush();},550);
  }
  function onLocalChange(e){if(e.detail?.origin==='cloud')return;scheduleSave();}
  async function restoreAndSync(currentUser){
    try{
      statusText('서버 즐겨찾기와 그룹을 불러오는 중입니다…');
      const remote=await readCloudSnapshot(client,currentUser.id);
      if(!alive||user?.id!==currentUser.id)return;
      const hasUnuploadedChanges=readValue(DIRTY_KEY)==='1';
      const migrating=readValue(ID_KEY)!==currentUser.id;
      if(remote&&!migrating&&!hasUnuploadedChanges){
        replaceFavoritesSnapshot(remote,{origin:'cloud'});
      }else{
        // Guest favorites are imported into the first signed-in account. On
        // reconnect, local dirty edits win rather than disappearing.
        const merged=mergeFavoritesSnapshots(remote||{groups:[],places:[]},favoritesSnapshot());
        replaceFavoritesSnapshot(merged,{origin:'cloud'});
        needsSave=true;syncReady=true;await flush();
      }
      syncReady=true;setValue(ID_KEY,currentUser.id);
      if(!needsSave)statusText('서버 연결됨 · 내 즐겨찾기와 그룹이 동기화되었습니다.');
    }catch(error){
      statusText(`로그인됨 · 동기화 실패: ${friendlyError(error)} (기기에 저장된 정보는 유지됩니다)`);
    }
  }
  async function handleUser(session){
    const incoming=session?.user||null;
    if(incoming?.id===user?.id){user=incoming;updateUI();publishAuthState(incoming);return;}
    // Switching between two authenticated users must NOT upload the previous
    // account's locally cached favorites into the new user's cloud row.
    if(incoming?.id&&user?.id&&incoming.id!==user.id){
      setValue(ID_KEY,'');setValue(DIRTY_KEY,'');needsSave=false;
      replaceFavoritesSnapshot({groups:[],places:[]},{origin:'cloud'});
    }
    if(!incoming&&user){
      // A session can end from another tab or remotely, not just our button.
      setValue(ID_KEY,'');setValue(DIRTY_KEY,'');needsSave=false;
      replaceFavoritesSnapshot({groups:[],places:[]},{origin:'cloud'});
    }
    user=incoming;syncReady=false;
    updateUI();publishAuthState(incoming);
    if(user)await restoreAndSync(user);
  }
  const redirectUrl=()=>{const url=new URL(window.location.href);url.hash='';url.search='';return url.href;};
  async function executeAuth(label,button,operation){
    if(!client){statusText('인증 서비스 연결을 확인 중입니다.');return;}
    button.disabled=true;statusText(`${label} 처리 중…`);
    try{await operation();}catch(error){statusText(`${label} 실패: ${friendlyError(error)}`);}
    finally{button.disabled=false;}
  }
  // v8.2.10 + popup auth: keep this map document mounted during Kakao OAuth.
  // The popup must be opened synchronously from a user gesture (especially iOS).
  // Existing account linking and guest sign-in share this flow.
  async function sendPendingKakaoNotice(session){
    const sessionStore=safeSessionStorage();
    if(!session?.provider_token){sessionStore?.removeItem(NOTICE_INTENT);return false;}
    const notice=consumeKakaoNoticeIntent({sessionStore,session});
    if(!notice)return false;
    try{
      await sendKakaoSelfLoginNotice(notice.accessToken);
      noticeStatus.textContent='카카오톡 알림을 보냈습니다.';
      return true;
    }catch(error){
      noticeStatus.textContent=`카카오톡 알림 전송 실패: ${friendlyError(error)}`;
      return false;
    }
  }
  async function signInWithKakao(linkExisting=false,{redirectOnly=false}={}){
    if(linkExisting&&!user){statusText('기존 계정에 먼저 로그인한 다음 카카오 계정을 연결해 주세요.');return;}
    if(!client){statusText('인증 서비스 연결을 확인 중입니다.');return;}
    const button=linkExisting?linkKakao:(redirectOnly?kakaoFallback:kakaoSignIn);
    // Prevent two overlapping one-time Kakao OAuth grants (popup vs fallback).
    if(kakaoSignIn.disabled||kakaoFallback.disabled||linkKakao.disabled)return;
    const popup=redirectOnly?null:openKakaoPopup(window);
    kakaoSignIn.disabled=true;kakaoFallback.disabled=true;linkKakao.disabled=true;
    statusText(popup?'카카오 로그인 창에서 인증을 진행해 주세요.':'카카오 로그인 페이지로 이동합니다.');
    try{
      const action=linkExisting?client.auth.linkIdentity?.bind(client.auth):client.auth.signInWithOAuth?.bind(client.auth);
      if(!action)throw new Error('현재 Supabase SDK는 해당 인증 방식을 지원하지 않습니다.');
      const noticePlan=planKakaoSignIn({
        store:safeLocalStorage(),sessionStore:safeSessionStorage(),linkExisting
      });
      const options={redirectTo:popup?new URL('/oauth-popup.html',window.location.origin).href:redirectUrl(),skipBrowserRedirect:Boolean(popup),...noticePlan};
      const {data,error}=await action({provider:'kakao',options});
      if(error)throw error;
      if(!popup){
        statusText('카카오 로그인 화면으로 이동합니다. 인증 후 지도가 다시 시작될 수 있습니다.');
        return;
      }
      if(!data?.url)throw new Error('카카오 인증 주소를 가져오지 못했습니다.');
      assertSupabaseAuthorizeUrl(data.url,config.url,popup?new URL('/oauth-popup.html',window.location.origin).href:redirectUrl());
      // Attach listener BEFORE navigation to avoid missing a fast callback.
      const completed=waitForKakaoPopup({popup,win:window});
      popup.location.href=data.url;
      const result=await completed;
      const response=result.code
        ?await client.auth.exchangeCodeForSession(result.code)
        :await client.auth.setSession({access_token:result.accessToken,refresh_token:result.refreshToken});
      if(response.error)throw response.error;
      const session=response.data?.session;
      if(!session?.user?.id)throw new Error('로그인 세션을 확인할 수 없습니다.');
      await handleUser(session);
      if(!linkExisting)await sendPendingKakaoNotice(session);
      statusText(linkExisting?'카카오 계정을 연결했습니다. 지도 화면은 유지됩니다.':'카카오 로그인 완료 · 지도 화면을 유지했습니다.');
    }catch(error){
      try{popup?.close();}catch{}
      if(popup&&!linkExisting)kakaoFallback.hidden=false;
      statusText(`카카오 ${linkExisting?'연결':'로그인'} 실패: ${friendlyError(error)}`);
    }finally{kakaoSignIn.disabled=false;kakaoFallback.disabled=false;linkKakao.disabled=false;}
  }
  kakaoSignIn.addEventListener('click',()=>{void signInWithKakao(false);});
  kakaoFallback.addEventListener('click',()=>{void signInWithKakao(false,{redirectOnly:true});});
  linkKakao.addEventListener('click',()=>{void signInWithKakao(true);});
  form.addEventListener('submit',async e=>{
    e.preventDefault();const email=input.value.trim();
    if(!isValidEmail(email)){statusText('올바른 이메일 주소를 입력해 주세요.');return;}
    if(authMode!=='email'&&password.value.length<8){statusText('비밀번호는 8자 이상 입력해 주세요.');return;}
    if(authMode==='signup'&&password.value!==pwConfirm.value){statusText('비밀번호 확인이 일치하지 않습니다.');return;}
    await executeAuth(authMode==='signup'?'회원가입':authMode==='email'?'메일 링크 로그인':'비밀번호 로그인',submit,async()=>{
      if(authMode==='signup'){
        const {data,error}=await client.auth.signUp({email,password:password.value,options:{emailRedirectTo:redirectUrl()}});
        if(error)throw error;
        password.value='';pwConfirm.value='';
        if(data.session){await handleUser(data.session);statusText('회원가입과 로그인이 완료됐습니다.');}
        else statusText('인증 메일을 확인해 주세요. 이메일 확인이 완료돼야 로그인할 수 있습니다.');
      }else if(authMode==='password'){
        const {data,error}=await client.auth.signInWithPassword({email,password:password.value});
        password.value='';if(error)throw error;
        if(data.session)await handleUser(data.session);
        else statusText('로그인 응답에 세션이 없습니다. 계정 인증 설정을 확인해 주세요.');
      }else{
        const {error}=await client.auth.signInWithOtp({email,options:{emailRedirectTo:redirectUrl(),shouldCreateUser:false}});
        if(error)throw error;
        statusText('기존 계정으로 로그인할 수 있는 링크를 전송했습니다. 받은 메일을 확인해 주세요.');
      }
    });
  });
  resetPassword.addEventListener('click',async()=>{
    const email=input.value.trim();if(!isValidEmail(email)){statusText('비밀번호를 재설정할 계정 이메일을 먼저 입력해 주세요.');input.focus();return;}
    await executeAuth('비밀번호 재설정 메일',resetPassword,async()=>{
      const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:redirectUrl()});if(error)throw error;
      statusText('해당 이메일로 비밀번호 재설정 안내를 요청했습니다. 메일함을 확인해 주세요.');
    });
  });
  profileForm.addEventListener('submit',async e=>{
    e.preventDefault();if(!user)return;
    const name=profileName.value.trim();if(name.length>30){statusText('표시 이름은 최대 30자입니다.');return;}
    await executeAuth('프로필 변경',profileSave,async()=>{
      const {data,error}=await client.auth.updateUser({data:{display_name:name}});if(error)throw error;
      user=data.user||user;updateAccountPanel();
      profileNotice.textContent='표시 이름이 변경되었습니다.';
      profileNotice.hidden=false;
      statusText('표시 이름을 저장했습니다.');
    });
  });
  passwordForm.addEventListener('submit',async e=>{
    e.preventDefault();if(!user)return;
    if(newPassword.value.length<8||newPassword.value!==newPasswordConfirm.value){statusText('새 비밀번호는 8자 이상이며 확인 입력과 같아야 합니다.');return;}
    await executeAuth('비밀번호 변경',changePassword,async()=>{
      const {error}=await client.auth.updateUser({password:newPassword.value});if(error)throw error;
      newPassword.value='';newPasswordConfirm.value='';statusText('비밀번호를 변경했습니다.');
    });
  });
  changeEmailForm.addEventListener('submit',async e=>{
    e.preventDefault();if(!user)return;const email=changeEmail.value.trim();
    if(!isValidEmail(email)){statusText('새 이메일 주소를 확인해 주세요.');return;}
    await executeAuth('이메일 변경',changeEmailSubmit,async()=>{
      const {error}=await client.auth.updateUser({email});if(error)throw error;
      changeEmail.value='';statusText('이메일 변경 확인 메일을 요청했습니다. 인증 전까지 이전 이메일이 유지됩니다.');
    });
  });
  logout.addEventListener('click',async()=>{
    if(!client||!user)return;
    const confirmed=window.confirm(
      '로그아웃하시겠습니까?\n\n기존에 저장한 즐겨찾기와 그룹은 계정에 그대로 보관됩니다. 동일한 계정으로 다시 로그인하면 불러올 수 있습니다.\n\n로그아웃 후에는 이 기기에서 해당 계정의 저장 항목이 표시되지 않습니다.'
    );
    if(!confirmed)return;
    logout.disabled=true;
    try{
      if(!syncReady){
        statusText('즐겨찾기 동기화가 진행 중입니다. 완료된 뒤 다시 로그아웃해 주세요.');
        return;
      }
      if(saveTimer!=null){clearTimeout(saveTimer);saveTimer=null;}
      if(needsSave||readValue(DIRTY_KEY)==='1'){
        needsSave=true;
        const synced=await flush();
        if(!synced||readValue(DIRTY_KEY)==='1'){
          statusText('저장 항목의 서버 동기화가 완료되지 않아 로그아웃을 취소했습니다. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.');
          return;
        }
      }
      const {error}=await client.auth.signOut();if(error)throw error;
      user=null;needsSave=false;setValue(ID_KEY,'');setValue(DIRTY_KEY,'');
      // Keep account-owned favorites in Supabase, but hide the previous
      // account's local snapshot from the next guest on this device.
      replaceFavoritesSnapshot({groups:[],places:[]},{origin:'cloud'});updateUI();publishAuthState(null);
      statusText('로그아웃했습니다. 저장한 즐겨찾기와 그룹은 계정에 보관되며, 동일 계정으로 다시 로그인하면 복원됩니다.');
    }catch(error){statusText(`로그아웃 실패: ${friendlyError(error)}`);}
    finally{logout.disabled=false;}
  });
  const onOnline=()=>{if(user&&readValue(DIRTY_KEY)==='1'){needsSave=true;void flush();}};
  const onVisible=()=>{if(user&&document.visibilityState==='visible'){
    if(readValue(DIRTY_KEY)==='1'){needsSave=true;void flush();}
    else void restoreAndSync(user);
  }};
  window.addEventListener('dongjak:saved-places-change',onLocalChange);
  window.addEventListener('online',onOnline);
  document.addEventListener('visibilitychange',onVisible);
  void (async()=>{
    try{
      client=await clientFactory(config);sharedCloudClient=client;
      client.auth.onAuthStateChange((event,session)=>{
        if(event==='PASSWORD_RECOVERY'){details.hidden=false;toggle.setAttribute('aria-expanded','true');setManageMode('security');statusText('새 비밀번호를 설정해 주세요.');}
        // Supabase recommends not awaiting other Supabase calls inside this
        // callback; defer remote queries to a later task.
        setTimeout(()=>{if(alive){void handleUser(session).then(async()=>{
          if(event==='SIGNED_IN')await sendPendingKakaoNotice(session);
          if(event==='PASSWORD_RECOVERY')statusText('비밀번호 재설정: 보안 설정에서 새 비밀번호를 입력해 주세요.');
        });}},0);
      });
      const {data,error}=await client.auth.getSession();
      if(error)throw error;
      await handleUser(data.session);
    }catch(error){
      statusText(`서버 인증 초기화 실패: ${friendlyError(error)} · 기기 저장은 계속 이용 가능합니다.`);
      // Authentication could not be resolved. Keep the app usable as a guest
      // and ensure the guest start screen is not silently skipped.
      publishAuthState(null);
    }
  })();
  return {configured:true,element:section,flush,dispose(){alive=false;clearTimeout(saveTimer);
    window.removeEventListener('dongjak:saved-places-change',onLocalChange);
    window.removeEventListener('online',onOnline);document.removeEventListener('visibilitychange',onVisible);}};
}
