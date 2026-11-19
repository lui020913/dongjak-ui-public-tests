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
export function androidReleaseAsset(marker,release){
 const v=marker?.application_version,sha=marker?.source_commit;
 if(marker?.release_status!=='DEPLOYED_PRODUCTION'||!/^\d+\.\d+\.\d+$/.test(v||'')||! /^[a-f0-9]{40}$/.test(sha||'')||release?.draft||release?.prerelease||release?.tag_name!=='android-v'+v||release?.target_commitish!==sha)return null;
 const name='Dongjak-Safety-Map-v'+v+'-release.apk',url='https://github.com/lui020913/dongjak-ui-public-tests/releases/download/android-v'+v+'/'+name;
 return release.assets?.some(a=>a.name===name&&a.browser_download_url===url&&a.state==='uploaded')?url:null;
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
 const heading=add('h2','','동작하는 안전지도',brand);heading.id='dj-install-heading';add('p','dj-install-subtitle','이용하실 방법을 선택해 주세요.',brand);
 const list=add('div','dj-install-list'),info=add('div','dj-install-info');info.hidden=true;info.setAttribute('aria-live','polite');
 const buttons=new Map();let promptEvent=null,links={};
 const showInfo=texts=>{info.replaceChildren();for(const t of texts)add('p','',t,info);info.hidden=false;};
 const finish=()=>{try{win.sessionStorage.setItem(INSTALL_SESSION_KEY,'1');}catch{}if(!blocked&&card.open)card.close();};
 for(const key of installChoices(env.platform)){
 const b=add('button','dj-install-choice',null,list);b.type='button';b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+paths[key]+'</svg>';add('span','dj-install-label',labels[key],b);
 const status=add('small','dj-install-status',key==='android'||key==='ios'?'확인 중':'',b);add('span','dj-install-chevron','›',b).setAttribute('aria-hidden','true');buttons.set(key,{b,status});
 b.addEventListener('click',async()=>{
 if(key==='web'){if(blocked)showInfo(['스마트폰으로 이 사이트에 접속해 주세요. 아래 QR코드를 사용할 수 있습니다.']);else finish();return;}
 if(key==='pwa'){showInfo(steps(win.navigator.userAgent));if(promptEvent){const install=add('button','dj-install-prompt','웹앱 설치하기',info);install.type='button';install.addEventListener('click',async()=>{const p=promptEvent;promptEvent=null;if(!p)return;install.disabled=true;try{await p.prompt();if((await p.userChoice)?.outcome==='accepted')finish();}catch{}finally{install.remove();}});}return;}
 const url=safeDownloadUrl(links[key],key);if(url)win.location.assign(url);else showInfo([key==='ios'?'iPhone 앱은 현재 서명 및 Apple 배포 준비 중입니다. 웹앱을 이용해 주세요.':'일반 사용자용 서명된 APK 다운로드 링크는 준비 중입니다. 웹앱을 이용해 주세요.']);
 });
 }
 if(blocked){const img=add('img','dj-install-qr');img.src='/install-qr.png';img.alt='스마트폰으로 동작하는 안전지도에 접속하는 QR코드';(gate?.querySelector('.dj-mobile-only-message')||gate||doc.body).append(card);}
 else{const close=add('button','dj-install-dismiss','나중에');close.type='button';close.addEventListener('click',finish);card.addEventListener('cancel',()=>{try{win.sessionStorage.setItem(INSTALL_SESSION_KEY,'1');}catch{}});doc.body.append(card);
 let seen=false;try{seen=win.sessionStorage.getItem(INSTALL_SESSION_KEY)==='1';}catch{}if(!seen||new URLSearchParams(win.location.search).get('install')==='1'){if(typeof card.showModal==='function')card.showModal();else card.setAttribute('open','');}}
 win.addEventListener('beforeinstallprompt',e=>{e.preventDefault();promptEvent=e;});win.addEventListener('appinstalled',finish);
 Promise.resolve().then(()=>win.fetch('/download-links.json',{cache:'no-store'})).then(r=>r.ok?r.json():{}).then(async data=>{
 links=data&&typeof data==='object'?{ios:data.ios}:{};
 if(data?.androidAutoRelease===true){try{const r=await win.fetch('/release-source.json',{cache:'no-store'});if(r.ok){const marker=await r.json();if(marker.release_status==='DEPLOYED_PRODUCTION'&&/^\d+\.\d+\.\d+$/.test(marker.application_version)){const response=await win.fetch('https://api.github.com/repos/lui020913/dongjak-ui-public-tests/releases/tags/android-v'+marker.application_version,{headers:{Accept:'application/vnd.github+json'},credentials:'omit'});if(response.ok)links.android=androidReleaseAsset(marker,await response.json());}}}catch{}}
 for(const key of ['android','ios'])buttons.get(key).status.textContent=safeDownloadUrl(links[key],key)?'':'준비 중';
 }).catch(()=>{for(const key of ['android','ios'])buttons.get(key).status.textContent='준비 중';});
 return card;
}
