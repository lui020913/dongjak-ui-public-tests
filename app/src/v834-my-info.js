/** v8.2.15: My Info settings hub; existing account controller remains authoritative. */
const icon=(name)=>({
 profile:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-5 3-8 8-8s8 3 8 8"/>',
 map:'<path d="M3 6 9 3l6 3 6-3v15l-6 3-6-3-6 3V6Z"/><path d="M9 3v15m6-12v15"/>',
 walk:'<circle cx="12" cy="4" r="2"/><path d="m8 10 4 2 4-2m-4 2v4m-5 6 5-6 5 6"/>',
 bus:'<rect x="4" y="3" width="16" height="17" rx="3"/><path d="M4 11h16m-12 9v2m8-2v2M8 16h.1M16 16h.1"/>',
 theme:'<path d="M19 14.5A8.5 8.5 0 0 1 9.5 5a8.6 8.6 0 1 0 9.5 9.5Z"/>',
 type:'<path d="M4 20 10 4l6 16M6 15h8M17 9h5m-2.5-3v9"/>',
 heart:'<path d="M20 6a5 5 0 0 0-7 0l-1 1-1-1a5 5 0 0 0-7 7l8 8 8-8a5 5 0 0 0 0-7Z"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
 back:'<path d="m15 19-7-7 7-7"/>'
})[name]||'';
function symbol(name){return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${icon(name)}</svg>`;}
export function installMyInfo(doc=document){
 const panel=doc.getElementById('mine-panel');if(!panel||panel.dataset.dj834Installed)return false;
 const heading=panel.querySelector('.dj-sheet-chrome, .page-heading');const account=panel.querySelector('#dj824-account');
 const body=panel.querySelector(':scope > .dj836-sheet-body')||panel;
 if(!heading||!account)return false;
 panel.dataset.dj834Installed='true';
 const landing=doc.createElement('section');landing.className='dj834-my-home';landing.setAttribute('aria-label','내 정보 설정');
 landing.innerHTML=`<button type="button" class="dj834-profile-card" data-dj834-action="profile">
 <span class="dj834-user-avatar" aria-hidden="true">${symbol('profile')}</span><span class="dj834-profile-meta"><strong class="dj834-profile-name">내 프로필</strong><small>로그인 · 내 프로필 설정</small></span><span class="dj834-chevron">›</span></button>
 <h3 class="dj834-group-title">앱 &amp; 화면</h3><div class="dj834-settings-group">
 <button type="button" data-dj834-action="theme"><span class="dj834-setting-icon">${symbol('theme')}</span><span>화면 테마</span><small class="dj834-current-theme">변경</small><span class="dj834-chevron">›</span></button>
 <button type="button" data-dj834-action="type"><span class="dj834-setting-icon">${symbol('type')}</span><span>글자 크기·굵기</span><span class="dj834-chevron">›</span></button>
 <button type="button" data-dj834-action="map"><span class="dj834-setting-icon">${symbol('map')}</span><span>지도·도보 설정</span><span class="dj834-chevron">›</span></button>
 <button type="button" data-dj834-action="history"><span class="dj834-setting-icon">${symbol('info')}</span><span>전체 업데이트 내역</span><span class="dj834-chevron">›</span></button></div>
 <h3 class="dj834-group-title">내 활동</h3><div class="dj834-settings-group">
 <button type="button" data-dj834-action="records"><span class="dj834-setting-icon">${symbol('heart')}</span><span>즐겨찾기 · 내 기록</span><span class="dj834-chevron">›</span></button></div>`;
 const detail=doc.createElement('section');detail.className='dj834-my-detail';detail.hidden=true;
 detail.innerHTML=`<div class="dj834-detail-nav"><button type="button" class="dj834-detail-back" aria-label="내 정보 설정으로 돌아가기">${symbol('back')} 내 정보</button><h3 class="dj834-detail-title"></h3></div><div class="dj834-detail-content"></div>`;
 const accountBox=doc.createElement('div');accountBox.className='dj834-account-container';accountBox.append(account);

 // v8.7.7: local-device photo, never uploaded without an explicit cloud action.
 const photoKey='dj877_local_profile_photo_v1';
 const photoBox=doc.createElement('section');photoBox.className='dj877-photo-box';
 photoBox.innerHTML=`<div class="dj877-photo-top"><span class="dj877-photo-preview" aria-hidden="true">${symbol('profile')}</span><div><strong>프로필 사진</strong><small>이 기기에만 저장되며 계정 사진과는 별개입니다.</small></div></div><div class="dj877-photo-actions"><button type="button" class="dj877-photo-choose">사진 선택</button><button type="button" class="dj877-photo-remove">기본 이미지</button></div><input type="file" class="dj877-photo-file" accept="image/*" aria-label="프로필 사진 선택" hidden><p class="dj877-photo-status" role="status" aria-live="polite"></p>`;
 accountBox.prepend(photoBox);
 const avatar=landing.querySelector('.dj834-user-avatar'),preview=photoBox.querySelector('.dj877-photo-preview'),status=photoBox.querySelector('.dj877-photo-status');
 const baseAvatar=avatar.innerHTML,basePreview=preview.innerHTML;
 const applyPhoto=data=>{
   for(const [target,fallback] of [[avatar,baseAvatar],[preview,basePreview]]){
     if(!data){target.innerHTML=fallback;continue;}
     const img=doc.createElement('img');img.src=data;img.alt='';img.className='dj877-avatar-photo';target.replaceChildren(img);
   }
 };
 try{applyPhoto(doc.defaultView.localStorage.getItem(photoKey)||'');}catch{applyPhoto('');}
 photoBox.querySelector('.dj877-photo-choose').addEventListener('click',()=>photoBox.querySelector('.dj877-photo-file').click());
 photoBox.querySelector('.dj877-photo-remove').addEventListener('click',()=>{
   try{doc.defaultView.localStorage.removeItem(photoKey);}catch{}
   applyPhoto('');status.textContent='기본 사진으로 변경했습니다.';
 });
 photoBox.querySelector('.dj877-photo-file').addEventListener('change',async event=>{
   const file=event.target.files?.[0];if(!file)return;
   if(!file.type.startsWith('image/')){status.textContent='이미지 파일을 선택해 주세요.';return;}
   if(file.size>12*1024*1024){status.textContent='12MB 이하의 사진만 사용할 수 있습니다.';return;}
   const win=doc.defaultView,url=win.URL.createObjectURL(file);
   try{
     const image=new win.Image();await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src=url;});
     const canvas=doc.createElement('canvas');canvas.width=256;canvas.height=256;
     const ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas unavailable');
     const side=Math.min(image.naturalWidth,image.naturalHeight);
     ctx.drawImage(image,(image.naturalWidth-side)/2,(image.naturalHeight-side)/2,side,side,0,0,256,256);
     const data=canvas.toDataURL('image/jpeg',.78);
     win.localStorage.setItem(photoKey,data);applyPhoto(data);status.textContent='프로필 사진을 이 기기에 저장했습니다.';
   }catch(error){status.textContent='사진을 저장할 수 없습니다. 저장 공간 또는 파일 형식을 확인해 주세요.';}
   finally{win.URL.revokeObjectURL(url);event.target.value='';}
 });
 const typography=doc.createElement('section');typography.className='dj877-type-settings';
 typography.innerHTML=`<p>메뉴와 창의 글씨 크기·굵기를 조절합니다. 지도 지명 자체는 변경되지 않습니다.</p>
   <div class="dj885-type-field"><span class="dj885-type-label">글자 크기</span><div class="dj885-type-choices" role="group" aria-label="글자 크기 설정"><button type="button" data-dj885-type="scale" data-value="small">작게</button><button type="button" data-dj885-type="scale" data-value="normal">기본</button><button type="button" data-dj885-type="scale" data-value="large">크게</button><button type="button" data-dj885-type="scale" data-value="xlarge">더 크게</button></div></div>
   <div class="dj885-type-field"><span class="dj885-type-label">글자 굵기</span><div class="dj885-type-choices" role="group" aria-label="글자 굵기 설정"><button type="button" data-dj885-type="weight" data-value="normal">기본</button><button type="button" data-dj885-type="weight" data-value="bold">굵게</button></div></div>`;
 const syncTypography=()=>{
   for(const [part,id] of [['scale','dj-type-scale'],['weight','dj-type-weight']]){
     const native=doc.getElementById(id);
     const value=native?.value||'normal';
     for(const button of typography.querySelectorAll(`[data-dj885-type="${part}"]`)){
       const active=button.dataset.value===value;
       button.setAttribute('aria-pressed',String(active));
     }
   }
 };
 typography.addEventListener('click',event=>{
   const button=event.target.closest('button[data-dj885-type]');
   if(!button)return;
   const kind=button.dataset.dj885Type;
   const id=kind==='scale'?'dj-type-scale':kind==='weight'?'dj-type-weight':null;
   const native=id&&doc.getElementById(id);if(!native)return;
   // Avoid iOS native select UI, recursive click forwarding and duplicate changes.
   if(native.value!==button.dataset.value){
     native.value=button.dataset.value;
     native.dispatchEvent(new Event('change',{bubbles:true}));
   }
   // CSS-only mobile readability must receive a stable, explicit state.
   // The legacy native change handler remains the persistence owner.
   const app=doc.getElementById('app');
   if(app){
     if(kind==='scale')app.dataset.djTypeScale=button.dataset.value;
     if(kind==='weight')app.dataset.djTypeWeight=button.dataset.value;
   }
   syncTypography();
 });
 const records=doc.createElement('div');records.className='dj834-records-container';
 for(const child of [...body.children]){
   if(child===heading||child===landing||child===detail)continue;
   records.append(child);
 }
 // Account always belongs to profile view. Move the old activity DOM without
 // recreating it so favorite buttons and existing event handlers keep working.
 body.prepend(landing);landing.insertAdjacentElement('afterend',detail);
 const title=detail.querySelector('.dj834-detail-title');const content=detail.querySelector('.dj834-detail-content');
 // Keep profile, typography, and saved records in the live DOM so renderMy() can
 // update #my-points even when the records subview has not been opened yet.
 accountBox.hidden=true;typography.hidden=true;records.hidden=true;
 content.append(accountBox,typography,records);
 const profileName=landing.querySelector('.dj834-profile-name');
 const profileSub=landing.querySelector('.dj834-profile-meta small');
 const updateProfile=()=>{
   const name=account.querySelector('.dj820-display-name')?.textContent?.trim();
   const loggedIn=account.querySelector('.dj820-account-panel')?.hidden===false;
   if(name&&loggedIn){profileName.textContent=name;profileSub.textContent='내 프로필 설정';}
   else{profileName.textContent='로그인 또는 회원가입';profileSub.textContent='카카오 · 이메일 계정 관리';}
   landing.querySelector('.dj834-current-theme').textContent=doc.getElementById('app')?.dataset.theme==='dark'?'다크':'라이트';
 };
 const observer=new MutationObserver(updateProfile);
 observer.observe(account,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['hidden']});
 const app=doc.getElementById('app');
 if(app)observer.observe(app,{attributes:true,attributeFilter:['data-theme']});
 // iOS PWA may suspend Web Animations when a sheet is being resized or
 // the native select is opening. Navigation never waits for an animation.
 const reducedMotion=()=>doc.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true;
 function enter(node){
   if(!node||reducedMotion()||typeof node.animate!=='function')return;
   try{node.animate([{opacity:.3,transform:'translateY(4px)'},{opacity:1,transform:'translateY(0)'}],{
     duration:160,easing:'cubic-bezier(.2,.75,.25,1)'
   });}catch{/* Appearance must never block navigation. */}
 }
 function showDetail(view){
   landing.hidden=true;
   title.textContent=view==='profile'?'내 프로필 설정':view==='type'?'글자 크기·굵기':'즐겨찾기 · 내 기록';
   accountBox.hidden=view!=='profile';
   typography.hidden=view!=='type';
   records.hidden=view!=='records';
   if(view==='type')syncTypography();
   detail.hidden=false;
   body.scrollTop=0;
   enter(detail);
   if(view==='profile'){
     const toggle=account.querySelector('.dj824-account-toggle');
     if(toggle?.getAttribute('aria-expanded')!=='true')toggle?.click();
     account.querySelector('[data-manage-tab="profile"]')?.click();
   }
 }
 function back(){
   detail.hidden=true;
   landing.hidden=false;
   body.scrollTop=0;
   enter(landing);
 }
 detail.querySelector('.dj834-detail-back').addEventListener('click',back);
 landing.addEventListener('click',event=>{
   const button=event.target.closest('[data-dj834-action]');if(!button)return;
   const action=button.dataset.dj834Action;
   if(action==='profile'||action==='records'||action==='type'){showDetail(action);return;}
   if(action==='theme'){doc.getElementById('theme-toggle')?.click();updateProfile();return;}
   if(action==='route'){doc.querySelector('#bottom-nav [data-tab="route"]')?.click();return;}
   if(action==='transit'){
     doc.querySelector('#bottom-nav [data-tab="map"]')?.click();
     doc.getElementById('map-tools-toggle')?.click();return;
   }
   if(action==='map'){doc.dispatchEvent(new Event('dj:open-map-settings'));return;}
   if(action==='history'){doc.getElementById('version-history-trigger')?.click();return;}
 });
 updateProfile();return true;
}
/** Tab visibility recovery is independent of the account component. The
 * navigation must remain usable when the Supabase client fails to initialize. */
export function installMyInfoPanelRecovery(doc=document,win=window){
 const app=doc.getElementById('app');
 const panel=doc.getElementById('mine-panel');
 const mineTab=doc.querySelector('#bottom-nav .nav-tab[data-tab="mine"]');
 if(!app||!panel||!mineTab||mineTab.dataset.dj834Recovery)return ()=>{};
 mineTab.dataset.dj834Recovery='true';
 const reconcile=()=>{
   if(app.dataset.tab!=='mine'||!panel.hidden)return;
   // A child dialog legitimately replaces the page while it is open.
   const inDialog=['dj-map-settings','dj-app-about','version-history-modal','admin-dong-picker']
     .some(id=>{const n=doc.getElementById(id);return n&&!n.hidden;});
   if(!inDialog)panel.hidden=false;
 };
 const afterNavigation=()=>{(win.requestAnimationFrame||((fn)=>win.setTimeout(fn,0)))(reconcile);};
 mineTab.addEventListener('click',afterNavigation);
 return ()=>{mineTab.removeEventListener('click',afterNavigation);delete mineTab.dataset.dj834Recovery;};
}
function start(){
 installMyInfoPanelRecovery();
 if(installMyInfo())return;
 const observer=new MutationObserver(()=>{if(installMyInfo())observer.disconnect();});
 observer.observe(document.documentElement,{childList:true,subtree:true});
}
if(typeof document!=='undefined'){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
}
