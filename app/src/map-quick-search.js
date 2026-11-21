/** Map-only search. Queries remote Photon only after explicit form submission. */
import {searchPlaces,searchLocalPlaces} from './route-search.js';
import {searchCachedTransportPlaces} from './transport-map.js';
import {VERIFIED_STATIONS} from './fixed-rail-data.js';
import {queryOfficialPlaces} from './seoul-official-facilities.js';
import {searchNamedOsm} from './v875-osm-name-search.js';
import {normalizeKoreanSearch, koreanSearchScore, rankKoreanSearch} from './korean-search.js';

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
    const key=`${String(item.name||'').replace(/역$/,'').trim()}/${lng.toFixed(4)}/${lat.toFixed(4)}`;
    if(seen.has(key))continue;
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
  dropdownHead?.after(filters);

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
  const fitDropdown=()=>{
    if(dropdown.hidden)return;
    const viewport=window.visualViewport;
    const visibleBottom=viewport?viewport.offsetTop+viewport.height:window.innerHeight;
    const anchor=shell.getBoundingClientRect();
    const top=Math.ceil(anchor.bottom+7);
    // Search suggestions follow the visible pill (not the full phone width).
    // The adjacent AI orb remains visible and does not overlap the results.
    const left=Math.max(10,Math.floor(anchor.left));
    const width=Math.max(140,Math.min(Math.floor(anchor.width),Math.floor(window.innerWidth-left-10)));
    dropdown.style.setProperty('--dj871-search-left',left+'px');
    dropdown.style.setProperty('--dj871-search-width',width+'px');
    const available=Math.max(90,Math.floor(visibleBottom-top-12));
    shell.style.setProperty('--dj-search-results-max',`${Math.max(92,Math.min(520,available))}px`);
    dropdown.style.setProperty('--dj871-search-top',`${top}px`);
    dropdown.style.setProperty('--dj871-search-max',`${Math.min(520,available)}px`);
  };
  const close=()=>{
    seq++;controller?.abort();controller=null;
    delete app.dataset.searchOpen;
    syncClear();
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
    const info=document.createElement('small');info.textContent=[place.category||place.kind,place.address].filter(Boolean).join(' · ');
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
      for(const name of DEFAULT_MAP_SEARCH_TERMS){
        const btn=document.createElement('button');btn.type='button';btn.className='map-quick-search-suggestion';
        btn.textContent=name;
        btn.addEventListener('click',()=>{
          query.value=name;query.dispatchEvent(new Event('input',{bubbles:true}));
          form.classList.add('dj807-has-input');
          void performSearch(name);
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
  const localVectorFacilities=(text)=>{
    // MapLibre loaded vector tiles already carry general OSM POIs. No fictitious records.
    const key=normalizeKoreanSearch(text);
    if(key.length<2||typeof map.querySourceFeatures!=='function')return [];
    const result=[];const visited=new Set();
    const sources=new Set((map.getStyle?.()?.layers||[]).filter(l=>l['source-layer']==='poi'&&l.source).map(l=>l.source));
    for(const source of sources){
      let features=[];try{features=map.querySourceFeatures(source,{sourceLayer:'poi'})||[];}catch{continue;}
      for(const f of features){
        const p=f.properties||{};const name=String(p['name:ko']||p.name||'').trim();
        const kind=String(p.class||p.subclass||'').trim();
        if(!name||Math.max(koreanSearchScore(text,name),koreanSearchScore(text,kind))<55)continue;
        if(f.geometry?.type!=='Point')continue;
        const [lng,lat]=f.geometry.coordinates||[];
        if(!Number.isFinite(lng)||!Number.isFinite(lat))continue;
        const id=`${name}-${lng.toFixed(5)}-${lat.toFixed(5)}`;if(visited.has(id))continue;visited.add(id);
        result.push({name,lng,lat,category:kind||'일반 시설',address:'지도에 등록된 OpenStreetMap 시설 · 운영 여부 미확인',source:'loaded-map-poi'});
        if(result.length>=20)return result;
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
    filters.hidden=term.length>0;
    controller?.abort();controller=null;const active=++seq;
    if(term.length<2){show();render([],true);feedback.textContent='추천 장소 또는 역명을 선택하세요.';return;}
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
    void performSearch(term);
    // Submitting is an explicit commitment to search; dismiss the mobile
    // keyboard so the result panel can use the full available viewport.
    query.blur();
  };
  form.addEventListener('submit',event=>{event.preventDefault();submitSearch();});
  // Some mobile PWA shells intercept native form submissions. Explicit button
  // activation must still execute the same search, exactly once.
  searchButton?.addEventListener('click',event=>{event.preventDefault();submitSearch();});
  const phoneSearch=()=>window.matchMedia?.('(max-width:699px)')?.matches===true;
  query.addEventListener('focus',()=>{
    const term=query.value.trim();filters.hidden=term.length>0;
    // On phone, focusing an empty field must not create a large blank dropdown.
    if(phoneSearch()&&term.length<2){close();return;}
    show();
    if(term.length<2){render([],true);feedback.textContent='추천 장소 또는 역명을 선택하세요.';}
    else {const matches=viewResults(mergeMapSearchResults(localResults(term)));render(matches.length?matches:[]);feedback.textContent=matches.length?'동작구 장소·교통시설 자동완성':'Enter 또는 검색 버튼으로 전체 장소 검색';}
  });
  query.addEventListener('input',()=>{
    seq++;controller?.abort();controller=null;
    const term=normalizeKoreanSearch(query.value);filters.hidden=term.length>0;
    // Suggestions appear once a query is meaningful, not on input focus alone.
    if(phoneSearch()&&term.length<2){close();return;}
    show();
    if(term.length<2){render([],true);feedback.textContent='추천 장소';return;}
    const matches=viewResults(mergeMapSearchResults(localResults(query.value)));render(matches);
    feedback.textContent=matches.length?`장소 추천 ${matches.length}건 · 더 찾으려면 검색`:'검색을 누르면 장소·주소를 조회합니다.';
  });
  clearButton.addEventListener('pointerdown',e=>e.preventDefault());
  clearButton.addEventListener('click',()=>{query.value='';query.focus();query.dispatchEvent(new Event('input',{bubbles:true}));});
  closeBtn?.addEventListener('click',()=>{close();query.blur();query.value='';form.classList.remove('dj807-has-input');syncClear();});
  document.addEventListener('pointerdown',event=>{if(!shell.contains(event.target)&&!dropdown.contains(event.target))close();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape')close();});
  return {close,search:performSearch};
}
