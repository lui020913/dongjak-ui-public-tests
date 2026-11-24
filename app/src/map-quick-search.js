/** Map-only search. Queries remote Photon only after explicit form submission. */
import {searchPlaces,searchLocalPlaces} from './route-search.js';
import {searchCachedTransportPlaces} from './transport-map.js';
import {searchTransportSnapshot} from './transport-map.js';
import {VERIFIED_STATIONS} from './fixed-rail-data.js';
import {queryOfficialPlaces} from './seoul-official-facilities.js';
import {officialSearchSnapshot} from './seoul-official-facilities.js';
import {nearbySearchResults,searchResultSubtitle,searchResultKey,fetchNearbyOfficialPlaces} from './map-search-refinement.js';
import {searchNamedOsm} from './v875-osm-name-search.js';
import {normalizeKoreanSearch, koreanSearchScore, rankKoreanSearch} from './korean-search.js';
import {recentPlaces,recentSearchQueries,recordSearchQuery} from './v815-place-store.js';

export const FRIENDLY_SEARCH_PLACEHOLDERS=Object.freeze([
  '어디로 가시나요?',
  '우리 동네 장소를 찾아보세요',
  '가까운 역이나 정류장을 찾아보세요',
  '공원과 산책길을 검색해보세요',
  '동작구의 숨은 장소를 찾아보세요',
  '목적지가 어디인가요?'
]);
export const DEFAULT_MAP_SEARCH_TERMS=Object.freeze(['노량진역','중앙대학교','보라매공원','동작구청','숭실대입구역']);
export function isTransitMapSearchResult(item){
  const kind=String(item?.kind||item?.type||'').toLowerCase();
  const category=String(item?.category||'');
  return kind==='bus'||kind==='subway'||/버스정류장|지하철|철도역|대중교통/.test(category);
}
export function mergeMapSearchResults(local=[],remote=[]){
  const found=[],seen=new Set();
  for(const item of [...local,...remote]){
    const lng=Number(item?.lng),lat=Number(item?.lat);
    if(!Number.isFinite(lng)||!Number.isFinite(lat))continue;
    const key=searchResultKey({...item,lng,lat});
    if(seen.has(key)){
      const previous=found.find(p=>searchResultKey(p)===key);
      if(previous){previous.direction||=item.direction;previous.address||=item.address;previous.lines=[...new Set([...(previous.lines||[]),...(item.lines||[])])];}
      continue;
    }
    seen.add(key);found.push({...item,lng,lat});
  }
  // Reserve room for both columns so a dense OSM POI result does not push
  // every nearby station/stop out of the visible result set.
  const transit=found.filter(isTransitMapSearchResult),general=found.filter(item=>!isTransitMapSearchResult(item));
  if(!transit.length||!general.length)return found.slice(0,12);
  const balanced=[...transit.slice(0,6),...general.slice(0,6)];
  const chosen=new Set(balanced);
  for(const item of found){if(balanced.length>=12)break;if(!chosen.has(item)){balanced.push(item);chosen.add(item);}}
  return balanced;
}
export function initMapQuickSearch({map,maplibregl,app,onPick=()=>{}}){
  const shell=document.getElementById('map-quick-search');
  if(!shell)return {close:()=>{}};
  const form=shell.querySelector('form'),query=shell.querySelector('input');
  const list=shell.querySelector('#map-quick-search-results');
  const feedback=shell.querySelector('#map-quick-search-status');
  const dropdown=shell.querySelector('.map-quick-search-dropdown');
  const closeBtn=shell.querySelector('#map-quick-search-close');
  const searchButton=form?.querySelector('.map-quick-search-submit');
  const clearButton=document.createElement('button');clearButton.type='button';clearButton.id='dj-search-clear';clearButton.hidden=true;
  clearButton.setAttribute('aria-label','검색어 지우기');clearButton.textContent='×';query.after(clearButton);
  const syncClear=()=>{clearButton.hidden=!query.value||app.dataset.searchOpen!=='true';};
  // Additional discovery controls stay within the existing anchored dropdown.
  const filters=document.createElement('div');filters.className='dj815-search-filters';
  const filtersText=document.createElement('span');filtersText.textContent='빠른 검색';filters.append(filtersText);
  for(const name of ['대학교','공원','도서관','지하철역','약국','병원','마트','음식점','카페','편의점']){
    const action=document.createElement('button');action.type='button';action.textContent=name;
    action.addEventListener('click',()=>{query.value=name;query.dispatchEvent(new Event('input',{bubbles:true}));void performSearch(name);});
    filters.append(action);
  }
  // Quick categories are useful before typing; once the user enters a query,
  // collapse them so the result area gets the full width and height.
  filters.setAttribute('aria-label','빠른 장소 검색');
  const dropdownHead=dropdown.querySelector('.map-quick-search-dropdown-head');
  const title=dropdownHead.querySelector('strong');
  const body=document.createElement('div');body.id='dj-search-scroll-body';
  dropdownHead.after(body);body.append(filters,feedback,list);
  const actions=document.createElement('div');actions.id='dj-search-entry-actions';actions.hidden=true;
  const historyButton=document.createElement('button');historyButton.type='button';historyButton.textContent='최근 검색';
  const nearbyButton=document.createElement('button');nearbyButton.type='button';nearbyButton.textContent='내 주변 시설';
  nearbyButton.id='dj-search-nearby';actions.append(nearbyButton,historyButton);app.append(actions);
  const phoneSearch=()=>window.matchMedia?.('(max-width:699px)')?.matches===true;
  const syncEntry=()=>{
    const visible=phoneSearch()&&app.dataset.tab==='map'&&(document.activeElement===query||app.dataset.searchOpen==='true');
    actions.hidden=!visible;
    if(visible){const r=shell.getBoundingClientRect(),ai=document.getElementById('dj890-ai-orb');actions.style.top=Math.ceil(Math.max(r.bottom,ai?.getBoundingClientRect().bottom||0)+7)+'px';}
    if(visible&&phoneSearch())app.dataset.djSearchEntry='1';else delete app.dataset.djSearchEntry;
  };
  const setTitle=value=>{title.textContent=value;};

  // Keep desktop search in its original rail. On phones its dropdown lives
  // at app level, outside the narrow/transformed search field containing block.
  const originalParent=dropdown.parentNode;
  const syncDropdownHost=()=>{
    if(window.matchMedia?.('(max-width:699px)')?.matches){
      if(dropdown.parentNode!==app)app.appendChild(dropdown);
    }else if(dropdown.parentNode!==originalParent){originalParent.appendChild(dropdown);}
  };
  syncDropdownHost();
  window.addEventListener('resize',syncDropdownHost,{passive:true});
  let closeTimer=null;
  let controller=null,seq=0,marker=null;
  let placeholderIndex=Math.floor(Math.random()*FRIENDLY_SEARCH_PLACEHOLDERS.length);
  let placeholderTimer=0;
  const canRotate=()=>!(document.hidden||query.value||document.activeElement===query||app.dataset.djVoiceFeedback==='true');
  const updatePlaceholder=()=>{query.placeholder=app.dataset.djLanguage==='en'?'Where are you going?':FRIENDLY_SEARCH_PLACEHOLDERS[placeholderIndex];placeholderIndex=(placeholderIndex+1)%FRIENDLY_SEARCH_PLACEHOLDERS.length;};
  const cancelPlaceholder=()=>{window.clearTimeout(placeholderTimer);query.classList.remove('dj-placeholder-fading');};
  const setFriendlyPlaceholder=()=>{
    if(!canRotate())return;
    cancelPlaceholder();
    if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){updatePlaceholder();return;}
    query.classList.add('dj-placeholder-fading');
    placeholderTimer=window.setTimeout(()=>{if(canRotate())updatePlaceholder();query.classList.remove('dj-placeholder-fading');},180);
  };
  if(canRotate())updatePlaceholder();
  query.addEventListener('focus',cancelPlaceholder);query.addEventListener('input',cancelPlaceholder);
  window.setInterval(setFriendlyPlaceholder,10_000);
  // Search is a higher-priority overlay while the keyboard is open. Mobile
  // weather and map controls must not cover the suggestions.
  const mobileKeys=['position','top','left','right','width','max-width','max-height','display','flex-direction','overflow','padding','box-sizing'];
  const fitDropdown=()=>{
    syncEntry();
    if(!phoneSearch())for(const key of mobileKeys)dropdown.style.removeProperty(key);
    if(dropdown.hidden||dropdown.classList.contains('dj871-search-leaving'))return;
    const viewport=window.visualViewport;
    const visibleBottom=viewport?viewport.offsetTop+viewport.height:window.innerHeight;
    const anchor=shell.getBoundingClientRect();
    const ai=document.getElementById('dj890-ai-orb');
    const aiBottom=phoneSearch()&&ai?ai.getBoundingClientRect().bottom:0;
    const top=Math.ceil(Math.max(anchor.bottom,aiBottom)+7+(actions.hidden?0:actions.getBoundingClientRect().height+7));
    const left=phoneSearch()?12:Math.max(10,Math.floor(anchor.left));
    const width=phoneSearch()?window.innerWidth-24:Math.max(140,Math.min(Math.floor(anchor.width),Math.floor(window.innerWidth-left-10)));
    dropdown.style.setProperty('--dj871-search-left',left+'px');
    dropdown.style.setProperty('--dj871-search-width',width+'px');
    const available=Math.max(0,Math.floor(visibleBottom-top-12));
    shell.style.setProperty('--dj-search-results-max',`${Math.min(520,available)}px`);
    dropdown.style.setProperty('--dj871-search-top',`${top}px`);
    dropdown.style.setProperty('--dj871-search-max',`${Math.min(520,available)}px`);
    if(phoneSearch())for(const [key,value] of Object.entries({position:'fixed',top:top+'px',left:'12px',right:'12px',width:width+'px','max-width':width+'px','max-height':Math.min(520,available)+'px',display:'flex','flex-direction':'column',overflow:'hidden',padding:'0','box-sizing':'border-box'}))dropdown.style.setProperty(key,value,'important');
  };
  const close=()=>{
    seq++;controller?.abort();controller=null;
    delete app.dataset.searchOpen;delete dropdown.dataset.searchMode;
    dropdown.style.removeProperty('display');
    syncClear();syncEntry();
    shell.style.removeProperty('--dj-search-results-max');
    if(closeTimer){window.clearTimeout(closeTimer);closeTimer=null;}
    if(dropdown.hidden)return;
    const mobile=window.matchMedia?.('(max-width:699px)')?.matches;
    const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if(!mobile||reduced){dropdown.hidden=true;dropdown.classList.remove('dj871-search-leaving');return;}
    dropdown.classList.remove('dj871-search-entering');dropdown.classList.add('dj871-search-leaving');
    closeTimer=window.setTimeout(()=>{
      dropdown.hidden=true;dropdown.classList.remove('dj871-search-leaving');closeTimer=null;
    },200);
  };
  const show=()=>{
    if(closeTimer){window.clearTimeout(closeTimer);closeTimer=null;}
    const wasHidden=dropdown.hidden||dropdown.classList.contains('dj871-search-leaving');
    dropdown.classList.remove('dj871-search-leaving');
    if(wasHidden)window.DongjakWindowLifecycle?.requestOpen('map-quick-search-dropdown');
    dropdown.hidden=false;app.dataset.searchOpen='true';syncClear();fitDropdown();
    if(wasHidden){
      dropdown.classList.remove('dj871-search-entering');
      void dropdown.offsetWidth;
      dropdown.classList.add('dj871-search-entering');
    }
  };
  window.visualViewport?.addEventListener('resize',fitDropdown,{passive:true});
  window.visualViewport?.addEventListener('scroll',fitDropdown,{passive:true});
  window.addEventListener('resize',fitDropdown,{passive:true});
  const isTransitResult=isTransitMapSearchResult;
  const makeResultButton=place=>{
    const button=document.createElement('button');button.type='button';button.className='map-quick-search-result';
    const strong=document.createElement('strong');strong.textContent=place.name||'검색 장소';
    const info=document.createElement('small');info.textContent=searchResultSubtitle(place);
    button.append(strong,info);
    button.addEventListener('click',()=>{
      marker?.remove();
      marker=null; // One marker belongs to the canonical place-detail popup.
      map.flyTo({center:[place.lng,place.lat],zoom:16,duration:700});
      close();query.blur();query.value='';form.classList.remove('dj807-has-input');
      window.dispatchEvent(new CustomEvent('dongjak:map-place-selected',{detail:{place}}));
      onPick(place);
    });
    return button;
  };
  const render=(items,showDefaults=false)=>{
    list.replaceChildren();
    if(showDefaults){
      const defaults=document.createElement('div');defaults.className='dj854-search-defaults';
      const previous=recentSearchQueries().filter(q=>!recentPlaces().some(p=>p.name===q));
      if(previous.length){const title=document.createElement('strong');title.className='dj-recent-query-title';title.textContent='최근 검색어';defaults.append(title);}
      for(const name of [...new Set([...previous,...DEFAULT_MAP_SEARCH_TERMS])]){
        const btn=document.createElement('button');btn.type='button';btn.className='map-quick-search-suggestion';
        btn.textContent=name;
        btn.addEventListener('click',()=>{
          query.value=name;query.dispatchEvent(new Event('input',{bubbles:true}));
          form.classList.add('dj807-has-input');
          recordSearchQuery(name);void performSearch(name);
        });
        defaults.append(btn);
      }
      list.append(defaults);
      return;
    }
    const transit=items.filter(isTransitResult);
    const general=items.filter(place=>!isTransitResult(place));
    const columns=document.createElement('div');columns.className='dj854-search-columns';
    for(const [key,label,rows] of [
      ['transit','대중교통 시설',transit],['general','일반 시설',general]
    ]){
      const column=document.createElement('section');column.className=`dj854-search-column dj854-search-column-${key}`;
      const heading=document.createElement('h3');heading.textContent=`${label} · ${rows.length}`;
      const body=document.createElement('div');body.className='dj854-search-column-list';
      if(!rows.length){const empty=document.createElement('p');empty.className='dj854-search-empty';empty.textContent='검색 결과 없음';body.append(empty);}
      else for(const place of rows)body.append(makeResultButton(place));
      column.append(heading,body);columns.append(column);
    }
    list.append(columns);
  };
  const localVectorFacilities=(text,nearby=false)=>{
    // MapLibre loaded vector tiles already carry general OSM POIs. No fictitious records.
    const key=normalizeKoreanSearch(text);
    if((!nearby&&key.length<2)||typeof map.querySourceFeatures!=='function')return [];
    const result=[];const visited=new Set();
    const sources=new Set((map.getStyle?.()?.layers||[]).filter(l=>l['source-layer']==='poi'&&l.source).map(l=>l.source));
    for(const source of sources){
      let features=[];try{features=map.querySourceFeatures(source,{sourceLayer:'poi'})||[];}catch{continue;}
      for(const f of features){
        const p=f.properties||{};const name=String(p['name:ko']||p.name||'').trim();
        const kind=String(p.class||p.subclass||'').trim();
        if(!name||(!nearby&&Math.max(koreanSearchScore(text,name),koreanSearchScore(text,kind))<55))continue;
        if(f.geometry?.type!=='Point')continue;
        const [lng,lat]=f.geometry.coordinates||[];
        if(!Number.isFinite(lng)||!Number.isFinite(lat))continue;
        const id=`${name}-${lng.toFixed(5)}-${lat.toFixed(5)}`;if(visited.has(id))continue;visited.add(id);
        result.push({name,lng,lat,category:kind||'일반 시설',address:'지도에 등록된 OpenStreetMap 시설 · 운영 여부 미확인',source:'loaded-map-poi'});
        if(!nearby&&result.length>=20)return result;
      }
    }
    return result;
  };
  const localResults=(text)=>{
    let cached=[];try{cached=searchCachedTransportPlaces(text)||[];}catch{}
    const keyword=normalizeKoreanSearch(text).replace(/역$/,'');
    const stations=keyword.length>=2?Object.entries(VERIFIED_STATIONS)
      .filter(([name])=>koreanSearchScore(text,name)>=55)
      .slice(0,8).map(([name,[lng,lat]])=>({name:name.endsWith('역')?name:`${name}역`,lng,lat,
        category:'지하철·철도역',address:'저장된 역 위치 · 출입구와 다를 수 있습니다'})):[];
    const all=mergeMapSearchResults([...searchLocalPlaces(text),...localVectorFacilities(text)],[...cached,...stations]);
    return rankKoreanSearch(text,all,{limit:20,minScore:55});
  };
  // Search always covers the Dongjak/Seoul source bounds; the former
  // viewport-only checkbox was confusing and silently hid valid matches.
  const viewResults=items=>items;
  async function performSearch(text){
    const rawTerm=String(text||'').trim();
    const term=normalizeKoreanSearch(rawTerm);
    form.classList.toggle('dj807-has-input',Boolean(term));
    filters.hidden=phoneSearch()||term.length>0;dropdown.dataset.searchMode=term.length>=2?'results':'history';setTitle(term.length>=2?'검색 결과':'최근 검색');
    controller?.abort();controller=null;const active=++seq;
    if(term.length<2){if(phoneSearch()){close();return;}show();render([],true);feedback.textContent='추천 장소 또는 역명을 선택하세요.';return;}
    controller=new AbortController();const signal=controller.signal;
    show();
    const immediate=localResults(term);
    if(immediate.length){
      render(viewResults(immediate));
      feedback.textContent=`저장된 장소·교통시설 ${immediate.length}개 · 추가 검색 중`;
    }else feedback.textContent='장소를 검색하고 있습니다…';
    let remote=[],official=[],err='';
    try{official=await queryOfficialPlaces(term,{signal});}catch(error){if(error.name==='AbortError')return;}
    try{remote=await searchPlaces(term,{signal});}
    catch(error){if(error.name==='AbortError')return;err='외부 장소 검색이 불안정하여 저장된 교통시설만 표시합니다.';}
    let osmNamed=[];
    // Named businesses such as Starbucks are often missing from Photon/Nominatim.
    // Only search real OpenStreetMap names after an EXPLICIT user submission.
    if([...official,...immediate,...remote].length<3){
      try{osmNamed=await searchNamedOsm(rawTerm,{signal});}
      catch(error){if(error?.name==='AbortError')return;}
    }
    if(active!==seq)return;
    const combined=viewResults(mergeMapSearchResults([...official,...immediate,...osmNamed],remote));
    render(combined);
    feedback.textContent=combined.length?`${combined.length}개 결과${err?' · '+err:''}`:(err||'검색 결과가 없습니다. 다른 장소명으로 검색해 주세요.');
  }
  const submitSearch=()=>{
    const term=query.value;
    recordSearchQuery(term);void performSearch(term);
    // Submitting is an explicit commitment to search; dismiss the mobile
    // keyboard so the result panel can use the full available viewport.
    query.blur();
  };
  form.addEventListener('submit',event=>{event.preventDefault();submitSearch();});
  // Some mobile PWA shells intercept native form submissions. Explicit button
  // activation must still execute the same search, exactly once.
  searchButton?.addEventListener('click',event=>{event.preventDefault();submitSearch();});
  const openHistory=()=>{
    query.value='';form.classList.remove('dj807-has-input');query.blur();controller?.abort();controller=null;seq++;
    filters.hidden=true;dropdown.dataset.searchMode='history';setTitle('최근 검색');
    show();render([],true);feedback.textContent='최근 검색어와 장소를 다시 선택할 수 있습니다.';
  };
  const openNearby=()=>{
    query.value='';form.classList.remove('dj807-has-input');query.blur();controller?.abort();controller=null;const active=++seq;
    filters.hidden=true;dropdown.dataset.searchMode='nearby';setTitle('내 주변 시설');show();list.replaceChildren();
    feedback.textContent='현재 위치를 확인하고 있습니다…';
    if(!navigator.geolocation){feedback.textContent='이 기기에서는 위치 정보를 사용할 수 없습니다.';return;}
    navigator.geolocation.getCurrentPosition(async position=>{
      if(active!==seq)return;
      const {longitude:lng,latitude:lat,accuracy}=position.coords;
      if(!Number.isFinite(lng)||!Number.isFinite(lat)||!Number.isFinite(accuracy)||accuracy>200){feedback.textContent='위치 정확도가 낮습니다. 잠시 후 다시 시도해 주세요.';return;}
      const origin={lng,lat};const own=new AbortController();controller=own;
      let external=[],partial=false;const timeout=window.setTimeout(()=>own.abort(),7000);
      try{external=await fetchNearbyOfficialPlaces(origin,{signal:own.signal});}catch(error){if(active!==seq)return;partial=true;}finally{window.clearTimeout(timeout);}
      if(active!==seq)return;
      const stations=Object.entries(VERIFIED_STATIONS).map(([name,[lng,lat]])=>({name:name.endsWith('역')?name:name+'역',lng,lat,kind:'subway',category:'지하철·철도역'}));
      const places=nearbySearchResults(origin,[...searchTransportSnapshot(),...officialSearchSnapshot(),...external,...stations,...localVectorFacilities('',true)]);
      list.replaceChildren();for(const place of places)list.append(makeResultButton(place));
      feedback.textContent=places.length?`현재 위치 반경 500m · ${places.length}곳 · 직선거리 순${partial?' · 일부 자료 미연결':''}`:'반경 500m 내 확인된 시설이 없습니다. 자료 범위 밖이거나 데이터가 부족할 수 있습니다.';
    },()=>{if(active===seq)feedback.textContent='위치 권한 또는 위치 확인에 실패했습니다. 설정에서 권한을 확인해 주세요.';},{enableHighAccuracy:true,timeout:10000,maximumAge:15000});
  };
  for(const button of [nearbyButton,historyButton])button.addEventListener('pointerdown',e=>e.preventDefault());
  nearbyButton.addEventListener('click',openNearby);historyButton.addEventListener('click',openHistory);
  query.addEventListener('blur',()=>window.setTimeout(syncEntry,0));
  const tabWatch=new MutationObserver(()=>{if(app.dataset.tab!=='map')close();syncEntry();});tabWatch.observe(app,{attributes:true,attributeFilter:['data-tab']});
  query.addEventListener('focus',()=>{
    const term=query.value.trim();filters.hidden=phoneSearch()||term.length>0;syncEntry();
    if(phoneSearch()&&term.length<2){close();return;}
    dropdown.dataset.searchMode=term.length>=2?'results':'history';setTitle(term.length>=2?'검색 결과':'최근 검색');show();
    if(term.length<2){render([],true);feedback.textContent='최근 검색어와 장소';}
    else {const matches=viewResults(mergeMapSearchResults(localResults(term)));render(matches);feedback.textContent=matches.length?'동작구 장소·교통시설 자동완성':'Enter 또는 검색 버튼으로 전체 장소 검색';}
  });
  query.addEventListener('input',()=>{
    seq++;controller?.abort();controller=null;
    const term=normalizeKoreanSearch(query.value);filters.hidden=phoneSearch()||term.length>0;
    if(phoneSearch()&&term.length<2){close();return;}
    dropdown.dataset.searchMode=term.length>=2?'results':'history';setTitle(term.length>=2?'검색 결과':'최근 검색');show();
    if(term.length<2){render([],true);feedback.textContent='최근 검색어와 장소';return;}
    const matches=viewResults(mergeMapSearchResults(localResults(query.value)));render(matches);
    feedback.textContent=matches.length?`장소 추천 ${matches.length}건 · 더 찾으려면 검색`:'검색을 누르면 장소·주소를 조회합니다.';
  });
  window.addEventListener('dongjak:recent-places-change',()=>{if(!dropdown.hidden&&dropdown.dataset.searchMode==='history')render([],true);});
  clearButton.addEventListener('pointerdown',e=>e.preventDefault());
  clearButton.addEventListener('click',()=>{query.value='';query.focus();query.dispatchEvent(new Event('input',{bubbles:true}));});
  closeBtn?.addEventListener('click',()=>{close();query.blur();query.value='';form.classList.remove('dj807-has-input');syncClear();});
  document.addEventListener('pointerdown',event=>{if(!shell.contains(event.target)&&!dropdown.contains(event.target)&&!actions.contains(event.target)){close();if(document.activeElement===query)query.blur();syncEntry();}});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'){close();if(document.activeElement===query)query.blur();syncEntry();}});
  return {close,search:performSearch};
}
