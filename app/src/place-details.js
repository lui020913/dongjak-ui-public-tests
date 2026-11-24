import {normalizeFacilityName} from './facility-display-names.js';
import {usableMapSelectionOffset} from './transport-selection-marker.js';
import {markAiSurfaceDismissal} from './ai-surface-dismiss-guard.js';
import {setMobileSheetExpanded,dismissMobileSheet,interruptMobileSheetMotion,settleMobileSheetDrag,clearMobileSheetDrag} from './v889-mobile-sheet-motion.js';
import {bindHeaderDragInput} from './mobile-header-input.js';
import {bindReliablePopupClose} from './popup-close-input.js';
import {sheetDragOffset,sheetStageAction} from './mobile-window-motion.js';
import {installPlaceReviews} from './v834-place-reviews.js';
import {verifiedPlaceRecord} from './verified-place-directory.js';
import {facilityRoadAddress} from './map-search-refinement.js';
import {createSelectedLocationPin} from './selected-location-pin.js';
import {toggleSavedPlace,isPlaceSaved,recordRecentPlace,placeShareUrl,shareMapUrl,setSavedPlaceFolder,getPlaceFolders,savedPlaces,placeKey} from './v815-place-store.js';
import {enableAnchoredPopupDragging} from './draggable-floats.js';
/** Fact-first detail popup. Brief AI explanations are generated server-side only;
 * no invented contact/address and no telephone dialing action. */
const tidy=(s,n=240)=>String(s??'').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,n);
const phoneFormat=/^\+?[0-9()\-\s]{7,24}$/;
export function verifiedPhone(value){
  const v=tidy(value,35).split(/[;,]/)[0].trim();
  return phoneFormat.test(v)&&v.replace(/\D/g,'').length>=7?v:'';
}
export function verifiedWeb(value){
  try{const u=new URL(tidy(value,400));return ['https:','http:'].includes(u.protocol)?u.href:'';}catch{return '';}
}
export function placeData(raw={}){
  const name=tidy(normalizeFacilityName(raw.name,raw.type||raw.category),90)||'이름 미등록';
  const lon=Number(raw.lng), lat=Number(raw.lat);
  const trusted=verifiedPlaceRecord(name);
  const incomingAddress=tidy(facilityRoadAddress(raw),220);
  // A generic label such as '동작구 대표 장소' is not a street address.
  // An OSM-sourced address may belong to another Seoul borough (e.g. 노들섬 in 용산구).
  // Keep only a full street address with a building number, not a generic district label.
  const validAddress=/^(?:서울특별시|서울시|서울)\s+[^\s]+구\s+.+(?:로|길)\s*\d+(?:[-–]\d+)?/u.test(incomingAddress);
  return {
    name,type:tidy(raw.type||'장소',30),
    address:trusted?.address|| (validAddress?incomingAddress:''), phone:verifiedPhone(trusted?.phone||raw.phone),
    website:verifiedWeb(trusted?.website||raw.website),
    source:tidy(trusted?.source||raw.source||'© OpenStreetMap 기여자',140),
    note:tidy(raw.note,250),
    lng:Number.isFinite(lon)&&lon>=125&&lon<=128?lon:null,
    lat:Number.isFinite(lat)&&lat>=36&&lat<=39?lat:null
  };
}
/** Stable non-AI fallback, displayed when the Workers AI binding is absent.
 * Explicitly avoids claiming named-site-specific opening hours or services.
 */
export function facilityFallbackDescription(name,type){
  const subject=String(name||'해당 시설').trim();
  const value=`${subject} ${type||''}`;
  const guidance=[
    [/우체국|우편취급/, '우편물 접수·발송 관련 시설입니다. 등기·택배 업무와 접수 마감시간은 공식 안내를 확인하세요.'],
    [/도서관/, '독서와 자료 이용을 위한 시설입니다. 대출 가능 여부, 휴관일과 프로그램은 해당 도서관의 안내에서 확인하세요.'],
    [/노들섬|문화공간|공연장|전시장/, '공연·전시와 휴식을 즐길 수 있는 문화공간입니다. 방문 예정인 행사와 실내시설 운영 여부는 공식 홈페이지의 일정·공지에서 확인하세요.'],
    [/초등학교|중학교|고등학교|유치원|어린이집/, '학생·어린이 교육 또는 돌봄 시설입니다. 등·하교 시간 주변을 지날 때 어린이 보행을 살피고, 방문 절차는 기관에 확인하세요.'],
    [/경로당|노인정|노인복지|복지관/, '지역 주민의 복지·교류를 위한 시설입니다. 이용 대상과 프로그램 운영 여부를 기관에 확인하세요.'],
    [/병원|의원|보건소/, '의료·건강 관련 서비스를 이용하는 시설입니다. 진료 과목과 접수·예약 여부를 방문 전에 확인하세요.'],
    [/약국/, '의약품 구매와 처방 조제 관련 시설입니다. 필요한 의약품 취급 여부 및 영업시간을 사전에 확인하세요.'],
    [/주민센터|행정복지센터|동사무소|구청/, '행정민원과 생활지원 관련 업무를 안내하는 기관입니다. 방문 전 담당 창구와 필요 서류를 확인하세요.'],
    [/대학교|대학/, '교육·연구 시설입니다. 방문할 학과 또는 건물 위치와 출입 절차를 캠퍼스 안내에서 확인하세요.'],
    [/공원|녹지|놀이터/, '산책·휴식 또는 놀이 공간입니다. 출입구와 이용시설은 현장 안내를 통해 확인하세요.'],
    [/경찰|지구대|파출소|치안센터/, '주민 치안 관련 시설입니다. 긴급 상황은 112에 신고하고 일반 민원은 관할 기관의 안내를 확인하세요.'],
    [/소방서|119안전센터/, '소방·구조·응급 관련 시설입니다. 긴급 상황은 119에 신고하고 일반 방문 사항은 기관에 문의하세요.'],
    [/횡단보도|횡단/, '도로 횡단 지점입니다. 신호와 접근하는 차량을 확인하고 보행자 주의사항을 지켜 이용하세요.'],
  ];
  const found=guidance.find(([pattern])=>pattern.test(value));
  return `${subject}: ${found?.[1]||'등록된 유형을 기준으로 안내하는 장소입니다. 이용 방법과 운영시간은 해당 시설의 공식 안내에서 확인하세요.'}`;
}
function text(tag,content,cls){const el=document.createElement(tag);el.textContent=content;if(cls)el.className=cls;return el;}
function row(parent,label,value){
  const wrap=document.createElement('div');wrap.className='dj-place-row';
  wrap.append(text('span',label),text('strong',value||'등록된 정보 없음'));
  parent.append(wrap);return wrap;
}
const mem=new Map();
const aiMemo=new Map();
function cacheKey(p){return `${p.name}|${p.lat?.toFixed(4)}|${p.lng?.toFixed(4)}`;}
const EARTH_METERS=111000;
export function matchingOsmContact(elements=[],p){
  const candidates=[];
  for(const el of elements){
    const tag=el.tags||{};
    const n=tidy(tag['name:ko']||tag.name,90);
    if(n.replace(/\s+/g,'')!==p.name.replace(/\s+/g,''))continue;
    const lng=Number(el.center?.lon??el.lon),lat=Number(el.center?.lat??el.lat);
    if(!Number.isFinite(lng)||!Number.isFinite(lat))continue;
    const distance=Math.hypot((lng-p.lng)*EARTH_METERS*Math.cos(p.lat*Math.PI/180),(lat-p.lat)*EARTH_METERS);
    if(distance>180)continue;
    candidates.push({tag,distance});
  }
  candidates.sort((a,b)=>a.distance-b.distance);
  const tags=candidates[0]?.tag;
  if(!tags)return {};
  const phone=verifiedPhone(tags['contact:phone']||tags.phone||'');
  const website=verifiedWeb(tags['contact:website']||tags.website||'');
  const street=tidy(tags['addr:street']||'',100),number=tidy(tags['addr:housenumber']||'',20);
  const district=tidy(tags['addr:city']||'',80);
  const address=tidy(tags['addr:full']||tags['addr:place']||[district,street,number].filter(Boolean).join(' '),220);
  return {phone,website,address};
}
async function enrich(p,signal){
  if(p.lat==null||p.lng==null)return {};
  const id=cacheKey(p);
  if(mem.has(id))return mem.get(id);
  const safe=p.name.replace(/["\\]/g,'').slice(0,80);
  if(!safe||!/[가-힣]/.test(safe))return {};
  const q=`[out:json][timeout:6];(nwr["name"="${safe}"](around:180,${p.lat},${p.lng});nwr["name:ko"="${safe}"](around:180,${p.lat},${p.lng}););out center tags 12;`;
  for(const host of ['https://overpass.kumi.systems/api/interpreter','https://overpass-api.de/api/interpreter']){
    if(signal?.aborted)break;
    try{
      const child=new AbortController();
      const abort=()=>child.abort();
      signal?.addEventListener('abort',abort,{once:true});
      const timeout=setTimeout(abort,4500);
      try{
        const result=await fetch(`${host}?data=${encodeURIComponent(q)}`,{signal:child.signal});
        if(!result.ok)continue;
        const answer=matchingOsmContact((await result.json()).elements||[],p);
        mem.set(id,answer);return answer;
      }finally{clearTimeout(timeout);signal?.removeEventListener('abort',abort);}
    }catch{ /* Data may be incomplete or the external service may be offline. */ }
  }
  throw new Error('Facility details service unavailable');
}
/** Call only after an explicit place click. */
export function openPlaceDetails({map,maplibregl,place,lngLat}={}){
  if(!map||!maplibregl?.Popup)return null;
  // Facility overlays have their own click handlers; HTML markers may stop
  // propagation before MapLibre's generic click handler. Route-picking wins:
  // send a route candidate and never open the facility details popup or move
  // the camera into the facility zoom level.
  if(document.getElementById('app')?.classList.contains('route-picking')){
    const lng=Number(place?.lng??lngLat?.lng),lat=Number(place?.lat??lngLat?.lat);
    if(Number.isFinite(lng)&&Number.isFinite(lat)){
      window.dispatchEvent(new CustomEvent('dongjak:route-map-place',{
        detail:{name:String(place?.name||'선택한 장소').slice(0,90),lng,lat}
      }));
    }
    return null;
  }
  const p=placeData({...place,lng:place?.lng??lngLat?.lng,lat:place?.lat??lngLat?.lat});
  if(p.lat==null||p.lng==null)return null;
  const root=document.createElement('section');root.className='dj-place-detail';
  const sharedSheet=true;
  let popup=null;

  // One real header is used at every width. On phones its top 24px is a
  // dedicated drag-to-dismiss edge; controls below it remain ordinary buttons.
  const header=document.createElement('header');header.className='dj-place-header dj-place-desktop-header';
  const edge=text('span','','dj-place-edge-drag');edge.setAttribute('aria-hidden','true');
  const titleGroup=document.createElement('div');titleGroup.className='dj-place-header-title';
  const kicker=text('span',/보건소$/.test(p.name)?'보건소':p.type,'dj-place-kicker');
  const title=text('h3',p.name);
  titleGroup.append(kicker,title);
  const headerActions=document.createElement('div');headerActions.className='dj-place-header-actions';
  header.append(edge,titleGroup,headerActions);
  root.append(header);
  const body=document.createElement('div');body.className='dj-place-body';root.append(body);

  const infoCard=document.createElement('section');infoCard.className='dj-place-info-card';
  const meta=document.createElement('div');meta.className='dj-place-meta';infoCard.append(meta);body.append(infoCard);
  const addressRow=row(meta,'도로명 주소',p.address||'주소 확인 중…');
  const phoneRow=row(meta,'전화번호',p.phone||'전화번호 확인 중…');
  const siteRow=row(meta,'홈페이지','홈페이지 확인 중…');
  function displayWebsite(){
    if(!p.website)return;
    const value=siteRow.querySelector('strong')||siteRow.querySelector('a');
    if(!value)return;
    const link=document.createElement('a');link.href=p.website;link.target='_blank';link.rel='noopener noreferrer';
    const hostname=new URL(p.website).hostname.replace(/^www\./,'');
    link.textContent=`홈페이지 열기 (${hostname})`;value.replaceWith(link);
  }
  displayWebsite();
  if(p.note)infoCard.append(text('p',p.note,'dj-place-note'));

  const routeActions=document.createElement('div');routeActions.className='dj-place-route-actions';
  for(const [which,label] of [['start','출발'],['end','도착']]){
    const button=document.createElement('button');button.type='button';button.className=`dj-place-route-button dj-place-route-${which}`;
    button.textContent=label;
    button.setAttribute('aria-label',which==='start'?'여기서 출발':'여기로 도착');
    button.title=which==='start'?'여기서 출발':'여기로 도착';
    button.addEventListener('click',()=>{
      window.dispatchEvent(new CustomEvent('dongjak:route-select',{detail:{which,place:{name:p.name,lng:p.lng,lat:p.lat}}}));
      popup?.remove();
    });
    routeActions.append(button);
  }
  headerActions.append(routeActions);

  // Browser-local saves; desktop reveals folder selection only after saving.
  const personalActions=document.createElement('div');personalActions.className='dj815-place-actions';
  const folderSection=document.createElement('section');folderSection.className='dj-place-favorites-section';
  const folderHeading=text('strong','즐겨찾기 설정','dj-place-section-heading');
  const folderWrap=document.createElement('label');folderWrap.className='dj815-place-folder';
  folderWrap.append(text('span','저장 폴더','dj-place-folder-label'));
  const folderSelect=document.createElement('select');
  for(const name of getPlaceFolders()){const option=document.createElement('option');option.value=name;option.textContent=name;folderSelect.append(option);}
  folderSelect.value=savedPlaces().find(item=>placeKey(item)===placeKey(p))?.folder||'즐겨찾기';
  folderWrap.append(folderSelect);folderWrap.hidden=!isPlaceSaved(p);
  folderSection.append(folderHeading,folderWrap);folderSection.hidden=folderWrap.hidden;body.append(folderSection);

  const saveButton=document.createElement('button');saveButton.type='button';saveButton.className='dj854-place-favorite';
  saveButton.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/></svg>';
  const syncFavorite=({saved=isPlaceSaved(p),error=false}={})=>{
    saveButton.setAttribute('aria-pressed',String(Boolean(saved)));
    folderWrap.hidden=!saved;folderSection.hidden=!saved;
    const label=error?'저장 공간을 확인해 주세요.':saved?'즐겨찾기 해제':'즐겨찾기 추가';
    saveButton.setAttribute('aria-label',label);saveButton.title=label;
    saveButton.dataset.error=error?'true':'false';
  };
  syncFavorite();
  saveButton.addEventListener('click',()=>{
    const result=toggleSavedPlace(p);
    if(result.ok){syncFavorite({saved:result.saved});}
    else syncFavorite({saved:isPlaceSaved(p),error:true});
  });
  const shareButton=document.createElement('button');shareButton.type='button';shareButton.className='dj856-place-share';
  shareButton.setAttribute('aria-label','장소 공유');shareButton.title='장소 공유';
  shareButton.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.7 10.7 6.6-4.4m-6.6 7.4 6.6 4.4"/></svg>';
  shareButton.addEventListener('click',()=>{void shareMapUrl(placeShareUrl(p),`${p.name} · 동작지도`);});
  personalActions.append(saveButton,shareButton);
  headerActions.append(personalActions);

  const closeButton=document.createElement('button');closeButton.type='button';closeButton.className='dj-place-header-close';
  closeButton.setAttribute('aria-label','시설 정보 닫기');closeButton.title='닫기';
  closeButton.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M7 7l10 10M17 7 7 17"/></svg>';
  const disposeCloseInput=bindReliablePopupClose(closeButton,()=>{
    markAiSurfaceDismissal();
    document.dispatchEvent(new CustomEvent('dongjak:facility-dismiss-start'));
    const element=popup?.getElement?.();
    const motion=element?.querySelector?.('.maplibregl-popup-content');
    if(element?.dataset.dj912ImmediateDismiss==='true'||!sharedSheet||!motion||window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches){popup?.remove();return;}
    if(element.dataset.dj870Closing==='true')return;
    element.dataset.dj870Closing='true';element.style.pointerEvents='none';
    let closed=false,closeWatchdog=0;
    const finish=()=>{if(closed)return;closed=true;window.clearTimeout(closeWatchdog);popup?.remove();};
    // Native cleanup must run even if another surface cancels the motion.
    closeWatchdog=window.setTimeout(finish,1000);
    if(window.DongjakWindowMotion){window.DongjakWindowMotion.close(motion,finish);return;}
    finish();
  });
  headerActions.append(closeButton);
  // Dispose the tap fallback with the native MapLibre popup lifecycle.

  folderSelect.addEventListener('change',()=>{
    if(!isPlaceSaved(p))return;
    setSavedPlaceFolder(p,folderSelect.value);
  });
  recordRecentPlace(p);
  const reviewController=installPlaceReviews(body,p);
  const aiSection=document.createElement('section');aiSection.className='dj-place-ai-section';body.append(aiSection);
  aiSection.append(text('strong','AI 시설 안내','dj-place-ai-heading'));
  const fallbackDescription=facilityFallbackDescription(p.name,p.type);
  const feedback=text('div',fallbackDescription,'dj-place-ai-response');
  feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');aiSection.append(feedback);
  const actions=document.createElement('div');actions.className='dj-place-actions';aiSection.append(actions);
  const retry=document.createElement('button');retry.type='button';retry.className='dj-place-action dj-place-ai';
  retry.textContent='AI 설명 다시 시도';retry.hidden=true;actions.append(retry);
  aiSection.append(text('small','확인된 공개정보를 중심으로 설명합니다. 실제 운영·접근성·현장 안전 수준은 별도 확인이 필요합니다.','dj-place-ai-disclaimer'));
  const aiEndpoint=String(import.meta.env?.VITE_PLACE_AI_API_URL||'/api/place-insight');
  const controllerAI=new AbortController();
  popup=new maplibregl.Popup({offset:22,maxWidth:'min(520px, calc(100vw - 24px))',closeButton:false,anchor:'top',className:'dj-place-detail-popup'})
    .setLngLat([p.lng,p.lat]).setDOMContent(root).addTo(map);
  popup.on('close',disposeCloseInput);
  // The sheet does not exist before addTo(). Measuring it beforehand placed
  // the pin beneath a tall iPhone card. One post-layout camera move only.
  const focusSelectedPlace=()=>{
    if(!popup?.getElement?.()?.isConnected)return;
    try{
      const isPhone=window.matchMedia?.('(max-width:699px)')?.matches===true;
      const offsetY=isPhone?usableMapSelectionOffset({map,panel:popup.getElement(),doc:document,win:window}):0;
      map.easeTo?.({center:[p.lng,p.lat],zoom:Math.max(15.4,map.getZoom?.()||0),
        offset:[0,offsetY],duration:380});
    }catch(error){console.info('[시설 가시영역 중심 이동]',error?.message);}
  };
  if(typeof window.requestAnimationFrame==='function')window.requestAnimationFrame(focusSelectedPlace);
  else focusSelectedPlace();

  // Shared mobile-first detail sheet: the non-interactive part of the header is the gesture
  // surface at every viewport. Swipe up to expand; down to collapse or dismiss. Actions retain
  // ordinary click semantics. The map anchor never changes.
  if(sharedSheet){
    const popupElement=popup.getElement?.();
    // Shared coordinator animates only the inner content; old parent fades compete with it.
    if(window.matchMedia?.('(max-width:699px)')?.matches&&popupElement){popupElement.style.setProperty('animation','none','important');popupElement.style.setProperty('transition','none','important');popupElement.style.setProperty('opacity','1','important');}
    const INTERACTIVE='button,a,input,textarea,select,label,summary,[role="button"]';
    let gesture=null;
    const reset=()=>clearMobileSheetDrag(popupElement);
    const down=event=>{
      if(!popupElement||popupElement.dataset.dj870Closing==='true'||gesture||event.isPrimary===false)return;
      if(event.button!==undefined&&event.button!==0)return;
      if(event.target?.closest?.(INTERACTIVE))return;
      window.DongjakWindowMotion?.cancel(popupElement.querySelector('.maplibregl-popup-content'));
      interruptMobileSheetMotion(popupElement);
      gesture={id:event.pointerId,x:event.clientX,y:event.clientY,lastY:event.clientY,lastTime:performance.now(),velocity:0,delta:0,active:false,upLimit:Math.max(0,popupElement.getBoundingClientRect().top-16)};
      if(typeof event.pointerId==='number')try{header.setPointerCapture?.(event.pointerId);}catch{}
      event.stopPropagation();return true;
    };
    const move=event=>{
      if(!gesture||gesture.id!==event.pointerId)return;
      const now=performance.now();gesture.velocity=(event.clientY-gesture.lastY)/Math.max(1,now-gesture.lastTime);
      gesture.lastY=event.clientY;gesture.lastTime=now;gesture.delta=event.clientY-gesture.y;
      if(!gesture.active){if(Math.abs(gesture.delta)<7)return;if(Math.abs(event.clientX-gesture.x)>Math.abs(gesture.delta)){gesture=null;reset();return;}gesture.active=true;}
      popupElement.classList.add('dj-sheet-dragging');
      const offset=sheetDragOffset(gesture.delta,gesture.upLimit);
      popupElement.style.setProperty('--dj-sheet-drag-y',`${offset}px`);
      popupElement.style.setProperty('translate',`0 ${offset}px`,'important');
      popupElement.style.setProperty('transition','none','important');
      popupElement.style.setProperty('--dj-sheet-drag-opacity','1');
      if(event.cancelable)event.preventDefault();event.stopPropagation();
    };
    const finish=event=>{
      if(!gesture||gesture.id!==event.pointerId)return;
      const {delta,velocity,active}=gesture;gesture=null;
      if(!active){reset();return;}
      const action=sheetStageAction(delta,velocity,popupElement.classList.contains('dj871-sheet-expanded'));
      if(action==='expand'){setMobileSheetExpanded(popupElement,true,document,window);}
      else if(action==='collapse'){
        setMobileSheetExpanded(popupElement,false,document,window);
      }else if(action==='dismiss'&&popupElement){
        markAiSurfaceDismissal();
        document.dispatchEvent(new CustomEvent('dongjak:facility-dismiss-start'));
        popupElement.style.setProperty('--dj-sheet-drag-y',`${delta}px`);
        dismissMobileSheet(popupElement,document,window,()=>popup?.remove());
      }else settleMobileSheetDrag(popupElement,window);
      event.stopPropagation();
    };
    const disposeDrag=bindHeaderDragInput(header,window,{down,move,up:finish,cancel:()=>{gesture=null;settleMobileSheetDrag(popupElement,window);}});
    popup.on('close',disposeDrag);
  }
  // The same header drag and edge-dismiss behavior is used on every viewport.
  if(!sharedSheet)enableAnchoredPopupDragging(popup,titleGroup);
  // Ephemeral selection pin: same verified POI coordinate, not an invented location.
  const pin=createSelectedLocationPin(document);pin.setAttribute('aria-hidden','true');
  // Keep the selected pin offset consistent with the shared detail sheet.
  const mobilePin=true;
  const marker=new maplibregl.Marker({element:pin,anchor:'bottom',offset:[0,mobilePin?-15:-4]})
    .setLngLat([p.lng,p.lat]).addTo(map);
  popup.on('close',()=>{reviewController?.close();});
  popup.on('close',()=>{controllerAI.abort();marker.remove();});
  const cachedInfo=mem.get(cacheKey(p));
  let enriched=Promise.resolve();
  if(!p.phone||!p.address||!p.website){
    const controller=new AbortController();
    const delayNotice=window.setTimeout(()=>{
      if(controller.signal.aborted)return;
      if(!p.address)addressRow.querySelector('strong').textContent='주소 조회 지연 · 외부 지도에서 확인';
      if(!p.phone)phoneRow.querySelector('strong').textContent='전화번호 조회 지연';
      if(!p.website)siteRow.querySelector('strong').textContent='홈페이지 조회 지연';
    },3200);
    popup.on('close',()=>{controller.abort();window.clearTimeout(delayNotice);});
    enriched=enrich(p,controller.signal).then(found=>{
      if(controller.signal.aborted||controllerAI.signal.aborted)return;
      if(!p.phone&&found.phone){p.phone=found.phone;phoneRow.querySelector('strong').textContent=p.phone;}
      if(!p.address&&facilityRoadAddress(found)){
        p.address=facilityRoadAddress(found);
        addressRow.querySelector('strong').textContent=p.address;
      }
      if(!p.website&&found.website){p.website=found.website;displayWebsite();}
      if(!p.address)addressRow.querySelector('strong').textContent='등록된 주소 없음 · 현장 확인 필요';
      if(!p.phone)phoneRow.querySelector('strong').textContent='등록된 전화번호 없음';
      if(!p.website)siteRow.querySelector('strong').textContent='등록된 홈페이지 없음';
    }).catch(()=>{
      if(controller.signal.aborted)return;
      if(!p.address)addressRow.querySelector('strong').textContent='주소 조회 불가';
      if(!p.phone)phoneRow.querySelector('strong').textContent='전화번호 조회 불가';
      if(!p.website)siteRow.querySelector('strong').textContent='홈페이지 조회 불가';
    }).finally(()=>window.clearTimeout(delayNotice));
  }
  let pending=false;
  async function loadExplanation(){
    if(controllerAI.signal.aborted||pending)return;
    pending=true;retry.hidden=true;feedback.textContent=fallbackDescription+'\n\nAI 추가 안내를 확인하는 중입니다…';
    try{
      // Give fast, verified OSM enrichment a chance, but never delay the popup
      // behind a potentially unavailable third-party Overpass endpoint.
      await Promise.race([enriched,new Promise(resolve=>setTimeout(resolve,cachedInfo?0:800))]);
      if(controllerAI.signal.aborted)return;
      const memoKey=cacheKey(p);
      if(aiMemo.has(memoKey)){feedback.textContent=aiMemo.get(memoKey);return;}
      const res=await fetch(aiEndpoint,{method:'POST',headers:{'content-type':'application/json'},
        body:JSON.stringify(p),signal:controllerAI.signal});
      const data=await res.json().catch(()=>({}));
      if(!res.ok)throw new Error([data.message||'AI 안내를 생성하지 못했습니다.',data.code?`(오류 코드: ${data.code})`:''].filter(Boolean).join(' '));
      feedback.textContent=data.text||'AI 설명 내용이 없습니다.';
      if(data.text){if(aiMemo.size>180)aiMemo.delete(aiMemo.keys().next().value);aiMemo.set(memoKey,data.text);}
    }catch(err){if(!controllerAI.signal.aborted){feedback.textContent=fallbackDescription+'\n\nAI 추가 안내는 현재 이용할 수 없습니다.';retry.hidden=false;}}
    finally{pending=false;}
  }
  retry.addEventListener('click',loadExplanation);
  // No mandatory user action: generate once immediately on place selection.
  void loadExplanation();
  return popup;
}
