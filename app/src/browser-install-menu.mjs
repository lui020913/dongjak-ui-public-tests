/** Browser-only distribution entry point; never treats an unsigned artifact as installable. */
export const INSTALL_SESSION_KEY='dj-install-menu-v1';
export function installEnvironment(win={}){
 const n=win.navigator||{},ua=String(n.userAgent||'');
 const native=win.Capacitor?.isNativePlatform?.()===true||['android','ios'].includes(win.Capacitor?.getPlatform?.())||/; wv\)/i.test(ua)||win.location?.protocol==='capacitor:';
 const standalone=Boolean(n.standalone||win.matchMedia?.('(display-mode: standalone)')?.matches||win.matchMedia?.('(display-mode: fullscreen)')?.matches||win.matchMedia?.('(display-mode: minimal-ui)')?.matches);
 const apple=/iPhone|iPad|iPod/i.test(ua)||(n.platform==='MacIntel'&&n.maxTouchPoints>1);
 return {mode:native?'native':standalone?'pwa':'browser',platform:apple?'ios':/Android/i.test(ua)?'android':'other'};
}
export function safeDownloadUrl(value,platform){
 if(typeof value!=='string'||!value)return null;
 try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password)return null;
 if(platform==='ios'&&!['apps.apple.com','testflight.apple.com'].includes(u.hostname))return null;
 if(platform==='android'&&!(u.pathname.toLowerCase().endsWith('.apk')||u.hostname==='play.google.com'))return null;
 return u.href;}catch{return null;}
}
export const GUIDEBOOK_DOWNLOAD_PATH='/dongjak-guidebook.pdf';
export const GUIDEBOOK_DOWNLOAD_FILENAME='동작하는 안전지도 가이드북.pdf';
export function guidebookSizeLabel(bytes){
 if(!Number.isSafeInteger(bytes)||bytes<=0)return 'PDF';
 return 'PDF · '+(bytes>=1000000?(bytes/1000000).toFixed(1)+' MB':Math.max(1,Math.round(bytes/1000))+' KB');
}
const guidebookBytes=typeof __DJ_GUIDEBOOK_BYTES__==='number'?__DJ_GUIDEBOOK_BYTES__:null;
export const ANDROID_DOWNLOAD_PATH='/api/android-download.apk';
export const ANDROID_DOWNLOAD_FILENAME='Dongjak Safety Map.apk';
export function androidReleaseTag(marker,variant='debug'){
 const v=marker?.application_version,sha=marker?.source_commit;
 if(marker?.release_status!=='DEPLOYED_PRODUCTION'||!/^\d+\.\d+\.\d+$/.test(v||'')||! /^[a-f0-9]{40}$/.test(sha||'')||!['debug','release'].includes(variant))return null;
 return variant==='debug'?'android-debug-v'+v+'-src-'+sha.slice(0,12):'android-v'+v;
}
export function androidReleaseAsset(marker,release,variant='release',tagCommitSha=null){
 const tag=androidReleaseTag(marker,variant),v=marker?.application_version,sha=marker?.source_commit;
 if(!tag||release?.draft||release?.prerelease||(tagCommitSha!==null?tagCommitSha!==sha:release?.target_commitish!==sha))return null;
 // Historical releases are only accepted if their actual source is the exact Production SHA.
 const legacy=variant==='debug'?'android-debug-v'+v:tag;
 if(![tag,legacy].includes(release?.tag_name))return null;
 const name='Dongjak-Safety-Map-v'+v+'-'+variant+'.apk',url='https://github.com/lui020913/dongjak-ui-public-tests/releases/download/'+release.tag_name+'/'+name;
 return release.assets?.some(a=>a.name===name&&a.browser_download_url===url&&a.state==='uploaded')?url:null;
}
const PUBLIC_APK_REPO='https://api.github.com/repos/lui020913/dongjak-ui-public-tests';
/** Same-origin proxy is preferred. If a shared edge IP is rate limited, verify
 * the exact Production tag and published asset from the browser independently. */
export async function resolveAndroidDownload(win,onVerified=()=>{}){
 const signal=()=>typeof AbortSignal.timeout==='function'?AbortSignal.timeout(6000):undefined;
 try{
   const response=await win.fetch(ANDROID_DOWNLOAD_PATH,{method:'HEAD',cache:'no-store',signal:signal()});
   if(response.ok&&response.headers.get('X-Dongjak-APK-Verified')==='1'){
    const version=response.headers.get('X-Dongjak-APK-Version'),size=Number(response.headers.get('Content-Length'));
    if(/^\d+\.\d+\.\d+$/.test(version||'')&&Number.isSafeInteger(size)&&size>0)onVerified({version,size});
    return new URL(ANDROID_DOWNLOAD_PATH,win.location.href).href;
   }
 }catch{}
 try{
   const markerResponse=await win.fetch('/release-source.json',{cache:'no-store',signal:signal()});
   if(!markerResponse.ok)return null;
   const marker=await markerResponse.json(),tag=androidReleaseTag(marker,'debug');
   if(!tag||marker.source_commit!==marker.public_ui_source_commit)return null;
   const options={cache:'no-store',headers:{Accept:'application/vnd.github+json'},signal:signal()};
   const [releaseResponse,tagResponse]=await Promise.all([
     win.fetch(PUBLIC_APK_REPO+'/releases/tags/'+tag,options),
     win.fetch(PUBLIC_APK_REPO+'/git/ref/tags/'+tag,options)
   ]);
   if(!releaseResponse.ok||!tagResponse.ok)return null;
   const [release,ref]=await Promise.all([releaseResponse.json(),tagResponse.json()]);
   if(ref?.object?.type!=='commit'||ref.object.sha!==marker.source_commit||release?.tag_name!==tag)return null;
   const url=androidReleaseAsset(marker,release,'debug',ref.object.sha);
   const asset=release.assets?.find(a=>a.browser_download_url===url);
   if(!url||!Number.isSafeInteger(asset?.size)||asset.size<=0)return null;
   onVerified({version:marker.application_version,size:asset.size});return url;
 }catch{return null;}
}
export function androidInstallGuidance(){
 return {title:'Android 앱 설치 안내',
  intro:'동작하는 안전지도의 공식 테스트용 APK입니다. 현재 Google Play 스토어 외부에서 제공하고 있습니다.',
  context:'외부 앱은 기기에 따라 설치 제한이나 보안 안내가 표시될 수 있습니다.',
  steps:[
   'APK를 다운로드한 뒤 다운로드 알림 또는 내 파일에서 설치 파일을 엽니다.',
   '설치가 차단되면 Android 설정에서 해당 브라우저 또는 내 파일에 한해 ‘출처를 알 수 없는 앱 설치’를 허용하세요. 모든 앱에 허용하지 마세요.',
   'Galaxy의 ‘보안 위험 자동 차단’이 설치를 막으면 보호 기능을 해제하지 말고 웹앱을 이용하세요.',
   '설치가 끝나면 외부 앱 설치 허용을 다시 해제하세요. Google Play Protect는 켜 두세요.'
  ],
  notice:'출처를 확인하고, Play Protect 등에서 악성·유해 앱으로 탐지되거나 위험 경고가 나오면 설치하지 마세요. 웹앱을 이용해 주세요.',
  detail:'Play 스토어와 동일한 심사·자동 업데이트 보호는 보장되지 않습니다. 서명 검증은 악성코드가 없음을 보증하지 않습니다.',
  help:'https://www.samsungsvc.co.kr/solution/1711930'};
}
export function installChoices(platform){const rest=['android','ios'];if(platform==='ios')rest.reverse();return ['web',...rest,'pwa'];}
const labels={web:'웹에서 바로 이용하기',android:'Android 앱 다운로드',ios:'iPhone 앱 다운로드',pwa:'홈 화면에 웹앱 추가'};
const paths={web:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c5 5 5 13 0 18M12 3c-5 5-5 13 0 18"/>',android:'<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',ios:'<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10 5h4"/>',pwa:'<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M12 7v10M7 12h10"/>'};
export function mountBrowserInstallMenu({doc=document,win=window,steps=()=>[]}={}){
 const env=installEnvironment(win);if(env.mode!=='browser'||doc.getElementById('dj-install-menu'))return;
 const gate=doc.getElementById('dj-mobile-only-screen'),blocked=doc.documentElement.dataset.djMobileOnly==='blocked';
 const card=doc.createElement(blocked?'section':'dialog');card.id='dj-install-menu';card.className='dj-install-menu';card.setAttribute('aria-labelledby','dj-install-heading');
 const content=doc.createElement('div');content.className='dj-install-content';card.append(content);
 const add=(tag,cls,txt,parent=content)=>{const e=doc.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;parent.append(e);return e;};
 const brand=add('header','dj-install-brand');
 const logo=add('img','dj-install-logo',null,brand);logo.src='/icons/dongjak-light-512.png';logo.alt='';logo.width=76;logo.height=76;
 const heading=add('h2','','동작하는 안전지도',brand);heading.id='dj-install-heading';add('p','dj-install-subtitle',blocked?'스마트폰에서 이용하실 방법을 선택해 주세요.':'이용하실 방법을 선택해 주세요.',brand);
 const list=add('div','dj-install-list');
 const guide=add('section','dj-install-performance');guide.setAttribute('aria-label','스마트폰 이용 권장 사양');
 add('h3','','스마트폰 이용 환경',guide);
 const grid=add('div','dj-install-performance-grid',null,guide);
 for(const [brandName,min,recommended] of [['갤럭시','S20급','S23급 이상'],['아이폰','11','13 이상']]){const row=add('div','dj-install-performance-device',null,grid);add('strong','',brandName,row);add('span','','최소 · '+min,row);add('span','','권장 · '+recommended,row);}
 add('p','','구형 기기는 지도·3D 이용 시 끊김이 발생할 수 있습니다. 사양은 잠정 기준이며, 미달 기기도 이용 가능합니다.',guide);
 const info=add('div','dj-install-info');info.hidden=true;info.setAttribute('aria-live','polite');
 const buttons=new Map();let promptEvent=null,links={},selectedKey=null,androidCheck=null,androidMetadata=null;
 const refreshAndroid=()=>{
  if(androidCheck)return androidCheck;
  buttons.get('android').status.textContent='확인 중';
  androidMetadata=null;
  androidCheck=resolveAndroidDownload(win,meta=>{androidMetadata=meta;}).catch(()=>null).then(url=>{
   links.android=safeDownloadUrl(url,'android');androidCheck=null;
   buttons.get('android').status.textContent=links.android?'다운로드 가능':'다운로드 확인 필요';
   if(selectedKey==='android')showAndroidGuide(links.android);
   return links.android;
  });return androidCheck;
 };
 const showInfo=texts=>{delete info.dataset.androidGuide;info.replaceChildren();for(const t of texts)add('p','',t,info);info.hidden=false;};
 const setSelected=key=>{selectedKey=key;for(const [name,item] of buttons){const selected=name===key;item.b.setAttribute('aria-pressed',String(selected));item.b.classList.toggle('is-selected',selected);}};
 const showPwaQr=()=>{showInfo(['스마트폰 카메라로 QR코드를 스캔해 접속한 뒤 홈 화면에 추가해 주세요.','iPhone: Safari 공유 메뉴 → 홈 화면에 추가','Android: Chrome 메뉴 → 홈 화면에 추가 또는 앱 설치']);const img=add('img','dj-install-qr',null,info);img.src='/install-qr.png';img.alt='스마트폰으로 동작하는 안전지도에 접속하는 QR코드';info.scrollIntoView?.({block:'nearest',behavior:'instant'});};
 const showAndroidGuide=url=>{
  const guide=androidInstallGuidance(),expanded=info.querySelector('.dj-install-guide-details')?.open===true;
  showInfo([]);info.dataset.androidGuide='true';
  add('h3','dj-install-guide-title',guide.title,info);
  add('p','dj-install-guide-intro',guide.intro,info);
  const security=add('section','dj-install-guide-security',null,info);
  add('h4','','설치 전 확인해 주세요',security);
  add('p','dj-install-guide-context',guide.context,security);
  add('p','dj-install-guide-notice',guide.notice,security);
  if(url){
   if(androidMetadata){const {version,size}=androidMetadata;add('p','dj-install-apk-meta','v'+version+' · '+guidebookSizeLabel(size).replace('PDF · ','')+' · 배포 파일 일치 확인',info);}
   const download=add('button','dj-install-prompt','APK 다운로드',info);
   download.type='button';download.setAttribute('aria-label',ANDROID_DOWNLOAD_FILENAME+' 다운로드');
   download.addEventListener('click',()=>{if(safeDownloadUrl(links.android,'android')===url)win.location.assign(url);});
  }else{
   add('p','dj-install-guide-unavailable',androidCheck?'APK 확인 중…':'현재 APK를 확인하지 못했습니다.',info);
   const retry=add('button','dj-install-prompt dj-install-guide-retry',androidCheck?'확인 중…':'다시 확인',info);
   retry.type='button';retry.disabled=Boolean(androidCheck);
   retry.addEventListener('click',()=>{refreshAndroid();showAndroidGuide(null);});
  }
  const details=add('details','dj-install-guide-details',null,info);details.open=expanded;
  add('summary','','설치 방법 및 보안 안내',details);
  const instructions=add('ol','dj-install-guide-steps',null,details);
  for(const line of guide.steps)add('li','',line,instructions);
  add('p','dj-install-guide-detail',guide.detail,details);
  const help=add('a','dj-install-guide-help','Galaxy 설치 제한 공식 안내',details);help.href=guide.help;help.target='_blank';help.rel='noopener noreferrer';
  const web=add('button','dj-install-prompt dj-install-guide-web','설치 없이 웹앱 이용하기',info);web.type='button';
  web.addEventListener('click',()=>{setSelected('web');if(blocked)showInfo(['스마트폰으로 이 사이트에 접속해 주세요. QR코드는 ‘홈 화면에 웹앱 추가’에서 확인할 수 있습니다.']);else finish();});
  info.scrollIntoView?.({block:'nearest',behavior:'instant'});
 };
 const finish=()=>{try{win.sessionStorage.setItem(INSTALL_SESSION_KEY,'1');}catch{}if(!blocked&&card.open)card.close();};
 for(const key of installChoices(env.platform)){
 const b=add('button','dj-install-choice',null,list);b.type='button';b.setAttribute('aria-pressed','false');b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+paths[key]+'</svg>';add('span','dj-install-label',labels[key],b);
 const status=add('small','dj-install-status',key==='ios'?'추후 업데이트 예정':key==='android'?'확인 중':key==='pwa'?'iOS · Android 지원':key==='web'&&blocked?'모바일 전용':'',b);
 if(key==='pwa')status.classList.add('dj-install-platforms');
 if(key==='ios'){b.disabled=true;b.dataset.installPaused='true';}else add('span','dj-install-chevron','›',b).setAttribute('aria-hidden','true');
 buttons.set(key,{b,status});
 b.addEventListener('click',async()=>{
 if(key==='ios')return;
 if(blocked&&selectedKey===key&&!info.hidden){
  // A repeated desktop/tablet choice collapses its own details and selection.
  setSelected(null);info.hidden=true;delete info.dataset.androidGuide;info.replaceChildren();return;
 }
 setSelected(key);
 if(key==='web'){if(blocked)showInfo(['스마트폰으로 이 사이트에 접속해 주세요. QR코드는 ‘홈 화면에 웹앱 추가’에서 확인할 수 있습니다.']);else finish();return;}
 if(key==='pwa'){if(blocked){showPwaQr();return;}showInfo(steps(win.navigator.userAgent));if(promptEvent){const install=add('button','dj-install-prompt','웹앱 설치하기',info);install.type='button';install.addEventListener('click',async()=>{const p=promptEvent;promptEvent=null;if(!p)return;install.disabled=true;try{await p.prompt();if((await p.userChoice)?.outcome==='accepted')finish();}catch{}finally{install.remove();}});}return;}
 const url=safeDownloadUrl(links[key],key);
 showAndroidGuide(url);
 if(!url){refreshAndroid();showAndroidGuide(null);}
 });
 }
 // Download is a separate link, not an install mode: preserve the user's
 // selected option, dialog and navigation. Replacing the static PDF at
 // the same path requires no UI changes.
 const guidebook=add('a','dj-install-choice dj-install-guidebook',null,list);
 guidebook.href=GUIDEBOOK_DOWNLOAD_PATH;
 guidebook.download=GUIDEBOOK_DOWNLOAD_FILENAME;
 guidebook.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h9l4 4v14H6zM15 3v5h4M12 10v7m-3-3 3 3 3-3"/></svg>';
 add('span','dj-install-label','가이드북 다운로드',guidebook);
 add('small','dj-install-status',guidebookSizeLabel(guidebookBytes),guidebook);
 add('span','dj-install-chevron','›',guidebook).setAttribute('aria-hidden','true');
 if(blocked){(gate?.querySelector('.dj-mobile-only-message')||gate||doc.body).append(card);gate?.setAttribute('aria-labelledby',heading.id);}
 else{card.addEventListener('cancel',()=>{try{win.sessionStorage.setItem(INSTALL_SESSION_KEY,'1');}catch{}});doc.body.append(card);
 let seen=false;try{seen=win.sessionStorage.getItem(INSTALL_SESSION_KEY)==='1';}catch{}if(!seen||new URLSearchParams(win.location.search).get('install')==='1'){if(typeof card.showModal==='function')card.showModal();else card.setAttribute('open','');}}
 win.addEventListener('beforeinstallprompt',e=>{e.preventDefault();promptEvent=e;});win.addEventListener('appinstalled',finish);
 Promise.resolve().then(()=>win.fetch('/download-links.json',{cache:'no-store'})).then(r=>r.ok?r.json():{}).then(data=>{
  // iOS native distribution remains paused; never consume configured iOS links.
  if(data?.androidAutoRelease===true&&!links.android)return refreshAndroid();
  if(!androidCheck&&!links.android)buttons.get('android').status.textContent='다운로드 확인 필요';
 }).catch(()=>{if(!androidCheck&&!links.android)buttons.get('android').status.textContent='다운로드 확인 필요';});
 return card;
}
