/** Low-pressure browser-only PWA suggestion.
 * Uses the existing runtime browser/PWA detection, never interrupts onboarding
 * or open map sheets, and does not install anything without user action.
 */
import {detectMobileRunMode} from './mobile-browser-layout.js';
import {MOBILE_SCALE_BLOCKERS,mobileScaleBlockerVisible} from './map-scale-docking.js';

export const WEBAPP_TIP_STORAGE_KEY='dj-browser-webapp-hint-snooze-v1';
export const WEBAPP_TIP_SNOOZE_MS=30*24*60*60*1000;

export function webAppInstallSteps(userAgent=''){
  const ua=String(userAgent);
  const ios=/iPhone|iPad|iPod/i.test(ua);
  const android=/Android/i.test(ua);
  if(ios){
    const safari=/Safari/i.test(ua)&&!/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
    return safari?[
      'Safari에서 공유 메뉴를 엽니다.',
      '홈 화면에 추가를 선택합니다.',
      '웹 앱으로 열기를 켜고 추가한 뒤 홈 화면 아이콘으로 실행합니다.'
    ]:[
      '브라우저의 공유 메뉴에서 홈 화면에 추가를 선택합니다.',
      '앱처럼 열기 옵션이 있다면 켜고 추가합니다.',
      '홈 화면 아이콘으로 실행합니다. 옵션이 없다면 Safari에서 다시 시도하세요.'
    ];
  }
  if(android)return [
    'Chrome 오른쪽 위의 더보기(⋮) 메뉴를 엽니다.',
    '앱 설치 또는 홈 화면에 추가를 선택합니다.',
    '설치를 확인한 뒤 홈 화면 아이콘으로 실행합니다.'
  ];
  return [
    'Safari 또는 Chrome에서 이 사이트를 엽니다.',
    '공유 메뉴나 더보기 메뉴에서 홈 화면에 추가 또는 설치를 선택합니다.',
    '홈 화면에 생성된 아이콘으로 실행합니다.'
  ];
}

export function shouldOfferWebApp({mode='desktop',dismissedUntil=0,now=Date.now()}={}){
  return mode==='browser'&&Number(dismissedUntil||0)<=now;
}

const BLOCKING_SURFACES=[...MOBILE_SCALE_BLOCKERS,
  '#dj860-onboarding','#map-gesture-guide','#dj-ai-search-modal[open]'
].join(',');

export function installBrowserWebAppTip(doc=document,win=window,{delayMs=8000}={}){
  const app=doc?.getElementById?.('app');
  if(!app||!win||doc.getElementById('dj-browser-webapp-tip'))return ()=>{};
  const make=(tag,cls,content)=>{
    const e=doc.createElement(tag);if(cls)e.className=cls;
    if(content!==undefined)e.textContent=content;
    return e;
  };
  const card=make('aside','dj-browser-webapp-tip');
  card.id='dj-browser-webapp-tip';card.hidden=true;
  card.setAttribute('role','region');card.setAttribute('aria-label','웹앱 사용 안내');
  const heading=make('div','dj-webapp-tip-heading');
  const emblem=make('span','dj-webapp-tip-emblem','+');
  emblem.setAttribute('aria-hidden','true');
  const titles=make('div','dj-webapp-tip-titles');
  const title=make('strong','','웹앱으로 더 편리하게');
  const close=make('button','dj-webapp-tip-close');
  close.type='button';close.setAttribute('aria-label','웹앱 안내 30일간 숨기기');
  close.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M5 5 19 19M19 5 5 19"/></svg>';
  titles.append(title);heading.append(emblem,titles,close);
  const copy=make('p','dj-webapp-tip-copy','홈 화면에 추가하면 주소창 없이 더 넓은 지도 화면으로 이용할 수 있습니다.');
  const actions=make('div','dj-webapp-tip-actions');
  const how=make('button','dj-webapp-tip-how','설치 방법 보기');how.type='button';
  how.setAttribute('aria-expanded','false');how.setAttribute('aria-controls','dj-webapp-tip-steps');
  const later=make('button','dj-webapp-tip-later','나중에');later.type='button';
  actions.append(how,later);
  const steps=make('ol','dj-webapp-tip-steps');steps.id='dj-webapp-tip-steps';steps.hidden=true;
  for(const instruction of webAppInstallSteps(win.navigator?.userAgent)){
    steps.append(make('li','',instruction));
  }
  card.append(heading,copy,actions,steps);app.append(card);
  let dismissed=false,disposed=false,pending=0,ready=false;
  // The legacy animated map TIP has high-specificity visibility rules.
  // Use an inline important override only while the install suggestion is shown,
  // and restore its exact previous inline declarations when dismissed.
  let legacyTipBackup=null;
  const syncLegacyMapTip=(hide)=>{
    const legacy=doc.getElementById('dj840-map-tip');
    if(legacyTipBackup&&(!hide||legacyTipBackup.node!==legacy)){
      const {node,visibility,visibilityPriority,pointerEvents,pointerEventsPriority}=legacyTipBackup;
      const restore=(name,value,priority)=>{
        if(value)node.style.setProperty(name,value,priority);
        else node.style.removeProperty(name);
      };
      restore('visibility',visibility,visibilityPriority);
      restore('pointer-events',pointerEvents,pointerEventsPriority);
      legacyTipBackup=null;
    }
    if(hide&&legacy){
      if(!legacyTipBackup)legacyTipBackup={
        node:legacy,
        visibility:legacy.style.getPropertyValue('visibility'),
        visibilityPriority:legacy.style.getPropertyPriority('visibility'),
        pointerEvents:legacy.style.getPropertyValue('pointer-events'),
        pointerEventsPriority:legacy.style.getPropertyPriority('pointer-events')
      };
      legacy.style.setProperty('visibility','hidden','important');
      legacy.style.setProperty('pointer-events','none','important');
    }
  };
  const now=()=>Number(win.Date?.now?.()??Date.now());
  const until=()=>{
    try{return Number(win.localStorage?.getItem(WEBAPP_TIP_STORAGE_KEY)||0)||0;}
    catch{return 0;}
  };
  const blocked=()=>{
    if(app.dataset.tab!=='map'||app.dataset.dj860OnboardingOpen==='true'||app.dataset.dj910SheetOpen==='true'||app.classList.contains('map-safety-open')||app.classList.contains('map-controls-open'))return true;
    if(doc.visibilityState==='hidden'||doc.documentElement?.dataset?.djBrowserKeyboard==='open')return true;
    const active=doc.activeElement;
    if(active&&(/^(INPUT|TEXTAREA|SELECT)$/i.test(active.tagName||'')||active.isContentEditable))return true;
    return [...doc.querySelectorAll(BLOCKING_SURFACES)].some(node=>mobileScaleBlockerVisible(node,win));
  };
  const sync=()=>{
    if(disposed||dismissed)return;
    const allowed=ready&&shouldOfferWebApp({
      mode:detectMobileRunMode(win),dismissedUntil:until(),now:now()
    });
    const visible=allowed&&!blocked();
    if(card.hidden===visible)card.hidden=!visible;
    const state=String(visible);
    if(app.dataset.djWebappTipVisible!==state)app.dataset.djWebappTipVisible=state;
    syncLegacyMapTip(visible);
  };
  const tick=()=>{
    pending=0;sync();
    if(!disposed&&!dismissed&&card.hidden&&
      detectMobileRunMode(win)==='browser'&&now()<deadline){
      pending=win.setTimeout(tick,2500);
    }
  };
  const snooze=()=>{
    dismissed=true;card.hidden=true;
    app.dataset.djWebappTipVisible='false';
    syncLegacyMapTip(false);
    try{win.localStorage?.setItem(WEBAPP_TIP_STORAGE_KEY,String(now()+WEBAPP_TIP_SNOOZE_MS));}
    catch{}
    if(pending){win.clearTimeout(pending);pending=0;}
  };
  const onHow=()=>{
    steps.hidden=!steps.hidden;
    how.textContent=steps.hidden?'설치 방법 보기':'설치 방법 접기';
    how.setAttribute('aria-expanded',String(!steps.hidden));
    sync();
  };
  how.addEventListener('click',onHow);
  later.addEventListener('click',snooze);
  close.addEventListener('click',snooze);
  const onTap=event=>{
    if(card.contains(event.target))return;
    win.setTimeout(sync,0);
  };
  doc.addEventListener('click',onTap,true);
  doc.addEventListener('visibilitychange',sync);
  win.addEventListener('pageshow',sync);
  const observer=typeof MutationObserver==='function'?new MutationObserver(records=>{
    if(records.some(({target})=>target===app||target.matches?.(BLOCKING_SURFACES)))sync();
  }):null;
  observer?.observe(doc.body,{subtree:true,attributes:true,attributeFilter:['data-tab','data-dj860-onboarding-open','data-dj910-sheet-open','data-dj806-active-surface','class','hidden','aria-hidden','open']});
  const deadline=now()+90000;
  pending=win.setTimeout(()=>{ready=true;tick();},Math.max(0,delayMs));
  return ()=>{
    disposed=true;
    if(pending)win.clearTimeout(pending);
    observer?.disconnect();doc.removeEventListener('click',onTap,true);
    doc.removeEventListener('visibilitychange',sync);win.removeEventListener('pageshow',sync);
    syncLegacyMapTip(false);
    card.remove();
    delete app.dataset.djWebappTipVisible;
  };
}
if(typeof document!=='undefined'&&typeof window!=='undefined'){
  const boot=()=>installBrowserWebAppTip(document,window);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
}
