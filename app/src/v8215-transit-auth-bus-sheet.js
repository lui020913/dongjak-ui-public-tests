import {getActiveCloudClient} from './v824-favorites-cloud.js';
/** Scoped transport information UI: sign-in prompt, and input-safe pointer handle.
 * Actual authentication and favorite persistence remain in the existing modules. */
export function classifyBusRoute(route,explicitType=''){
  const name=String(route||'').trim();
  const type=String(explicitType||'').trim();
  const official={'1':'airport','2':'village','3':'trunk','4':'branch','5':'circular','6':'metro'};
  if(official[type])return official[type];
  if(/^N\d{2,3}$/i.test(name))return 'night';
  if(/^(?:공항|airport)/i.test(type)||/^(?:공항|airport)/i.test(name))return 'airport';
  if(['641','650'].includes(name))return 'trunk';
  if(name==='6515')return 'branch';
  if(/^6[0-3]\d{2}$/.test(name)||/^67\d{2}$/.test(name))return 'airport';
  if(/^(?:마을|village)/i.test(type)||/^(?:동작|관악|서초|영등포|구로|금천|마포|용산|강남|강서|양천|동대문|송파|광진|강북|성북|성동|도봉|노원|은평|종로|중구|중랑|서대문|강동|강남)[가-힣]?\d{1,3}(?:-|$)/.test(name))return 'village';
  if(/^(?:광역|metropolitan)/i.test(type)||/^[Mm]\d{3,4}$/.test(name)||/^9\d{3}$/.test(name))return 'metro';
  if(/^(?:간선|trunk)/i.test(type)||/^[1-7]\d{2}(?:[AB])?$/i.test(name))return 'trunk';
  if(/^(?:지선|branch)/i.test(type)||/^[1-7]\d{3}(?:[AB])?$/i.test(name))return 'branch';
  if(/^(?:순환|circulation)/i.test(type)||/^0\d{2,3}$/.test(name))return 'circular';
  if(/^(?:심야|night)/i.test(type)||/^N\d{2,3}$/i.test(name))return 'night';
  return 'unknown';
}
export const BUS_CATEGORY_LABEL={trunk:'간선버스',branch:'지선버스',village:'마을버스',metro:'광역버스',airport:'공항버스',circular:'순환버스',night:'심야버스',unknown:'버스 유형 미확인'};

export function installTransitAuthBusSheet(doc=document,win=window){
  const panel=doc.getElementById('transport-sheet');
  if(!panel||panel.dataset.djTransportAuthBusReady==='true')return ()=>{};
  panel.dataset.djTransportAuthBusReady='true';
  const root=doc.getElementById('app')||doc.body;
  // Retain the transport-map controller as the sole owner of selected places.
  // A successful authenticated click is replayed to its ORIGINAL handler;
  // guest clicks are intercepted before that handler can save locally.
  let replaying=false;
  async function onBookmarkClick(event){
    const bookmark=event.target?.closest?.('#transport-save-place');
    const facilitySave=event.target?.closest?.('.dj815-place-actions > button:first-child');
    if((!bookmark&&!facilitySave)||(bookmark&&!panel.contains(bookmark))||replaying)return;
    event.preventDefault();event.stopImmediatePropagation();
    const client=getActiveCloudClient();
    let authorized=false;
    try{if(client){const {data,error}=await client.auth.getSession();authorized=!error&&Boolean(data?.session?.user?.id);}}catch{}
    if(!authorized){open();return;}
    const target=bookmark||facilitySave;
    if(!target?.isConnected||(bookmark&&panel.hidden))return;
    replaying=true;
    try{target.click();}finally{replaying=false;}
  }
  doc.addEventListener('click',onBookmarkClick,true);
  // Prevent an unsigned guest from silently saving a new favorite by changing
  // the facility folder selector instead of pressing the star/save control.
  let replayingFolder=false;
  async function onFolderChange(event){
    const selector=event.target?.closest?.('.dj815-place-folder select');
    if(!selector||replayingFolder)return;
    event.preventDefault();event.stopImmediatePropagation();
    let authorized=false;
    try{const client=getActiveCloudClient();if(client){const {data,error}=await client.auth.getSession();authorized=!error&&Boolean(data?.session?.user?.id);}}catch{}
    if(!authorized){selector.selectedIndex=0;open();return;}
    if(!selector.isConnected)return;
    replayingFolder=true;
    try{selector.dispatchEvent(new Event('change',{bubbles:true}));}finally{replayingFolder=false;}
  }
  doc.addEventListener('change',onFolderChange,true);
  // Official API arrival data does not consistently include route-category
  // metadata. Classify only unambiguous route numbers/prefixes; unknowns are
  // neutral and must not be falsely presented as verified route types.
  const arrivals=doc.getElementById('transport-arrivals');
  function decorateRoutes(){
    if(panel.dataset.kind!=='bus'||!arrivals)return;
    for(const route of arrivals.querySelectorAll('.transport-arrival-row .transport-arrival-main > strong')){
      if(route.classList.contains('dj-transit-bus-route'))continue;
      const name=route.textContent||'';
      const type=classifyBusRoute(name,route.dataset.routeType||'');
      route.classList.add('dj-transit-bus-route');route.dataset.busClass=type;
      route.setAttribute('aria-label',`${BUS_CATEGORY_LABEL[type]} ${name}`);
    }
  }
  const busObserver=typeof MutationObserver!=='undefined'?new MutationObserver(decorateRoutes):null;
  if(arrivals)busObserver?.observe(arrivals,{childList:true,subtree:true});
  const kindObserver=typeof MutationObserver!=='undefined'?new MutationObserver(decorateRoutes):null;
  kindObserver?.observe(panel,{attributes:true,attributeFilter:['data-kind']});
  decorateRoutes();
  const modal=doc.createElement('section');
  modal.id='dj-transit-signin-prompt';
  modal.className='dj-transit-signin-prompt';
  modal.setAttribute('role','dialog');
  modal.setAttribute('aria-modal','true');
  modal.setAttribute('aria-labelledby','dj-transit-signin-title');
  modal.hidden=true;
  modal.innerHTML=`<div class="dj-transit-signin-backdrop" data-close="true"></div>
    <div class="dj-transit-signin-card">
      <button type="button" class="dj-transit-signin-x" aria-label="로그인 안내 닫기">×</button>
      <div class="dj-transit-signin-symbol" aria-hidden="true">☆</div>
      <h3 id="dj-transit-signin-title">즐겨찾기는 로그인 후 이용할 수 있습니다</h3>
      <p>역과 정류장을 내 즐겨찾기에 저장하려면 로그인해 주세요. 카카오 간편로그인도 이용할 수 있습니다.</p>
      <div class="dj-transit-signin-buttons">
        <button type="button" class="dj-transit-signin-kakao">카카오로 간편로그인</button>
        <button type="button" class="dj-transit-signin-account">로그인 · 회원가입</button>
      </div>
    </div>`;
  root.append(modal);
  const open=()=>{modal.hidden=false;modal.classList.remove('closing');modal.querySelector('.dj-transit-signin-account')?.focus({preventScroll:true});};
  const dismiss=()=>{if(modal.hidden)return;modal.hidden=true;};
  const prompt=()=>open();
  const onKey=e=>{if(e.key==='Escape'&&!modal.hidden){dismiss();e.stopPropagation();}};
  modal.querySelector('.dj-transit-signin-x')?.addEventListener('click',dismiss);
  modal.querySelector('.dj-transit-signin-backdrop')?.addEventListener('click',dismiss);
  function showAccount(){
    dismiss();
    doc.querySelector('#bottom-nav .nav-tab[data-tab="mine"]')?.click();
    // The existing 'My info > Profile' view owns all login and account flows.
    doc.querySelector('#mine-panel .dj834-profile-card')?.click();
    const toggle=doc.querySelector('#dj824-account .dj824-account-toggle');
    if(toggle?.getAttribute('aria-expanded')!=='true')toggle?.click();
  }
  modal.querySelector('.dj-transit-signin-account')?.addEventListener('click',showAccount);
  modal.querySelector('.dj-transit-signin-kakao')?.addEventListener('click',()=>{
    showAccount();
    const signin=doc.querySelector('#dj824-account .dj821-kakao-login[aria-label="카카오 계정으로 로그인"]');
    if(signin && !signin.disabled && !signin.hidden){signin.click();}
  });
  win.addEventListener('dongjak:transport-login-required',prompt);
  doc.addEventListener('keydown',onKey);
  // The existing central sheet controller owns swipe-to-dismiss. Make the
  // real (not just ::after decorative) handle an accessible pointer target.
  const grab=panel.querySelector(':scope > .handle');
  if(grab){grab.setAttribute('role','separator');grab.setAttribute('tabindex','0');grab.setAttribute('aria-label','아래로 밀어 교통정보 창 닫기');
    grab.addEventListener('keydown',e=>{if(e.key==='Escape'||e.key==='Enter'){doc.getElementById('transport-close')?.click();}});
  }
  return ()=>{doc.removeEventListener('click',onBookmarkClick,true);doc.removeEventListener('change',onFolderChange,true);busObserver?.disconnect();kindObserver?.disconnect();win.removeEventListener('dongjak:transport-login-required',prompt);doc.removeEventListener('keydown',onKey);modal.remove();delete panel.dataset.djTransportAuthBusReady;};
}
if(typeof document!=='undefined'&&typeof window!=='undefined'){
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>installTransitAuthBusSheet(),{once:true});
  else installTransitAuthBusSheet();
}
