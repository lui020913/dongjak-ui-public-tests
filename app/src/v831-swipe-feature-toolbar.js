import {fadePanelOut} from './v852-panel-transition.js';
import './v831-swipe-feature-toolbar.css';
import './v832-priority-feature-toolbar.css';

/** v8.2.11 · Mobile swipe shortcuts for existing map-options/safety controls.
 * This layer does not clone or override any map/API controller. Each shortcut
 * forwards one trusted user click to the original control (single source of truth).
 * The final "more" button is kept outside the horizontal scroll area.
 */
const FEATURES = [
  // Existing toolbar controls are kept in their original order. These are
  // additional shortcuts to real controls, never replacement controllers.
  ['live-metro','운행 중인 지하철 (위치 추정)','[data-live-vehicle="metro"]','train'],
  ['live-bus','실시간 버스 위치 (GPS)','[data-live-vehicle="bus"]','bus'],
  ['base-metro','지하철 노선·역 표시','[data-base-layer="metro"]','rail'],
  ['base-bus','버스정류장 표시','[data-base-layer="bus"]','bus-stop'],
  ['base-buildings','3D 건물 표시','[data-base-layer="buildings"]','building'],
  ['base-boundary','동작구 경계선 표시','[data-base-layer="boundary"]','boundary'],
  ['safe-incident','도로 돌발정보','[data-dj-import="road-incidents"]','alert'],
  ['safe-air','도시환경 관측','[data-dj-import="sdot-environment"]','thermometer'],
  ['safe-accidents','보행사고 다발지역','[data-dj-import="accidents"]','alert-circle'],
  ['safe-cross-survey','상도1동 횡단 지점','[data-dj-import="survey-crosswalk"]','crosswalk'],
  ['safe-cctv','방범·어린이 CCTV','[data-dj-import="cctv-security"]','camera'],
  ['safe-parking','불법주정차 CCTV','[data-dj-import="cctv-parking"]','camera'],
  ['safe-other-cctv','기타·다목적 CCTV','[data-dj-import="cctv-other"]','camera'],
  ['safe-slope','보행로 경사도','[data-dj-import="slope"]','mountain'],
  ['safe-elevator','지하철 엘리베이터','[data-dj-import="metro-elevator"]','access'],
  ['safe-signal','보행자 음향신호기','[data-dj-import="audio-signals"]','volume'],
  ['safe-aed','자동심장충격기 AED','[data-dj-import="official-aed"]','heart'],
  ['safe-facilities','안전시설','[id="toggle-safety-facilities"]','shield'],
  ['safe-crosswalk','횡단보도','[id="toggle-crosswalks"]','crosswalk'],
  ['safe-essentials','약국·편의점','[id="toggle-essentials"]','store'],
  ['safe-public','공공·교육시설','[id="toggle-public-facilities"]','landmark'],
  ['safe-station-access','지하철 출입구·편의시설','[id="toggle-station-accessibility"]','access'],
  ['safe-zones','어린이·노인 보호구역','[id="protection-zone-toggle"]','school'],
  ['safe-speed','도로별 제한속도','[id="sangdo-speed-toggle"]','gauge'],
  ['safe-speed-camera','무인교통단속카메라','[id="sangdo-camera-toggle"]','camera'],
  ['safe-night-analysis','야간 시야 분석','[id="night-visibility-toggle"]','moon'],
  ['safe-accessibility','교통약자 모드','[id="ped-access-toggle"]','access'],
  ['safe-nearby','내 주변 보행정보','[id="ped-nearby-open"]','locate'],
  ['safe-report','보행불편 제보','[id="ped-report-open"]','pencil'],
  ['map-dong','행정동 선택·경계 보기','[id="open-admin-dongs-from-options"]','map'],
  ['map-road-width','도로폭 추정 레이어','[id="toggle-road-width"]','road'],
  ['map-add','지도에 조사 지점 등록','[id="toggle-add"]','pin-plus'],
  ['map-filter-all','조사지점 필터: 전체','[data-filter="전체"]','layers'],
  ['map-filter-walk','조사지점 필터: 보행공간','[data-filter="보행공간"]','footprints'],
  ['map-filter-cross','조사지점 필터: 교차로·시야','[data-filter="교차로·시야"]','crosswalk'],
  ['map-filter-crossings','조사지점 필터: 횡단시설','[data-filter="횡단시설"]','traffic'],
  ['map-filter-light','조사지점 필터: 조명·시설물','[data-filter="조명·시설물"]','lightbulb'],
  ['map-filter-etc','조사지점 필터: 기타','[data-filter="기타"]','ellipsis'],
  ['safe-team','상도1동 사고 집중 검토','[id="dj-sangdo-team-toggle"]','scan'],
  ['safe-zone-zoom','상도1동 보호구역 전체 보기','[id="protection-zone-zoom"]','map'],
  ['safe-speed-zoom','상도1동 제한속도 보기','[id="sangdo-speed-zoom"]','gauge'],
  ['safe-camera-import','단속카메라 좌표 가져오기','[id="sangdo-camera-import"]','upload'],
  ['safe-outlet-retry','지하철 출구 다시 조회','[id="metro-access-retry"]','refresh'],
  ['safe-clear','추가 보행안전 레이어 모두 끄기','[id="dj-safety-clear-imports"]','eye-off']
];

// Static, hand-authored outline icons; no icon font or API dependency.
const ICON = {
  train:'<rect x="4" y="3" width="16" height="16" rx="4"/><path d="M4 10h16M8 19l-2 3m10-3 2 3M8 6h2m4 0h2M7 15h.01M17 15h.01"/>',
  bus:'<rect x="4" y="3" width="16" height="17" rx="3"/><path d="M4 10h16M8 20v2m8-2v2M7 15h.01M17 15h.01"/>',
  rail:'<path d="M5 3h14v14H5zM5 9h14M9 17l-3 4m9-4 3 4M9 6h2m3 0h2"/>',
  'bus-stop':'<rect x="3" y="4" width="13" height="13" rx="2"/><path d="M3 10h13m-10 7-2 4m10-4 2 4m4-15v14M7 7h5"/>',
  building:'<rect x="3" y="8" width="8" height="13"/><rect x="11" y="3" width="10" height="18"/><path d="M6 11h2m-2 4h2m8-9h2m-2 5h2m-2 5h2"/>',
  boundary:'<path d="M4 5l6-3 5 4 5-2v16l-6 2-5-4-5 2zM10 2v16m5-12v16"/>',
  alert:'<path d="M12 3 2 21h20L12 3Z"/><path d="M12 9v5m0 3v.1"/>',
  thermometer:'<path d="M10 13V5a3 3 0 0 1 6 0v8a5 5 0 1 1-6 0Z"/><path d="M13 8v9"/>',
  'alert-circle':'<circle cx="12" cy="12" r="9"/><path d="M12 7v6m0 4v.1"/>',
  crosswalk:'<path d="M2 5h20M2 19h20M5 8l-2 8m8-8-2 8m8-8-2 8m8-8-2 8"/>',
  camera:'<rect x="3" y="7" width="14" height="10" rx="2"/><circle cx="10" cy="12" r="3"/><path d="m17 10 4-2v8l-4-2M8 17l-1 4"/>',
  mountain:'<path d="m2 20 7-14 4 8 3-5 6 11H2Z"/>',
  access:'<circle cx="12" cy="4" r="2"/><path d="m7 9 5 2 5-2m-5 2v5m-5 5 5-5 5 5"/>',
  volume:'<path d="M4 9v6h4l5 4V5L8 9H4Zm13-2a7 7 0 0 1 0 10M19 4a11 11 0 0 1 0 16"/>',
  heart:'<path d="M20.8 5.8a5 5 0 0 0-7 0L12 7.5l-1.8-1.7a5 5 0 0 0-7 7L12 21l8.8-8.2a5 5 0 0 0 0-7Z"/><path d="M9 12h6m-3-3v6"/>',
  shield:'<path d="m12 2 9 4v6c0 5-3.4 8.6-9 10-5.6-1.4-9-5-9-10V6Z"/><path d="m8 12 3 3 5-6"/>',
  store:'<path d="M3 10 5 4h14l2 6v11H3V10Zm0 0h18m-14 0v2m5-2v2m5-2v2M9 21v-7h6v7"/>',
  landmark:'<path d="m2 9 10-6 10 6M3 9h18M4 20h16M6 10v9m5-9v9m6-9v9"/>',
  school:'<path d="m3 9 9-6 9 6v12H3V9Zm5 12v-8h8v8M7 9h1m8 0h1"/>',
  gauge:'<path d="M4 19a10 10 0 1 1 16 0H4Z"/><path d="m12 15 4-6m-8 9h8"/>',
  moon:'<path d="M20 14.4A8.8 8.8 0 0 1 9.6 4a9 9 0 1 0 10.4 10.4Z"/>',
  locate:'<circle cx="12" cy="12" r="4"/><path d="M12 2v5m0 10v5M2 12h5m10 0h5"/>',
  pencil:'<path d="m4 20 5-1 11-11-4-4L5 15l-1 5Zm10-13 4 4"/>',
  road:'<path d="M7.2 3 4 21M16.8 3 20 21M12 4.5v3M12 10.5v3M12 16.5v3"/>',
  map:'<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15"/>',
  'pin-plus':'<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><path d="M12 7v6m-3-3h6"/>',
  layers:'<path d="m12 2 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 17l9 5 9-5"/>',
  footprints:'<path d="M8 3c-2 2-2 6 1 9 2 2 1 5-1 6-2 1-5-1-5-3s3-3 2-6c-.5-2-1-4 3-6Zm9 4c2 2 3 5 1 8-2 3-1 5 1 5 3 0 4-2 2-4-1-1-1-3 0-4 1-3-1-5-4-5Z"/>',
  traffic:'<rect x="9" y="2" width="6" height="19" rx="3"/><circle cx="12" cy="7" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="17" r="1"/>',
  lightbulb:'<path d="M9 18h6m-5 3h4m-2-19a8 8 0 0 0-5 14c1 1 2 2 2 3h6c0-1 1-2 2-3a8 8 0 0 0-5-14Z"/>',
  ellipsis:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  scan:'<path d="M4 9V4h5m6 0h5v5m0 6v5h-5m-6 0H4v-5"/><circle cx="12" cy="12" r="3"/>',
  upload:'<path d="M12 16V3m-5 5 5-5 5 5M3 17v4h18v-4"/>',
  refresh:'<path d="M20 11a8 8 0 0 0-15-3L3 11V5m0 6h6m-5 2a8 8 0 0 0 15 3l2-3v6m0-6h-6"/>',
  'eye-off':'<path d="M3 3 21 21M10.5 5a11 11 0 0 1 11 7 13 13 0 0 1-3 3.7M6 6.8A13 13 0 0 0 2.5 12a11 11 0 0 0 15 5.6M10 10a3 3 0 0 0 4 4"/>'
};
const drawIcon=type=>`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round" stroke-linecap="round">${ICON[type]||ICON.layers}</svg>`;

// The first rail contains the functions relevant to daily walking. Technical,
// specialist and survey tools remain available in the fixed More menu.
/** Layer visibility switches belong in More only, never in the top shortcut rail. */
export const MORE_ONLY_KEYS=new Set(FEATURES.filter(([key,,selector])=>
  key.startsWith('base-')||key.startsWith('live-')||key==='map-road-width'||
  selector.includes('[data-dj-import=')||selector.includes('[data-base-layer=')||
  selector.includes('[data-live-vehicle=')||selector.includes('toggle-')||
  ['safe-zones','safe-speed','safe-speed-camera','safe-accessibility','safe-team'].includes(key)
).map(([key])=>key));
// Only true visibility controls get on/off switches. These never pin a layer to the top toolbar.
const VISIBILITY_KEYS=new Set(FEATURES.filter(([key,,selector])=>
  key.startsWith('base-')||key.startsWith('live-')||selector.includes('[data-dj-import=')||
  ['map-road-width','safe-facilities','safe-crosswalk','safe-essentials','safe-public',
   'safe-station-access','safe-zones','safe-speed','safe-speed-camera','safe-accessibility','safe-team'].includes(key)
).map(([key])=>key));
const DEFAULT_PRIMARY=['safe-nearby','safe-report'];
const SHORTCUTS_KEY='dongjak_mobile_shortcut_preferences_v8214';
const PREFERENCE_LIMIT=18;
function loadPrimary(win){
 try{const parsed=JSON.parse(win.localStorage.getItem(SHORTCUTS_KEY)||'null');
   if(Array.isArray(parsed)&&parsed.every(k=>typeof k==='string'))return new Set(parsed.filter(k=>!MORE_ONLY_KEYS.has(k)&&FEATURES.some(f=>f[0]===k)).slice(0,PREFERENCE_LIMIT));
 }catch{}
 return new Set(DEFAULT_PRIMARY);
}

const EXPLANATIONS={
 'live-metro':['열차의 역 도착·출발 및 운행정보를 바탕으로 지도 위 열차 위치를 추정합니다.','실제 열차 GPS가 아니며, 운행정보 지연이나 API 오류 시 위치를 표시하지 못할 수 있습니다. 일부 확대 수준에서만 표시됩니다.'],
 'live-bus':['서울시 버스 위치정보를 받아 지도 위에 차량 위치를 표시합니다.','위치정보 제공 여부는 노선·운행시간·API 상태에 따라 달라집니다. 지도에 차량이 보이지 않아도 운행 중단을 의미하지 않습니다.'],
 'safe-accidents':['등록된 보행자 교통사고 다발지역을 지도에 겹쳐 표시합니다.','기록된 통계·과거 사고 위치이며 실시간 사고 발생 여부나 개인별 위험을 예측하지 않습니다.'],
 'safe-cctv':['공개자료에 등록된 방범·어린이보호 CCTV 설치 위치를 확인할 수 있습니다.','설치 위치 참고용으로 실시간 영상·기기 가동 상태·촬영 가능 범위는 확인되지 않습니다.'],
 'safe-crosswalk':['지도 데이터에 등록된 일반 횡단보도를 표시합니다.','표시된 위치는 현장 위치와 다를 수 있습니다. 실제 횡단 여부는 신호와 도로 상황을 확인해야 합니다.'],
 'safe-slope':['지형자료를 바탕으로 추정한 보행로 경사 정보를 표시합니다.','경사도는 실제 현장 측정값과 다를 수 있습니다. 이동 약자에게 적합한 경로를 보장하지 않습니다.'],
 'safe-zones':['어린이·노인 보호구역으로 등록된 구간의 위치와 경계를 확인합니다.','법정 보호구역의 현재 지정 여부와 상세 범위는 관할 기관의 최신 자료로 재확인해야 합니다.'],
 'safe-elevator':['등록된 지하철 엘리베이터의 위치를 표시합니다.','실시간 운행 상태·고장 여부는 확인되지 않습니다.'],
 'safe-aed':['공공 데이터에 등록된 자동심장충격기(AED) 설치 위치를 표시합니다.','이용 가능 시간이나 실제 설치·운영 여부는 현장 또는 기관에 확인해야 합니다.'],
 'safe-nearby':['현재 위치 주변의 보행정보 안내를 엽니다.','GPS 수신 정확도와 데이터 범위에 따라 주변 정보가 불완전할 수 있습니다.'],
 'base-metro':['지하철 노선과 역을 기본 지도에 표시하거나 숨깁니다.','지도 확대에 따라 노선·역 표기 밀도가 달라집니다.'],
 'base-bus':['버스정류장 지도 레이어를 켜거나 끕니다.','정류장 명칭과 위치는 확대 수준 및 데이터 범위에 따라 달라질 수 있습니다.'],
 'base-buildings':['지도 위 건물의 3D 표현을 켜거나 끕니다.','건물 형상과 높이는 지도 데이터 기반의 시각화입니다.'],
 'base-boundary':['동작구의 행정 경계 표시를 켜거나 끕니다.','행정구역 표시는 참고용이며 법적 경계 확인을 대신하지 않습니다.'],
 'safe-incident':['도로 교통사고·통제 등 돌발정보 레이어를 켜거나 끕니다.','실시간 수집이 지연되거나 제공되지 않으면 최신 상황과 다를 수 있습니다.'],
 'safe-air':['지역 환경 관측값을 확인합니다.','센서 위치와 측정시각을 확인해 해석해야 하며 현 위치의 실측값은 아닙니다.'],
 'safe-cross-survey':['상도1동의 조사 횡단 지점 후보를 표시합니다.','현장 검증 전 조사자료이므로 정식 횡단보도로 단정하지 마십시오.'],
 'safe-parking':['불법주정차 단속 CCTV 설치지점을 표시합니다.','단속 가동 여부나 실시간 감시 여부는 제공되지 않습니다.'],
 'safe-other-cctv':['기타·다목적 CCTV 설치위치를 표시합니다.','실제 촬영범위·정상 작동 여부는 확인되지 않습니다.'],
 'safe-signal':['보행자 음향신호기 설치지점을 표시합니다.','사용 가능 여부는 현장에서 확인해야 합니다.'],
 'safe-facilities':['등록된 주요 보행안전 시설을 지도에 표시합니다.','현장 설치·운영 정보는 제공기관 갱신일에 따라 다를 수 있습니다.'],
 'safe-essentials':['약국·편의점 등 주변 편의시설을 표시합니다.','영업시간과 실제 운영 여부는 별도로 확인해야 합니다.'],
 'safe-public':['공공·교육시설 정보를 표시합니다.','시설 운영시간·출입 가능 여부는 별도 확인이 필요합니다.'],
 'safe-station-access':['지하철역 출입구·접근 관련 시설을 표시합니다.','확대 수준에 따라 출입구 및 시설 표시 여부가 달라집니다.'],
 'safe-speed':['등록된 도로 제한속도 구간을 표시합니다.','실제 도로의 교통표지와 최신 법정 제한속도를 우선하십시오.'],
 'safe-speed-camera':['무인교통단속카메라 등록 위치를 표시합니다.','가동 상태와 단속 조건은 제공되지 않습니다.'],
 'safe-night-analysis':['조명 및 지형·건물 자료를 바탕으로 야간 시야를 분석합니다.','계산 결과는 시뮬레이션이며 실제 현장 조도·시인거리 측정값이 아닙니다.'],
 'safe-accessibility':['교통약자 보행 관련 정보를 강조합니다.','현장의 모든 단차·장애물·엘리베이터 가동 상태를 보증하지 않습니다.'],
 'safe-report':['보행불편 제보 화면을 엽니다.','제보 접수와 처리상태는 해당 기능이 제공하는 확인 화면을 참고하십시오.'],
 'map-dong':['행정동별 지도 범위를 선택하고 경계를 강조합니다.','경계는 등록된 공간자료를 기준으로 표시됩니다.'],
 'map-add':['새로운 지도 조사지점을 등록하는 도구입니다.','지점 저장 여부는 등록 완료 메시지로 확인하십시오.'],
 'map-filter-all':['등록된 모든 조사지점을 표시하도록 필터를 바꿉니다.','등록된 조사지점이 없다면 변화가 없을 수 있습니다.'],
 'map-filter-walk':['보행공간 유형의 조사지점만 표시합니다.','현재 등록된 데이터에 따라 표시 지점이 없을 수 있습니다.'],
 'map-filter-cross':['교차로·시야 관련 조사지점만 표시합니다.','현재 등록된 데이터에 따라 표시 지점이 없을 수 있습니다.'],
 'map-filter-crossings':['횡단시설 조사지점만 표시합니다.','현재 등록된 데이터에 따라 표시 지점이 없을 수 있습니다.'],
 'map-filter-light':['조명·시설물 조사지점만 표시합니다.','현재 등록된 데이터에 따라 표시 지점이 없을 수 있습니다.'],
 'map-filter-etc':['기타 조사지점만 표시합니다.','현재 등록된 데이터에 따라 표시 지점이 없을 수 있습니다.'],
 'safe-team':['상도1동 사고 관련 집중 검토 메뉴를 엽니다.','분석 자료의 품질과 최신성을 확인한 뒤 해석하십시오.'],
 'safe-zone-zoom':['상도1동 보호구역이 보이도록 지도를 이동합니다.','현재 지정 경계와는 차이가 있을 수 있습니다.'],
 'safe-speed-zoom':['상도1동 제한속도 구간이 보이도록 지도를 이동합니다.','현장 교통표지와 최신 속도제한 정보를 우선합니다.'],
 'safe-camera-import':['단속카메라 좌표 파일을 가져오는 관리 기능입니다.','업로드한 좌표 형식과 출처를 확인하십시오.'],
 'safe-outlet-retry':['지하철 출입구 데이터를 다시 요청합니다.','데이터 제공기관 또는 네트워크 오류 시 계속 실패할 수 있습니다.'],
 'safe-clear':['보행안전 추가 레이어를 한 번에 끕니다.','원본 자료를 삭제하지 않고 화면의 표시 설정만 변경합니다.']
};
const EXTRA_SECTIONS=[
 ['지도 기본 레이어',k=>k.startsWith('base-')],
 ['보행·생활 안전',k=>k.startsWith('safe-')&&!k.match(/team|zoom|import|retry|clear/)],
 ['조사·관리 및 고급 기능',k=>true]
];

/**
 * Structural fallback for cached/missing CSS on iOS PWAs.
 * Constrains geometry, but deliberately does NOT fix individual feature width
 * with !important: v8.2.13's expanded-label animation owns that dimension.
 */
export function enforcePriorityToolbarSingleRow(row,scrollport,more){
  if(!row||!scrollport||!more)return false;
  const important=(element,name,value)=>element.style.setProperty(name,value,'important');
  const phone=row.ownerDocument?.defaultView?.matchMedia?.('(max-width:699px)')?.matches===true;
  row.style.setProperty('display','flex'); // CSS hidden/immersive selectors still win.
  important(row,'flex-wrap','nowrap');
  important(row,'align-items','center');
  important(row,'max-width','100%');
  important(row,'max-height',phone?'52px':'48px');
  important(row,'box-sizing','border-box');
  for(const [name,value] of Object.entries({
    display:'flex','flex-direction':'row','flex-wrap':'nowrap','align-items':'center',
    flex:'1 1 auto','min-width':'0','max-width':'100%',height:phone?'52px':'44px','max-height':phone?'52px':'44px',
    'overflow-x':'auto','overflow-y':'hidden','box-sizing':'border-box',
    'white-space':'nowrap','touch-action':'pan-x'
  })) important(scrollport,name,value);
  for(const button of scrollport.children){
    if(button.tagName!=='BUTTON')continue;
    // Non-important defaults are overridden by the priority CSS expansion rules.
    button.style.setProperty('display','inline-flex');
    button.style.setProperty('align-items','center');
    button.style.setProperty('justify-content','center');
    button.style.setProperty('flex','0 0 44px');
    button.style.setProperty('width','44px');
    button.style.setProperty('min-width','44px');
    button.style.setProperty('height','44px');
    button.style.setProperty('max-height','44px');
    button.style.setProperty('border-radius','999px');
    button.style.setProperty('white-space','nowrap');
  }
  for(const [name,value] of Object.entries({
    display:'flex','align-items':'center','justify-content':'center',flex:phone?'0 0 52px':'0 0 58px',width:phone?'52px':'58px',
    'min-width':phone?'52px':'58px',height:phone?'50px':'56px','min-height':phone?'50px':'56px','max-height':phone?'50px':'56px',
    'border-radius':'17px','box-sizing':'border-box'
  })) important(more,name,value);
  return true;
}

export function installSwipeFeatureToolbar(doc=document,win=window){
 const app=doc.getElementById('app');
 if(!app||!win.matchMedia)return ()=>{};
 const media=win.matchMedia('(min-width: 0px)');
 let row=null,scroller=null,sheet=null,extra=null,drawerObserver=null,sourceObserver=null,appObserver=null,resizeObserver=null;
 let current=null,activeButton=null,scheduled=false,drag=null,sourceNodes=[];
 let weatherSheet=null,nightConfirm=null,primary=loadPrimary(win),featureButtons=new Map(),weatherObserver=null;
 let expandedNative=null,scrollCue=null,edgeBlurLeft=null,edgeBlurRight=null;
 let initialPhonePending=false,initialPhoneObserver=null;
 const find=selector=>doc.querySelector(selector);
 const raf=fn=>typeof win.requestAnimationFrame==='function'?win.requestAnimationFrame(fn):queueMicrotask(fn);
 const featureMap=new Map(FEATURES.map(f=>[f[0],f]));
 function positionEdgeBlur(left,right){
    if(!row||!scroller||!edgeBlurLeft||!edgeBlurRight)return;
    const rowRect=row.getBoundingClientRect(),railRect=scroller.getBoundingClientRect(),width=Number.parseFloat(win.getComputedStyle?.(edgeBlurRight)?.width)||20;
    edgeBlurLeft.style.left=Math.max(0,railRect.left-rowRect.left)+'px';
    edgeBlurRight.style.left=Math.max(0,railRect.right-rowRect.left-width)+'px';
    edgeBlurLeft.hidden=!left;edgeBlurRight.hidden=!right;
  }
  function fade(){
    if(!scroller)return;
    const remain=scroller.scrollWidth-scroller.clientWidth,hasViewport=scroller.clientWidth>0;
    const left=hasViewport&&scroller.scrollLeft>3,right=hasViewport&&remain-scroller.scrollLeft>3;
    scroller.dataset.fadeLeft=left?'true':'false';scroller.dataset.fadeRight=right?'true':'false';
    positionEdgeBlur(left,right);
    if(scrollCue){scrollCue.hidden=!hasViewport||remain<=3;scrollCue.dataset.direction=right?'right':'left';scrollCue.setAttribute('aria-label',right?'오른쪽 지도 기능 더 보기':'왼쪽 지도 기능으로 이동');}
  }
 // Start on the priority tools once after the first map/onboarding layout,
 // but never move the rail after the visitor has started interacting with it.
 function settleInitialPhoneScroll(cancel=false){
   if(!initialPhonePending)return;
   if(!cancel){
     const tour=find('#dj860-onboarding'),startup=find('#map-startup-overlay');
     if(!scroller||scroller.clientWidth<=0||app.dataset.tab!=='map'||app.dataset.dj860AutoResolved!=='true'||
        (tour&&!tour.hidden)||(startup&&!startup.hidden&&startup.getClientRects().length)||
        !find('#dj912-poi-categories[data-dj912-integrated="true"]'))return;
   }
   initialPhonePending=false;
   initialPhoneObserver?.disconnect();initialPhoneObserver=null;
   if(!cancel){scroller.scrollTo({left:0,behavior:'instant'});fade();}
 }
 const cancelInitialScroll=()=>settleInitialPhoneScroll(true);
 function setExpandedWidth(button,label){
   let pixels=label.length*11.4;
   try{const ctx=doc.createElement('canvas').getContext('2d');if(ctx){ctx.font='650 12px Pretendard, system-ui, sans-serif';pixels=ctx.measureText(label).width;}}catch{}
   // 22px glyph + 5px gap + 2x 8px padding + 2px borders = label + 45px.
   // Previous +60px estimate left an unnecessary 15px trailing blank strip.
   const cap=Math.max(70,Math.min(288,win.innerWidth-84));
   button.style.setProperty('--dj833-expanded-width',Math.ceil(Math.max(70,Math.min(cap,pixels+46)))+'px');
 }
 function savePrimary(){try{win.localStorage.setItem(SHORTCUTS_KEY,JSON.stringify([...primary]));}catch{}}
 function isPrimary(key){return key==='map-dong'||primary.has(key);}
 function status(source){
   if(!source)return '연결된 설정을 찾을 수 없음';
   if(source.disabled)return '현재 사용할 수 없음';
   if(source.hasAttribute('aria-pressed'))return source.getAttribute('aria-pressed')==='true'?'켜짐':'꺼짐';
   if(source.hasAttribute('aria-expanded'))return source.getAttribute('aria-expanded')==='true'?'열림':'닫힘';
   if(source.classList.contains('selected')||source.classList.contains('active'))return '선택됨';
   return '실행 요청 (결과 미확인)';
 }
 function sync(){
   if(!row)return;
   if(sheet){const nav=find('#bottom-nav');const rect=nav?.getBoundingClientRect();if(rect?.height>0&&rect.top>0){const bottom=`${Math.max(0,win.innerHeight-rect.top+9)}px`;sheet.style.setProperty('--dj832-bottom',bottom);app.style.setProperty('--dj833-bottom',bottom);}}
   for(const btn of row.querySelectorAll('[data-dj831-feature]')){
     const feature=featureMap.get(btn.dataset.dj831Feature);if(!feature)continue;
     const source=find(feature[2]);const st=status(source);
     btn.dataset.active=(st==='켜짐'||st==='열림'||st==='선택됨')?'true':'false';
     btn.setAttribute('aria-pressed',String(btn.dataset.active==='true'));
     btn.dataset.unavailable=source?'false':'true';
   }
   if(current&&sheet&&!sheet.hidden){
     const source=find(current[2]);
     const st=sheet.querySelector('.dj832-state-text');
     if(st)st.textContent=status(source);
   }
   settleInitialPhoneScroll();
   fade();
 }
 function schedule(){if(scheduled)return;scheduled=true;raf(()=>{scheduled=false;sync();});}
 function closeWeather(){if(weatherSheet)weatherSheet.hidden=true;const b=find('#dj-v794-weather');b?.classList.remove('dj832-expanded');}
 function closeNightConfirm(){if(nightConfirm)nightConfirm.hidden=true;}
 function closeSheet(){
   if(!sheet||sheet.hidden)return;
   sheet.hidden=true;sheet.style.removeProperty('--dj832-drag');
   sheet.classList.remove('dj832-dragging');
   if(activeButton){activeButton.classList.remove('dj832-expanded');activeButton.setAttribute('aria-expanded','false');}
   activeButton=null;current=null;drag=null;fade();
 }
 function collapseNative(){
   if(expandedNative){expandedNative.classList.remove('dj832-expanded');expandedNative=null;}
 }
 function nativeClicked(e){
   const native=e.target.closest?.('#dj831-scrollport > .dj832-native');
   if(!native)return;
   const same=expandedNative===native;
   const weatherWasOpen=native.id==='dj-v794-weather'&&weatherSheet&&!weatherSheet.hidden;
   collapseNative();closeSheet();closeWeather();
   if(native.id==='dj-v794-weather'){if(!weatherWasOpen)openWeather();return;}
   if(native.id==='dj-v794-night')return;
   if(native.id==='dj800-type-trigger')return;
   if(!same){expandedNative=native;setExpandedWidth(native,native.dataset.dj832Label||native.getAttribute('aria-label')||'기능');native.classList.add('dj832-expanded');
     win.setTimeout?.(()=>{if(expandedNative!==native||!scroller)return;
       const view=scroller.getBoundingClientRect(),rect=native.getBoundingClientRect();
       if(rect.right>view.right-12)scroller.scrollBy({left:rect.right-view.right+16,behavior:'smooth'});
       else if(rect.left<view.left+10)scroller.scrollBy({left:rect.left-view.left-16,behavior:'smooth'});
     },330);
   }
   // This is only a presentation layer; the original mobile toolbar handlers
   // continue to open/close their own map, safety, typography and weather UI.
 }
 function hideMore(){
   const panel=find('#dj-mobile-utilities');if(panel&&!panel.hidden)panel.dispatchEvent(new (win.CustomEvent||CustomEvent)('dongjak:close-more',{detail:{immediate:true}}));
   app.classList.remove('dj-mobile-more-open');
   find('#dj-mobile-more-trigger')?.setAttribute('aria-expanded','false');
   find('#dj-v794-more')?.setAttribute('aria-expanded','false');
 }
 function openSheet(feature,button,sourceExists=true){
   if(!sheet)return;
   const [key,title]=feature;const [description,caveat]=EXPLANATIONS[key]||['이 지도 기능의 표시와 설정을 전환합니다.','표시 결과는 제공 데이터와 지도 확대 수준에 따라 달라집니다.'];
   sheet.querySelector('.dj832-sheet-title').textContent=title;
   sheet.querySelector('.dj832-sheet-summary').textContent=description;
   sheet.querySelector('.dj832-sheet-note').textContent=caveat;
   sheet.querySelector('.dj832-state-text').textContent=sourceExists?status(find(feature[2])):'연결된 설정을 찾지 못했습니다. 기존 메뉴에서 기능을 확인해 주세요.';
   sheet.hidden=false;
   sheet.style.removeProperty('--dj832-drag');
   if(button){activeButton=button;setExpandedWidth(button,feature[1]);button.classList.add('dj832-expanded');button.setAttribute('aria-expanded','true');
     const left=button.offsetLeft-scroller.scrollLeft, right=left+button.offsetWidth;
     if(right>scroller.clientWidth-8)scroller.scrollBy({left:right-scroller.clientWidth+12,behavior:'smooth'});
     else if(left<8)scroller.scrollBy({left:left-12,behavior:'smooth'});
   }
   current=feature;fade();
   if(button&&scroller){win.setTimeout?.(()=>{
     if(activeButton!==button||!scroller)return;
     const bounds=scroller.getBoundingClientRect(),item=button.getBoundingClientRect();
     if(item.right>bounds.right-12)scroller.scrollBy({left:item.right-bounds.right+16,behavior:'smooth'});
     else if(item.left<bounds.left+10)scroller.scrollBy({left:item.left-bounds.left-16,behavior:'smooth'});
   },330);}
 }
 function select(feature,button=null){
   // A second night-analysis shortcut cannot bypass the same consent dialog.
   if(feature[0]==='safe-night-analysis'){
     closeSheet();closeWeather();hideMore();
     if(app.dataset.sangdoNight==='on')find('#night-visibility-quick-off')?.click();
     else {collapseNative();nightConfirm.hidden=false;}
     return;
   }
   collapseNative();closeWeather();closeNightConfirm();
   const same=current?.[0]===feature[0]&&sheet&&!sheet.hidden;
   const source=find(feature[2]);
   const valid=Boolean(source&&!source.disabled);
   const alreadyOn=valid&&source.getAttribute('aria-pressed')==='true';
   const quickToggle=feature[0].startsWith('base-');
   // Clicking an already active (but collapsed) icon must turn it OFF immediately.
   if(same||(alreadyOn&&button&&!button.classList.contains('dj832-expanded'))){
     closeSheet();hideMore();
     if(valid&&(alreadyOn||same))source.click();
     schedule();return;
   }
   closeSheet();hideMore();
   if(feature[0]==='map-dong'&&app.dataset.tab!=='map'){
     // Navigation to the map for a district shortcut must not trigger the
     // user's single-tap home-dismiss action and immediately close the picker.
     app.dataset.dj836NavigationOnly='1';
     try{find('#bottom-nav .nav-tab[data-tab="map"]')?.click();}
     finally{delete app.dataset.dj836NavigationOnly;}
   }
   if(valid)source.click();
   // Base map layers are direct toggles and need no secondary sheet.
   if(!quickToggle&&feature[0]!=='map-dong')openSheet(feature,button,valid);
   schedule();
 }
 function makeFeature(feature){
   const [key,label,,icon]=feature;
   const btn=doc.createElement('button');btn.type='button';btn.className='dj-v794-tool dj831-feature dj832-feature';
   btn.dataset.dj831Feature=key;btn.dataset.dj831Source=feature[2];btn.dataset.active='false';
   btn.setAttribute('aria-label',label);btn.setAttribute('title',label);btn.setAttribute('aria-expanded','false');
   const iconWrap=doc.createElement('span');iconWrap.className='dj-v794-icon';iconWrap.setAttribute('aria-hidden','true');iconWrap.innerHTML=drawIcon(icon);
   const caption=doc.createElement('span');caption.className='dj832-feature-label';caption.textContent=({'safe-nearby':'주변정보','safe-report':'제보','map-dong':'행정동'})[key]||label;
   btn.append(iconWrap,caption);btn.addEventListener('click',()=>select(feature,btn));return btn;
 }
 function createOverlay(id,markup,role='dialog'){
   const pane=doc.createElement('section');pane.id=id;pane.hidden=true;
   pane.setAttribute('role',role);pane.innerHTML=markup;app.appendChild(pane);return pane;
 }
 function openWeather(){
   closeSheet();closeNightConfirm();hideMore();
   if(!weatherSheet)return;
   weatherSheet.hidden=false;
   const weatherButton=find('#dj-v794-weather');
   weatherButton?.classList.add('dj832-expanded');
   if(weatherButton)setExpandedWidth(weatherButton,'현재 날씨');
   updateWeather();
 }
 function updateWeather(){
   if(!weatherSheet)return;
   const label=find('#weather-label');const title=find('#weather-title');
   const summary=weatherSheet.querySelector('.dj833-weather-main');
   const details=weatherSheet.querySelector('.dj833-weather-details');
   const location=weatherSheet.querySelector('.dj833-weather-location');
   if(location)location.textContent=title?.textContent?.trim()||'동작구';
   if(summary)summary.textContent=label?.textContent?.trim()||'날씨 정보를 불러오는 중입니다.';
   if(details)details.textContent=label?.getAttribute('title')||'체감온도·강수·풍속 정보는 조회 결과에 따라 제공됩니다.';
 }
 function buildWeather(){
   weatherSheet=createOverlay('dj833-weather-sheet',`<div class="dj833-sheet-handle" aria-hidden="true"><span></span></div>
     <header class="dj833-weather-head"><div><span class="dj833-kicker">CURRENT WEATHER</span><h2>현재 날씨</h2></div><button type="button" class="dj833-weather-close" aria-label="날씨창 닫기">×</button></header>
     <p class="dj833-weather-location"></p><strong class="dj833-weather-main"></strong><p class="dj833-weather-details"></p>
     <button type="button" class="dj833-weather-refresh">날씨 다시 조회</button>`);
   weatherSheet.querySelector('.dj833-weather-close').addEventListener('click',closeWeather);
   weatherSheet.querySelector('.dj833-weather-refresh').addEventListener('click',()=>{win.dispatchEvent(new Event('dongjak:weather-refresh'));updateWeather();});
   const label=find('#weather-label');if(label){weatherObserver=new MutationObserver(updateWeather);weatherObserver.observe(label,{childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:['title']});}
   const handle=weatherSheet.querySelector('.dj833-sheet-handle');let start=null;
   handle.addEventListener('pointerdown',e=>{start={id:e.pointerId,y:e.clientY};handle.setPointerCapture?.(e.pointerId);});
   handle.addEventListener('pointerup',e=>{if(start?.id===e.pointerId&&e.clientY-start.y>55)closeWeather();start=null;});
 }
 function buildNightConfirm(){
   nightConfirm=createOverlay('dj833-night-modal',`<div class="dj833-night-dialog" role="dialog" aria-modal="true" aria-labelledby="dj833-night-title">
   <span class="dj833-kicker">NIGHT VISIBILITY</span><h2 id="dj833-night-title">야간 시야 모드</h2>
   <p>다크 테마로 전환하고 가로등 시야 분석을 켜시겠습니까?</p>
   <p class="dj833-night-notice">조명 범위는 분석상 추정치이며 실제 밝기나 안전도를 의미하지 않습니다.</p>
   <div class="dj833-night-actions"><button type="button" data-choice="no">아니요</button><button type="button" data-choice="yes">예, 시작</button></div></div>`);
   nightConfirm.querySelector('[data-choice="no"]').addEventListener('click',()=>{
     closeNightConfirm();
     // On desktop, declining consent must leave the persistent night shortcut
     // in its inactive "야간 시야" state, not a stale "야간 시야 해제" label.
     if(win.matchMedia?.('(min-width:1080px)')?.matches){
       const quickOff=find('#night-visibility-quick-off');
       if(quickOff){
         if(app.dataset.sangdoNight==='on'){
           quickOff.click();
         }else{
           quickOff.setAttribute('aria-pressed','false');
           quickOff.setAttribute('aria-label','야간 시야 켜기');
           const label=quickOff.querySelector('.dj-night-action-text');
           if(label)label.textContent='야간 시야';
           else quickOff.textContent='☾ 야간 시야';
         }
       }
     }
     collapseNative();
   });
   nightConfirm.querySelector('[data-choice="yes"]').addEventListener('click',()=>{
     closeNightConfirm();const source=find('#night-visibility-quick-off');
     if(source&&!source.disabled&&app.dataset.sangdoNight!=='on')source.click();
     collapseNative();schedule();
   });
   nightConfirm.addEventListener('click',e=>{if(e.target===nightConfirm)closeNightConfirm();});
 }
 function requestNight(e){
   if(e.target.closest?.('#dj-v794-night')==null)return;
   // Prevent the legacy proxy from activating the night scene before consent.
   e.preventDefault();e.stopImmediatePropagation();
   closeSheet();closeWeather();hideMore();collapseNative();
   if(app.dataset.sangdoNight==='on'){
     find('#night-visibility-quick-off')?.click();schedule();return;
   }
   nightConfirm.hidden=false;
 }
 function rebuildFeatureLocations(){
   if(!row||!scroller||!extra)return;
   for(const b of [...row.querySelectorAll('[data-dj831-feature].dj832-feature')])b.remove();
   extra.querySelectorAll('.dj833-feature-group,.dj833-more-edit,.dj834-shortcut-status').forEach(e=>e.remove());
   const anchor=find('#dj-v794-night');
   const next=anchor?.nextSibling||null;
   for(const feature of [featureMap.get('map-dong'),...FEATURES.filter(f=>f[0]!=='map-dong'&&!MORE_ONLY_KEYS.has(f[0])&&isPrimary(f[0]))]){
     const b=featureButtons.get(feature[0])||makeFeature(feature);
     featureButtons.set(feature[0],b);
     if(next)scroller.insertBefore(b,next);else scroller.appendChild(b);
   }
   const message=doc.createElement('p');message.className='dj834-shortcut-status';
   message.textContent='지도 레이어 표시 기능은 더보기에서만 사용할 수 있습니다.';
   extra.appendChild(message);
   const used=new Set();
   for(const [heading,test] of EXTRA_SECTIONS){
     const group=FEATURES.filter(f=>!used.has(f[0])&&test(f[0]));
     if(!group.length)continue;
     const section=doc.createElement('section');section.className='dj833-feature-group dj834-feature-group';
     const headingEl=doc.createElement('strong');headingEl.className='dj832-more-group-label';headingEl.textContent=heading;
     section.appendChild(headingEl);
     for(const feature of group){
       const [key,label,,icon]=feature;used.add(key);
       const line=doc.createElement('div');line.className='dj833-feature-line dj834-feature-line';
       const open=doc.createElement('button');open.type='button';open.className='dj832-more-feature';
       open.dataset.dj831Feature=key;
       open.innerHTML=`<span class="dj832-more-icon" aria-hidden="true">${drawIcon(icon)}</span><span class="dj832-more-label"></span>`;
       open.querySelector('.dj832-more-label').textContent=label;
       open.addEventListener('click',()=>select(feature,featureButtons.get(key)?.isConnected?featureButtons.get(key):null));
       const toggleLabel=doc.createElement('label');toggleLabel.className='dj834-shortcut-switch';
       const title=doc.createElement('span');title.textContent='';title.setAttribute('aria-hidden','true');
       const input=doc.createElement('input');input.type='checkbox';
       const isVisibility=VISIBILITY_KEYS.has(key);
       const source=isVisibility?find(feature[2]):null;
       input.checked=!MORE_ONLY_KEYS.has(key)&&isPrimary(key);
       if(isVisibility)input.checked=source?.getAttribute('aria-pressed')==='true';
       if(isVisibility){
         input.dataset.dj841LayerToggle=key;
         input.disabled=!source||source.disabled;
         toggleLabel.hidden=false;
       }else if(key==='map-dong'||MORE_ONLY_KEYS.has(key)){input.disabled=true;toggleLabel.hidden=true;}
       input.setAttribute('aria-label',isVisibility?`${label} 지도에 표시`: `${label} 상단 바로가기 표시`);
       input.addEventListener('change',()=>{
         if(isVisibility){
           const control=find(feature[2]);
           if(!control||control.disabled){input.checked=false;return;}
           // The original map controller owns the visibility state.
           const wasOn=control.getAttribute('aria-pressed')==='true';
           if(input.checked!==wasOn)control.click();
           win.setTimeout(()=>{input.checked=control.getAttribute('aria-pressed')==='true';},80);
           return;
         }
         if(input.checked&&primary.size>=PREFERENCE_LIMIT){
           input.checked=false;message.textContent=`상단 바로가기는 최대 ${PREFERENCE_LIMIT}개까지 설정할 수 있습니다.`;return;
         }
         if(input.checked)primary.add(key);else primary.delete(key);
         savePrimary();closeSheet();rebuildFeatureLocations();schedule();
       });
       toggleLabel.append(title,input);line.append(open,toggleLabel);section.appendChild(line);
     }
     extra.appendChild(section);
   }
   enforcePriorityToolbarSingleRow(row,scroller,find('#dj-v794-more'));
   fade();
 }
 function buildSheet(){
   sheet=doc.createElement('section');sheet.id='dj832-data-sheet';sheet.hidden=true;
   sheet.setAttribute('role','region');sheet.setAttribute('aria-label','지도 데이터 안내');
   sheet.innerHTML=`<div class="dj832-handle-area" aria-label="아래로 밀어서 닫기"><span class="dj832-grab-bar" aria-hidden="true"></span></div>
     <header class="dj832-sheet-header"><h2 class="dj832-sheet-title"></h2><button type="button" class="dj832-sheet-close" aria-label="데이터 안내 닫기"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M5 5l14 14M19 5 5 19"/></svg></button></header>
     <div class="dj832-sheet-body"><div class="dj832-state-row"><span>현재 설정</span><strong class="dj832-state-text"></strong></div><h3>데이터 설명</h3><p class="dj832-sheet-summary"></p><h3>이용 시 참고</h3><p class="dj832-sheet-note"></p></div>`;
   sheet.querySelector('.dj832-sheet-close').addEventListener('click',closeSheet);
   const handle=sheet.querySelector('.dj832-handle-area');
   handle.addEventListener('pointerdown',e=>{
     if(e.button!==undefined&&e.button!==0)return;
     drag={id:e.pointerId,start:e.clientY,delta:0};handle.setPointerCapture?.(e.pointerId);
     sheet.classList.add('dj832-dragging');
   });
   handle.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;drag.delta=Math.max(0,e.clientY-drag.start);sheet.style.setProperty('--dj832-drag',`${drag.delta}px`);});
   function finish(e){if(!drag||e.pointerId!==drag.id)return;const delta=drag.delta;drag=null;sheet.classList.remove('dj832-dragging');sheet.style.removeProperty('--dj832-drag');if(delta>68)closeSheet();}
   handle.addEventListener('pointerup',finish);handle.addEventListener('pointercancel',finish);
   app.appendChild(sheet);
 }
 function addMore(){
   const panel=find('#dj-mobile-utilities');if(!panel)return;
   extra=doc.createElement('section');extra.id='dj832-more-features';
   const title=doc.createElement('strong');title.className='dj832-more-title';title.textContent='지도 기능 · 개인 설정';extra.appendChild(title);
   (panel.querySelector('.dj-mobile-utilities-body')||panel).appendChild(extra);
   // Typography is exposed in My Info. Keep the native trigger available for existing callers.
   const typography=find('#dj800-type-trigger');
   if(typography){typography.classList.remove('dj832-native','dj832-expanded');typography.classList.add('dj833-more-type');typography.dataset.dj832Label='글자 크기·굵기';
     typography.setAttribute('aria-label','글자 크기·굵기 설정');typography.hidden=true;extra.appendChild(typography);
     // v886: the original toolbar control already navigates to the single
     // My Info typography screen. A second click handler here closed the
     // newly opened sheet and left a ghost overlay over iOS touch targets.
   }
   rebuildFeatureLocations();
 }
 function mount(){
   if(!media.matches||row)return;
   const target=find('#dj-v794-toolbar');if(!target||!find('#dj-v794-more'))return;
   row=target;scroller=doc.createElement('div');scroller.className='dj831-scrollport';scroller.id='dj831-scrollport';
   scroller.setAttribute('role','group');scroller.setAttribute('aria-label','주요 지도 기능: 좌우로 스와이프');scroller.tabIndex=0;
   const more=find('#dj-v794-more');row.insertBefore(scroller,more);
   for(const child of [...row.children])if(child!==scroller&&child!==more)scroller.appendChild(child);
   scrollCue=doc.createElement('button');scrollCue.type='button';scrollCue.className='dj912-toolbar-next';scrollCue.hidden=true;
   scrollCue.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m8 5 7 7-7 7"/></svg>';
   scrollCue.setAttribute('aria-controls','dj831-scrollport');scrollCue.setAttribute('aria-label','오른쪽 지도 기능 더 보기');
   scrollCue.addEventListener('click',()=>scroller?.scrollBy({left:(scrollCue.dataset.direction==='left'?-1:1)*Math.max(100,scroller.clientWidth-48),behavior:win.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches?'auto':'smooth'}));
   row.insertBefore(scrollCue,more);
    edgeBlurLeft=doc.createElement('span');edgeBlurLeft.className='dj831-edge-blur dj831-edge-blur-left';edgeBlurLeft.setAttribute('aria-hidden','true');edgeBlurLeft.hidden=true;
    edgeBlurRight=doc.createElement('span');edgeBlurRight.className='dj831-edge-blur dj831-edge-blur-right';edgeBlurRight.setAttribute('aria-hidden','true');edgeBlurRight.hidden=true;
    row.insertBefore(edgeBlurLeft,scrollCue);row.insertBefore(edgeBlurRight,scrollCue);
   // Keep the original map/safety/night, type and weather controls. Data
   // shortcuts are inserted after the three most frequently used controls.
   // Priority icons are rebuilt from saved preferences after the More panel exists.
   // Preserve the single-row PWA fallback without fixing the expanded pill widths.
   // Original top-level controls also get the same label animation without
   // replacing their existing event handlers or altering their aria-pressed data.
   for(const [id,label] of [
     ['dj-v794-map','지도 옵션'],['dj-v794-safety','보행안전'],
     ['dj-v794-night','야간 시야'],['dj-v794-weather','날씨']]){
     const native=find('#'+id);
     if(native&&native.parentElement===scroller){
       native.classList.add('dj832-native');native.dataset.dj832Label=label;
     }
   }
   scroller.addEventListener('click',nativeClicked);
   scroller.addEventListener('click',requestNight,true);
   buildSheet();buildWeather();buildNightConfirm();addMore();
   // Preserve the branch's structural guard on initial mount as well as on personalized rebuilds.
   enforcePriorityToolbarSingleRow(row,scroller,more);
   scroller.addEventListener('scroll',fade,{passive:true});
   initialPhonePending=win.matchMedia('(max-width:699px)').matches;
   if(initialPhonePending){
     row.addEventListener('pointerdown',cancelInitialScroll,{capture:true,passive:true});
     row.addEventListener('wheel',cancelInitialScroll,{capture:true,passive:true});
     row.addEventListener('keydown',cancelInitialScroll,true);
     initialPhoneObserver=new win.MutationObserver(records=>{
       if(records.some(r=>r.target===app||
          ['dj860-onboarding','map-startup-overlay','dj912-poi-categories'].includes(r.target?.id)||
          [...r.addedNodes].some(n=>['dj860-onboarding','map-startup-overlay','dj912-poi-categories'].includes(n.id))))schedule();
     });
     initialPhoneObserver.observe(app,{subtree:true,childList:true,attributes:true,
       attributeFilter:['hidden','class','data-dj860-auto-resolved','data-dj860-onboarding-open','data-dj912-integrated','data-tab']});
   }
   scroller.addEventListener('keydown',e=>{
     if(e.target!==scroller||!['ArrowLeft','ArrowRight'].includes(e.key))return;
     e.preventDefault();scroller.scrollBy({left:e.key==='ArrowRight'?130:-130,behavior:'smooth'});
   });
   row.querySelector('#dj-v794-more')?.addEventListener('click',()=>{closeSheet();closeWeather();closeNightConfirm();});
   doc.addEventListener('dj836:close-overlay-tools',()=>{closeSheet();closeWeather();closeNightConfirm();hideMore();collapseNative();});
   doc.addEventListener('keydown',onKeyDown);
   doc.addEventListener('click',onDocumentClick,true);
   if(typeof win.ResizeObserver==='function'){resizeObserver=new win.ResizeObserver(fade);resizeObserver.observe(scroller);}
   sourceObserver=new MutationObserver(schedule);
   for(const feature of FEATURES){const source=find(feature[2]);if(source&&!sourceNodes.includes(source)){sourceObserver.observe(source,{attributes:true,attributeFilter:['aria-pressed','aria-expanded','class','disabled']});sourceNodes.push(source);}}
   appObserver=new MutationObserver(()=>{if(app.dataset.tab&&app.dataset.tab!=='map'){closeSheet();closeWeather();closeNightConfirm();}schedule();});
   appObserver.observe(app,{attributes:true,attributeFilter:['data-tab','data-theme','class']});
   win.addEventListener('resize',schedule,{passive:true});
   schedule();
 }
 function onKeyDown(e){if(e.key==='Escape'){closeSheet();closeWeather();closeNightConfirm();}}
 function onDocumentClick(e){
   if(e.target.closest?.('#bottom-nav .nav-tab')){closeSheet();closeWeather();closeNightConfirm();collapseNative();}
 }
 function unmount(){
   if(!row)return;closeSheet();closeWeather();closeNightConfirm();collapseNative();
   sourceObserver?.disconnect();appObserver?.disconnect();resizeObserver?.disconnect();
   cancelInitialScroll();initialPhoneObserver?.disconnect();initialPhoneObserver=null;
   row.removeEventListener('pointerdown',cancelInitialScroll,true);
   row.removeEventListener('wheel',cancelInitialScroll,true);
   row.removeEventListener('keydown',cancelInitialScroll,true);
   doc.removeEventListener('keydown',onKeyDown);doc.removeEventListener('click',onDocumentClick,true);
   win.removeEventListener('resize',schedule);
   const type=find('#dj800-type-trigger');if(type&&type.parentElement===extra)row.insertBefore(type,find('#dj-v794-more'));
   weatherObserver?.disconnect();weatherObserver=null;weatherSheet?.remove();weatherSheet=null;nightConfirm?.remove();nightConfirm=null;
   scroller?.removeEventListener('click',requestNight,true);
   extra?.remove();extra=null;sheet?.remove();sheet=null;featureButtons.clear();
   if(scroller?.parentElement===row){
     scroller.removeEventListener('click',nativeClicked);
     scroller.querySelectorAll('.dj832-native').forEach(n=>{n.classList.remove('dj832-native','dj832-expanded');delete n.dataset.dj832Label;for(const p of ['display','align-items','justify-content','flex','width','min-width','height','max-height','border-radius','white-space'])n.style.removeProperty(p);});
     scroller.querySelectorAll('.dj832-feature').forEach(x=>x.remove());
     for(const child of [...scroller.children])row.insertBefore(child,scroller);scroller.remove();
   }
   const more=find('#dj-v794-more');if(more)for(const p of ['display','place-items','flex','width','min-width','height','min-height','max-height','border-radius','box-sizing'])more.style.removeProperty(p);
   edgeBlurLeft?.remove();edgeBlurRight?.remove();edgeBlurLeft=null;edgeBlurRight=null;

   scrollCue?.remove();scrollCue=null;
   row=null;scroller=null;sourceNodes=[];sourceObserver=null;appObserver=null;resizeObserver=null;
 }
 const update=()=>{if(!media.matches){unmount();return;}raf(mount);};
 media.addEventListener?.('change',update);
 const rootObserver=new MutationObserver(update);rootObserver.observe(app,{childList:true,subtree:false});
 update();
 return ()=>{media.removeEventListener?.('change',update);rootObserver.disconnect();unmount();};
}
if(typeof document!=='undefined'&&typeof window!=='undefined'){
 const start=()=>installSwipeFeatureToolbar(document,window);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
}
