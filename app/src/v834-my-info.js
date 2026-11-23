/** v8.2.15: My Info settings hub; existing account controller remains authoritative. */
const icon=(name)=>({
 profile:'<circle cx="12" cy="8" r="3.6"/><path d="M5 20c.3-3.7 3-6.1 7-6.1s6.7 2.4 7 6.1"/>',
 map:'<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5Z"/><path d="M9 3v16M15 5v16"/>',
 walk:'<path d="M5 19 19 5M8 5h11v11"/>',
 bus:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
 theme:'<path d="M20.9 13.1A9 9 0 0 1 10.9 3.1 9 9 0 1 0 20.9 13.1Z"/><path d="M19 3v4M17 5h4"/>',
 type:'<path d="M3 19 9.2 5l6.2 14M5.4 14h7.4M16 10h5M18.5 10v9"/>',
 heart:'<path d="M20.8 5.6a5.3 5.3 0 0 0-7.5 0L12 6.9l-1.3-1.3a5.3 5.3 0 0 0-7.5 7.5L12 22l8.8-8.9a5.3 5.3 0 0 0 0-7.5Z"/>',
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
 // Real iPhone Preview QA confirmed the full-screen My Info scroller reached
 // behind the floating 70px dock. Production has legacy high-specificity
 // panel padding:0 rules: reserve dock clearance in the actual DOM owner.
 // All My Info subpages share this single scroll container.
 if(doc.defaultView?.matchMedia?.('(max-width:699px)')?.matches){
   panel.style.setProperty('box-sizing','border-box','important');
   panel.style.setProperty('padding-bottom','calc(94px + env(safe-area-inset-bottom,0px))','important');
 }
 const landing=doc.createElement('section');landing.className='dj834-my-home';landing.setAttribute('aria-label','내 정보 설정');
 landing.innerHTML=`<button type="button" class="dj834-profile-card" data-dj834-action="profile">
 <span class="dj834-user-avatar" aria-hidden="true">${symbol('profile')}</span><span class="dj834-profile-meta"><strong class="dj834-profile-name">내 프로필</strong><small>로그인 · 내 프로필 설정</small></span><span class="dj834-chevron">›</span></button>
 <h3 class="dj834-group-title">앱 &amp; 화면</h3><div class="dj834-settings-group">
 <button type="button" data-dj834-action="type"><span class="dj834-setting-icon">${symbol('type')}</span><span>글자 크기·굵기</span><span class="dj834-chevron">›</span></button>
 <button type="button" data-dj834-action="map"><span class="dj834-setting-icon">${symbol('map')}</span><span>지도·도보 설정</span><span class="dj834-chevron">›</span></button>
 <button type="button" data-dj834-action="history"><span class="dj834-setting-icon">${symbol('info')}</span><span>전체 업데이트 내역</span><span class="dj834-chevron">›</span></button></div>
 <h3 class="dj834-group-title">내 활동</h3><div class="dj834-settings-group">
 <button type="button" data-dj834-action="records"><span class="dj834-setting-icon">${symbol('heart')}</span><span>즐겨찾기 · 내 기록</span><span class="dj834-chevron">›</span></button>
 <button type="button" data-dj834-action="tools"><span class="dj834-setting-icon">${symbol('map')}</span><span>추가 지도 도구</span><span class="dj834-chevron">›</span></button></div>`;
 const detail=doc.createElement('section');detail.className='dj834-my-detail';detail.hidden=true;
 detail.innerHTML=`<div class="dj834-detail-nav"><button type="button" class="dj834-detail-back" aria-label="내 정보 설정으로 돌아가기">${symbol('back')}</button><h3 class="dj834-detail-title"></h3></div><div class="dj834-detail-content"></div>`;
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
 typography.innerHTML=`<p>메뉴와 창의 글씨 크기·굵기를 조절합니다. 일부 지도 지명 크기도 함께 조정됩니다.</p><div class="dj926-type-preview" aria-label="글자 설정 미리보기">동작하는 안전지도</div>
   <div class="dj885-type-field"><span class="dj885-type-label">글자 크기</span><div class="dj885-type-choices" role="group" aria-label="글자 크기 설정"><button type="button" data-dj885-type="scale" data-value="small">작게</button><button type="button" data-dj885-type="scale" data-value="normal">기본</button><button type="button" data-dj885-type="scale" data-value="large">크게</button><button type="button" data-dj885-type="scale" data-value="xlarge">더 크게</button></div></div>
   <div class="dj885-type-field"><span class="dj885-type-label">글자 굵기</span><div class="dj885-type-choices" role="group" aria-label="글자 굵기 설정"><button type="button" data-dj885-type="weight" data-value="normal">기본</button><button type="button" data-dj885-type="weight" data-value="bold">굵게</button></div></div>`;
 const syncTypography=()=>{
   for(const [part,id] of [['scale','dj-type-scale'],['weight','dj-type-weight']]){
     const native=doc.getElementById(id);
     const value=native?.value||'normal';
     const preview=typography.querySelector('.dj926-type-preview');if(part==='scale')preview.style.fontSize=({small:13,normal:16,large:19,xlarge:22}[value]||16)+'px';else preview.style.fontWeight=value==='bold'?'750':'500';
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
 // iOS Settings-style child screens; each choice uses the existing owner.
 const languageSettings=doc.createElement('section');languageSettings.className='dj834-choice-settings';
 languageSettings.innerHTML='<p>앱에서 사용할 언어를 선택하세요.</p><button type="button" data-dj834-language="ko">한국어 <span aria-hidden="true">✓</span></button><button type="button" data-dj834-language="en">English <span aria-hidden="true">✓</span></button>';
 const syncChoices=()=>{
  const language=doc.getElementById('dj854-language-select')?.value||'ko';
  for(const element of languageSettings.querySelectorAll('[data-dj834-language]'))element.setAttribute('aria-pressed',String(element.dataset.dj834Language===language));
 };
 languageSettings.addEventListener('click',event=>{
  const button=event.target.closest('[data-dj834-language]');if(!button)return;
  const select=doc.getElementById('dj854-language-select');if(!select)return;
  if(select.value!==button.dataset.dj834Language){select.value=button.dataset.dj834Language;select.dispatchEvent(new Event('change',{bubbles:true}));}
  syncChoices();
 });
 const records=doc.createElement('div');records.className='dj834-records-container';
 // Advanced map utilities share the SAME full-screen child navigation as history.
 // The existing utility body and its event listeners are moved here by mobile-17.
 const toolsBox=doc.createElement('section');toolsBox.className='dj834-tools-container';
 // Reuse the actual release catalog and its existing category/source handlers.
 // It is a My Info child page on phones rather than a second overlapping modal.
 const historyBox=doc.createElement('section');historyBox.className='dj834-history-container';
 const historyList=doc.getElementById('version-history-list');
 const historyHost=historyList?.parentElement||null;
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
 accountBox.hidden=true;typography.hidden=true;records.hidden=true;languageSettings.hidden=true;historyBox.hidden=true;toolsBox.hidden=true;
 content.append(accountBox,typography,records);content.append(languageSettings,historyBox,toolsBox);
 // All inactive settings views remain mounted for real-time account/history
 // updates but must never contribute their own layout height. Historically
 // a versioned !important display:grid on the hidden typography view pushed
 // every subsequent subpage to the bottom of an iPhone viewport.
 for(const node of [accountBox,typography,records,languageSettings,historyBox,toolsBox])
   node.style.setProperty('display','none','important');
 // The language preference may initialize before My Info and be swept into
 // the inactive records container above. Reparent that *same live control*
 // directly to the App & Display list, preserving the select and listeners.
 const languageControl=panel.querySelector('.dj854-language-section');
 const displayGroup=landing.querySelector('.dj834-settings-group');
 if(languageControl&&displayGroup){
   displayGroup.insertBefore(languageControl,displayGroup.querySelector('[data-dj834-action="history"]'));
   languageControl.hidden=false;
 }
 const profileName=landing.querySelector('.dj834-profile-name');
 const profileSub=landing.querySelector('.dj834-profile-meta small');
 const updateProfile=()=>{
   const name=account.querySelector('.dj820-display-name')?.textContent?.trim();
   const loggedIn=account.querySelector('.dj820-account-panel')?.hidden===false;
   if(name&&loggedIn){profileName.textContent=name;profileSub.textContent='내 프로필 설정';}
   else{profileName.textContent='로그인 또는 회원가입';profileSub.textContent='카카오 · 이메일 계정 관리';}
 };
 const observer=new MutationObserver(updateProfile);
 observer.observe(account,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['hidden']});
 // iOS PWA may suspend Web Animations when a sheet is being resized or
 // the native select is opening. Navigation never waits for an animation.
 const reducedMotion=()=>doc.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true;
 function enter(node,direction='forward'){
   if(!node||reducedMotion()||typeof node.animate!=='function')return;
   const x=direction==='back'?-14:14;
   try{node.animate([{opacity:.88,transform:`translateX(${x}px)`},{opacity:1,transform:'translateX(0)'}],{
     duration:210,easing:'cubic-bezier(.2,.76,.24,1)'
   });}catch{/* Appearance must never block navigation. */}
 }
 function showDetail(view){
   landing.hidden=true;
   title.textContent=({profile:'내 프로필 설정',type:'글자 크기·굵기',records:'즐겨찾기 · 내 기록',language:'언어',history:'업데이트 내역',tools:'추가 지도 도구'})[view]||'설정';
   if(historyList&&historyHost&&view==='history'&&historyList.parentElement!==historyBox)historyBox.append(historyList);
   else if(historyList&&historyHost&&view!=='history'&&historyList.parentElement!==historyHost)historyHost.append(historyList);
   const views={profile:accountBox,type:typography,records,language:languageSettings,history:historyBox,tools:toolsBox};
   for(const [key,node] of Object.entries(views)){
     const active=key===view;
     node.hidden=!active;
     node.classList.toggle('dj834-view-active',active);
     // Inline important is deliberate: it defeats all historical high-ID
     // stylesheet display declarations without unmounting data owners.
     if(active)node.style.removeProperty('display');
     else node.style.setProperty('display','none','important');
   }
   content.style.setProperty('margin-top','0','important');
   content.style.setProperty('padding-top','0','important');
   content.dataset.dj834View=view;
   if(view==='type')syncTypography();if(view==='language')syncChoices();
   detail.hidden=false;
   body.scrollTop=0;
   const panelScroller=panel.querySelector(':scope > .dj836-sheet-body');
   if(panelScroller)panelScroller.scrollTop=0;
   enter(detail,'forward');
   if(view==='profile'){
     const toggle=account.querySelector('.dj824-account-toggle');
     if(toggle?.getAttribute('aria-expanded')!=='true')toggle?.click();
     account.querySelector('[data-manage-tab="profile"]')?.click();
   }
 }
 function back(){
   if(historyList&&historyHost&&historyList.parentElement!==historyHost)historyHost.append(historyList);
   delete content.dataset.dj834View;
   detail.hidden=true;
   landing.hidden=false;
   body.scrollTop=0;
   enter(landing,'back');
 }
 detail.querySelector('.dj834-detail-back').addEventListener('click',back);
 landing.addEventListener('click',event=>{
   const button=event.target.closest('[data-dj834-action]');if(!button)return;
   const action=button.dataset.dj834Action;
   if(action==='map'){doc.dispatchEvent(new Event('dj:open-map-settings'));return;}
  if(['profile','records','type','language','tools'].includes(action)){showDetail(action);return;}
   
   if(action==='route'){doc.querySelector('#bottom-nav [data-tab="route"]')?.click();return;}
   if(action==='transit'){
     doc.querySelector('#bottom-nav [data-tab="map"]')?.click();
     doc.getElementById('map-tools-toggle')?.click();return;
   }
   
   if(action==='history'){if(historyList)showDetail('history');else doc.getElementById('version-history-trigger')?.click();return;}
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
