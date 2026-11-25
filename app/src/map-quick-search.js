import {normalizeFacilityRecord} from './facility-display-names.js';
/** Map-only search. Queries remote Photon only after explicit form submission. */
import {searchPlaces,searchLocalPlaces} from './route-search.js';
import {searchCachedTransportPlaces} from './transport-map.js';
import {searchTransportSnapshot} from './transport-map.js';
import {VERIFIED_STATIONS} from './fixed-rail-data.js';
import {queryOfficialPlaces} from './seoul-official-facilities.js';
import {officialSearchSnapshot} from './seoul-official-facilities.js';
import {searchResultSubtitle,facilityRoadAddress,searchResultKey,searchPlaceKind,captureVisibleFacilityArea,visibleFacilityResults,groupVisibleFacilities,fetchVisibleOfficialPlaces,nearbySearchResults,fetchNearbyOfficialPlaces,formatFacilityDistance,MIN_VISIBLE_FACILITY_ZOOM} from './map-search-refinement.js';
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
  return searchPlaceKind(item)!=='place'||/대중교통/.test(String(item?.category||''));
}
export function mergeMapSearchResults(local=[],remote=[]){
  const found=[],seen=new Set();
  for(const rawItem of [...local,...remote]){
    const item=normalizeFacilityRecord(rawItem);
    const lng=Number(item?.lng),lat=Number(item?.lat);
    if(!Number.isFinite(lng)||!Number.isFinite(lat))continue;
    const key=searchResultKey({...item,lng,lat});
    if(seen.has(key)){
      const previous=found.find(p=>searchResultKey(p)===key);
      if(previous){previous.direction||=item.direction;previous.address||=item.address;if(!facilityRoadAddress(previous)&&facilityRoadAddress(item))previous.roadAddress=facilityRoadAddress(item);previous.lines=[...new Set([...(previous.lines||[]),...(item.lines||[])])];}
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
export function initMapQuickSearch({map,maplibregl,app,onPick=()=>{},getPosition,errorLocationCode=error=>Number(error?.code)}){
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
  const mapFooter=document.createElement('div');mapFooter.className='dj-search-map-footer';mapFooter.hidden=true;
  const mapView=document.createElement('button');mapView.type='button';mapView.className='dj-search-map-view';mapView.textContent='지도에서 보기';mapFooter.append(mapView);dropdown.append(mapFooter);
  const mapResultsBar=document.createElement('div');mapResultsBar.className='dj-search-map-results-bar';mapResultsBar.hidden=true;
  const mapResultsLabel=document.createElement('strong'),mapResultsClose=document.createElement('button');mapResultsClose.type='button';mapResultsClose.textContent='×';mapResultsClose.setAttribute('aria-label','검색 시설 표시 닫기');mapResultsBar.append(mapResultsLabel,mapResultsClose);app.append(mapResultsBar);
  let selectedMapRows=[],resultMarkers=[];
  const clearMapResults=()=>{for(const marker of resultMarkers)marker.remove();resultMarkers=[];mapResultsBar.hidden=true;};
  mapResultsClose.addEventListener('click',clearMapResults);
  const actions=document.createElement('div');actions.id='dj-search-entry-actions';actions.hidden=true;
  const historyButton=document.createElement('button');historyButton.type='button';historyButton.textContent='최근 검색';
  const nearbyButton=document.createElement('button');nearbyButton.type='button';nearbyButton.textContent='이 지도에서 검색';
  const gpsButton=document.createElement('button');gpsButton.type='button';gpsButton.id='dj-search-gps-nearby';gpsButton.textContent='내 주변 검색';
  nearbyButton.id='dj-search-nearby';actions.append(nearbyButton,gpsButton,historyButton);app.append(actions);
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
  const mobileKeys=['position','top','left','right','width','max-width','max-height','height','display','flex-direction','overflow','padding','box-sizing'];
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
    const nav=document.getElementById('bottom-nav'),navRect=nav?.getBoundingClientRect();
    const fullArea=phoneSearch()&&dropdown.dataset.searchMode==='nearby';
    const navTop=navRect?.height&&navRect.top>top&&navRect.top<=visibleBottom?navRect.top:visibleBottom;
    const available=Math.max(0,Math.floor((fullArea?navTop:visibleBottom)-top-12));
    const panelHeight=fullArea?available:Math.min(520,available);
    shell.style.setProperty('--dj-search-results-max',`${panelHeight}px`);
    dropdown.style.setProperty('--dj871-search-top',`${top}px`);
    dropdown.style.setProperty('--dj871-search-max',`${panelHeight}px`);
    if(fullArea)dropdown.style.setProperty('height',panelHeight+'px','important');else dropdown.style.removeProperty('height');
    if(phoneSearch())for(const [key,value] of Object.entries({position:'fixed',top:top+'px',left:'12px',right:'12px',width:width+'px','max-width':width+'px','max-height':panelHeight+'px',display:'flex','flex-direction':'column',overflow:'hidden',padding:'0','box-sizing':'border-box'}))dropdown.style.setProperty(key,value,'important');
  };
  const close=()=>{
    seq++;controller?.abort();controller=null;
    selectedMapRows=[];mapFooter.hidden=true;
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
    clearMapResults();selectedMapRows=[];mapFooter.hidden=true;
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
    const info=document.createElement('small');info.textContent=searchResultSubtitle({...place,address:'',distanceMeters:undefined});
    const address=document.createElement('small');address.className='dj-search-road-address';
    const road=facilityRoadAddress(place);address.textContent=road||'도로명 주소 미확인';
    button.append(strong,info,address);
    if(Number.isFinite(place.distanceMeters)){
      const distance=document.createElement('span');distance.className='dj-search-distance';distance.textContent=formatFacilityDistance(place.distanceMeters);button.append(distance);
    }
    button.addEventListener('click',()=>{
      clearMapResults();marker?.remove();
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
      const previous=[...new Set(recentSearchQueries())];
      const explicitHistory=phoneSearch()&&dropdown.dataset.searchMode==='history';
      const heading=document.createElement('strong');heading.className='dj-recent-query-title';heading.textContent=explicitHistory?'최근 검색어':'추천 장소';defaults.append(heading);
      const names=explicitHistory?previous:[...new Set([...previous,...DEFAULT_MAP_SEARCH_TERMS])];
      if(!names.length){const empty=document.createElement('p');empty.className='dj-recent-query-empty';empty.textContent='최근 검색어가 없습니다.';defaults.append(empty);}
      for(const name of names){
        const btn=document.createElement('button');btn.type='button';btn.className='map-quick-search-suggestion';
        if(explicitHistory){
          btn.classList.add('dj-search-history-row');
          // Legacy search chips use competing centered button rules. Give the
          // history row a dedicated label, not a centered bare text node.
          const icon=document.createElement('span');icon.className='dj-search-history-icon';icon.setAttribute('aria-hidden','true');
          icon.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
          const label=document.createElement('span');label.className='dj-search-history-label';label.textContent=name;
          btn.append(icon,label);
          for(const [key,value] of Object.entries({display:'flex','flex-direction':'row','justify-content':'flex-start','align-items':'center','text-align':'left',width:'100%',gap:'10px'}))btn.style.setProperty(key,value,'important');
        }else btn.textContent=name;
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
        const row={name,lng,lat,category:kind||'일반 시설',address:String(p['addr:full']||[p['addr:city'],p['addr:district'],p['addr:street'],p['addr:housenumber']].filter(Boolean).join(' ')||''),source:'loaded-map-poi'};
        const type=searchPlaceKind(row);if(type!=='place')row.kind=type;
        result.push(row);
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
    const all=mergeMapSearchResults([...cached,...stations,...searchLocalPlaces(text)],localVectorFacilities(text));
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
    catch(error){if(error.name==='AbortError')return;err='일부 장소를 불러오지 못했습니다.';}
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
    show();render([],true);feedback.textContent='';
  };
  mapView.addEventListener('click',()=>{
    if(!selectedMapRows.length||dropdown.dataset.searchMode!=='nearby')return;
    const rows=selectedMapRows.filter(place=>Number.isFinite(Number(place.lng))&&Number.isFinite(Number(place.lat))&&place.lng!=null&&place.lat!=null);
    clearMapResults();close();query.blur();syncEntry();
    for(const place of rows){
      const pin=document.createElement('button');pin.type='button';pin.className='dj-search-result-pin';pin.dataset.kind=searchPlaceKind(place);
      pin.title=place.name||'검색 장소';pin.setAttribute('aria-label',pin.title);
      pin.textContent=searchPlaceKind(place)==='bus'?'버스':searchPlaceKind(place)==='subway'?'역':'•';
      pin.addEventListener('pointerdown',event=>event.stopPropagation());
      pin.addEventListener('click',event=>{event.stopPropagation();makeResultButton(place).click();});
      resultMarkers.push(new maplibregl.Marker({element:pin,anchor:'center'}).setLngLat([Number(place.lng),Number(place.lat)]).addTo(map));
    }
    mapResultsLabel.textContent='검색 시설 '+resultMarkers.length+'곳';mapResultsBar.hidden=!resultMarkers.length;
  });
  const renderFacilityTabs=items=>{
    selectedMapRows=[];mapFooter.hidden=true;list.replaceChildren();
    if(items.length){
      const groups=[{label:'전체',rows:items},...groupVisibleFacilities(items)];
      const rail=document.createElement('div');rail.className='dj-visible-facility-rail';rail.setAttribute('role','group');rail.setAttribute('aria-label','시설 유형 선택');
      const results=document.createElement('div');results.className='dj-visible-facility-list';results.setAttribute('aria-label','시설 검색 결과');
      const buttons=[];
      const select=index=>{
        for(const [i,button] of buttons.entries())button.setAttribute('aria-pressed',String(i===index));
        results.replaceChildren(...groups[index].rows.map(makeResultButton));
        results.setAttribute('aria-label',groups[index].label+' 시설 검색 결과');
        selectedMapRows=groups[index].rows;mapFooter.hidden=dropdown.dataset.searchMode!=='nearby'||!selectedMapRows.length;
        // Reset the vertical list without moving the category rail sideways.
        body.scrollTop=0;
      };
      for(const [i,{label,rows}] of groups.entries()){
        const button=document.createElement('button');button.type='button';button.className='dj-visible-facility-tab';
        button.textContent=label+' '+rows.length;button.setAttribute('aria-label',label+' '+rows.length+'곳');
        button.addEventListener('click',()=>select(i));buttons.push(button);rail.append(button);
      }
      list.append(rail,results);select(0);
    }
  };
  const openNearby=async()=>{
    // Snapshot before the results panel opens. GPS and geolocation permissions
    // are intentionally not involved in this map-area search.
    const area=captureVisibleFacilityArea(map);
    const zoom=Number(map.getZoom?.());
    query.value='';form.classList.remove('dj807-has-input');query.blur();controller?.abort();controller=null;const active=++seq;
    filters.hidden=true;dropdown.dataset.searchMode='nearby';setTitle('이 지도에서 검색');show();list.replaceChildren();
    if(!area){
      feedback.textContent='시설을 찾으려면 지도를 조금 더 확대해 주세요.';
      const expand=document.createElement('button');expand.type='button';expand.className='map-quick-search-suggestion dj-search-zoom-action';expand.textContent='지도 확대';
      expand.addEventListener('click',()=>{
        close();query.blur();syncEntry();
        map.easeTo?.({zoom:Math.max(MIN_VISIBLE_FACILITY_ZOOM,Number.isFinite(zoom)?zoom+1:MIN_VISIBLE_FACILITY_ZOOM),duration:300});
      });
      list.append(expand);return;
    }
    feedback.textContent='현재 지도에서 시설을 찾고 있습니다…';
    const own=new AbortController();controller=own;
    const stations=Object.entries(VERIFIED_STATIONS).map(([name,[lng,lat]])=>({name:name.endsWith('역')?name:name+'역',lng,lat,kind:'subway',category:'지하철·철도역'}));
    const local=[...searchTransportSnapshot(),...officialSearchSnapshot(),...stations,...localVectorFacilities('',true)];
    let external=[],partial=false;const timeout=window.setTimeout(()=>own.abort(),7000);
    try{external=await fetchVisibleOfficialPlaces(area,{signal:own.signal});}catch(error){if(active!==seq)return;partial=true;}finally{window.clearTimeout(timeout);}
    if(active!==seq)return;
    const {items,total}=visibleFacilityResults(area,[...local,...external]);
    renderFacilityTabs(items);
    feedback.textContent=items.length?`현재 지도 내 ${total}곳${total>items.length?' · '+items.length+'곳 표시':''}${partial?' · 일부 장소를 불러오지 못했습니다.':''}`:(partial?'현재 지도에서 확인된 시설이 없습니다. 일부 장소를 불러오지 못했습니다.':'현재 지도에서 확인된 시설이 없습니다. 지도를 이동해 다시 검색해 주세요.');
  };
  const openGpsNearby=async()=>{
    query.value='';form.classList.remove('dj807-has-input');query.blur();controller?.abort();controller=null;const active=++seq;
    filters.hidden=true;dropdown.dataset.searchMode='gps-nearby';setTitle('내 주변 검색');show();list.replaceChildren();
    feedback.textContent='현재 위치를 확인하고 있습니다…';
    const isCurrent=()=>active===seq&&dropdown.dataset.searchMode==='gps-nearby'&&!dropdown.hidden;
    const retry=message=>{
      if(!isCurrent())return;
      feedback.textContent=message;list.replaceChildren();
      const button=document.createElement('button');button.type='button';button.className='map-quick-search-suggestion dj-search-zoom-action';button.textContent='현재 위치 다시 확인';
      button.addEventListener('click',openGpsNearby);list.append(button);
    };
    let origin;
    try{
      if(typeof getPosition!=='function')throw {code:2};
      const position=await getPosition({enableHighAccuracy:true,timeout:13000,maximumAge:10000});
      origin={lng:position?.coords?.longitude,lat:position?.coords?.latitude};
      if(!Number.isFinite(origin.lng)||!Number.isFinite(origin.lat))throw {code:2};
    }catch(error){retry(errorLocationCode(error)===1?'위치 권한을 허용해야 내 주변 검색을 이용할 수 있습니다.':'현재 위치를 확인하지 못했습니다. 다시 시도해 주세요.');return;}
    if(!isCurrent())return;
    const radius=500,limit=60;
    feedback.textContent='현재 위치 반경 500m 시설을 찾고 있습니다…';
    const own=new AbortController();controller=own;
    const stations=Object.entries(VERIFIED_STATIONS).map(([name,[lng,lat]])=>({name:name.endsWith('역')?name:name+'역',lng,lat,kind:'subway',category:'지하철·철도역'}));
    const local=[...searchTransportSnapshot(),...officialSearchSnapshot(),...stations,...localVectorFacilities('',true)];
    let external=[],partial=false;const timeout=window.setTimeout(()=>own.abort(),7000);
    try{external=await fetchNearbyOfficialPlaces(origin,{signal:own.signal,radius});}catch{partial=true;}finally{window.clearTimeout(timeout);}
    if(!isCurrent())return;
    const all=nearbySearchResults(origin,[...local,...external],{radius,limit:Infinity});
    const items=all.slice(0,limit);
    renderFacilityTabs(items);
    feedback.textContent=items.length?'반경 500m · 직선거리 가까운 순 · '+all.length+'곳'+(all.length>items.length?' · '+items.length+'곳 표시':'')+(partial?' · 일부 자료 조회 실패':''):'반경 500m 내 확인된 시설이 없습니다.'+(partial?' 일부 자료를 불러오지 못했습니다.':'');
  };
  map.on?.('movestart',()=>{if(dropdown.dataset.searchMode==='nearby'){close();query.blur();syncEntry();}});
  for(const button of [nearbyButton,gpsButton,historyButton])button.addEventListener('pointerdown',e=>e.preventDefault());
  nearbyButton.addEventListener('click',openNearby);gpsButton.addEventListener('click',openGpsNearby);historyButton.addEventListener('click',openHistory);
  query.addEventListener('blur',()=>window.setTimeout(syncEntry,0));
  const tabWatch=new MutationObserver(()=>{if(app.dataset.tab!=='map'){close();clearMapResults();}syncEntry();});tabWatch.observe(app,{attributes:true,attributeFilter:['data-tab']});
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
  return {close,clearMapResults,search:performSearch};
}
