import {markAiSurfaceDismissal} from './ai-surface-dismiss-guard.js';
import {createBusRouteOverlay,busRouteColor} from './bus-route-overlay.js';
import {isMetroDailyQuota,metroQuotaRetryMs} from './features/liveTransit/quota-state.js';
import {coalesceViewportWork} from './adaptive-phone-map-budget.mjs';
import {createInFlightRequests} from './arrival-request-coordinator.js';
import {createTransportWindowLifecycle} from './transport-window-lifecycle.js';
import {toggleSavedPlace,setSavedPlaceFolder,savedPlaces,getPlaceFolders,placeKey,recordRecentPlace,placeShareUrl,shareMapUrl} from './v815-place-store.js';
import {koreanNameOnly, koreanOSMName} from './korean-labels.js';
import {formatMetroArrivalCard} from './metro-arrival-display.js';
import {metroTerminalLabel} from './metro-status-view.js';
import {guardSubwayProxyArrival} from './transport-freshness.js';
import {permitsSubwayBulkRecovery,seoulSubwayIdForLine} from './subway-source-recovery.js';
import {applyBusStopLabelTheme,busStopLabelPalette} from './bus-stop-label-theme.js';
import {fixedRailCollection,fixedMetroStations} from './fixed-rail-lines.js';
import {metroMarkerGeojson, METRO_MARKER_MIN_ZOOM, METRO_PLATFORM_SPLIT_ZOOM as METRO_PLATFORM_SPLIT_ZOOM_DATA} from './metro-marker-geodata.js';
import {installResponsiveMetroVisibility} from './metro-overview-visibility.js';
import {railGeojson,stationsGeojson} from './fixed-rail-data.js';
import {fetchOfficialRailPaths,mergeOfficialRail} from './rail-official-shapes.js';
import {setDisplayedRailPaths} from './features/liveTransit/geometry.js';
import {isMedianBusStopName,medianStopBaseName,busStopDisplayName} from './median-bus-stops.js';
import {busCoverageSamples} from './bus-coverage-grid.js';
import {deduplicateBusStops,busTileFallbackFilter,busFilterInsideDistrict} from './bus-stop-dedup.js';
import {officialStaticBusPlaces} from './static-bus-stops.js';
import {busLastServiceStatus} from './bus-last-service.js';
import {operatorTimetableResources} from './metro-operator-timetables.js';
import {isScheduleMergedStation} from './metro-schedule-view.js';
import {verifiedInlineOperatorTimetable} from './metro-inline-schedules.js';
import {seoulServiceClock, plannedArrivalsFromTimetable} from './metro-planned-arrivals.js';
import {saveTimetable,loadTimetable,storeBusObservation,latestBusObservations,displaySeoulObservationTime,expectedBusHeadway} from './transport-timetable-cache.js';
import {verifiedKorailLine1Timetable} from './metro-korail-line1.js';
import {createSelectedTransportPin,mobileTransportFocusOffset} from './transport-selection-marker.js';
import {setMobileSheetExpanded} from './v889-mobile-sheet-motion.js';

// v5.2 교통 지도: 고정 지하철 안내 선형 + 배경지도 POI 정류소/역 위치.
// 서울시 실시간 정보는 별도 서버에 키를 보관하는 transport-proxy.mjs가 준비된 경우에만 표시.

const TRANSPORT_API_BASE = String(import.meta.env?.VITE_TRANSPORT_API_BASE || '/api/transport').replace(/\/$/, '');
export const METRO_RADIUS_METERS = 10000; // 동작구 중심을 기준으로 10km
export const METRO_RADIUS_CENTER = [126.9494,37.4987];
export function withinMetroRadius(lng,lat,radius=METRO_RADIUS_METERS){
  if(!Number.isFinite(lng)||!Number.isFinite(lat))return false;
  const lat0=METRO_RADIUS_CENTER[1]*Math.PI/180;
  const x=(lng-METRO_RADIUS_CENTER[0])*111320*Math.cos(lat0);
  const y=(lat-METRO_RADIUS_CENTER[1])*111320;
  return Math.hypot(x,y)<=radius;
}
// 2026년 공개 서울시 역사마스터를 정규화한 역 좌표 사본.
// 기존 Overpass 서버에만 의존하면 10km 역 목록이 실패하므로 별도 출처를 사용합니다.
export const STATION_MASTER_URL='https://raw.githubusercontent.com/daehyub71/seoul-subway-insight/main/data/station_coords_canonical.csv';
const STATION_MASTER_MIRROR='https://cdn.jsdelivr.net/gh/daehyub71/seoul-subway-insight@main/data/station_coords_canonical.csv';
export const NEARBY_METRO_SOURCE_CREDIT='서울시 역사마스터 · daehyub71/seoul-subway-insight';
export const STATION_LINE_ORDER={
  '1호선':['영등포','신길','대방','노량진','용산','남영','서울역'],
  '2호선':['신도림','대림','구로디지털단지','신대방','신림','봉천','서울대입구','낙성대','사당','방배','서초','교대','강남'],
  '4호선':['서울역','숙대입구','삼각지','신용산','이촌','동작','이수','사당','남태령','선바위','경마공원'],
  '5호선':['목동','오목교','양평','영등포구청','영등포시장','신길','여의도','여의나루','마포','공덕','애오개','충정로'],
  '6호선':['합정','상수','광흥창','대흥','공덕','효창공원앞','삼각지','녹사평','이태원','한강진','버티고개'],
  '7호선':['가산디지털단지','남구로','대림','신풍','보라매','신대방삼거리','장승배기','상도','숭실대입구','남성','이수','내방','고속터미널','반포','논현'],
  '9호선':['당산','국회의사당','여의도','샛강','노량진','노들','흑석','동작','구반포','신반포','고속터미널','사평','신논현'],
  '신림선':['샛강','대방','서울지방병무청','보라매','보라매공원','보라매병원','당곡','신림','서원','서울대벤처타운','관악산'],
  '경의중앙선':['디지털미디어시티','가좌','홍대입구','서강대','공덕','효창공원앞','용산','이촌','서빙고','한남','옥수','응봉','왕십리'],
  '공항철도':['김포공항','마곡나루','디지털미디어시티','홍대입구','공덕','서울역']
};
export function adjacentStationNames(name,line){
  const ordered=STATION_LINE_ORDER[normalizeLineName(line)] || [];
  const key=lineStationKey(name);
  const i=ordered.findIndex(x=>lineStationKey(x)===key);
  return {previous:i>0?ordered[i-1]:null,next:i>=0&&i<ordered.length-1?ordered[i+1]:null,verified:i>=0};
}
export function parseStationMasterCSV(csv){
  const lines=String(csv||'').replace(/^\uFEFF/,'').split(/\r?\n/);
  const results=[];
  const split=(line)=>{
    const out=[];let val='',quoted=false;
    for(let i=0;i<line.length;i++){
      const c=line[i];if(c==='"'){if(quoted&&line[i+1]==='"'){val+='"';i++;}else quoted=!quoted;}
      else if(c===','&&!quoted){out.push(val.trim());val='';}else val+=c;
    }
    out.push(val.trim());return out;
  };
  for(const row of lines){
    if(!row.trim())continue;
    const cells=split(row),name=String(cells[0]||'').trim().replace(/역$/,'');
    if(!name||!/[가-힣]/.test(name))continue;
    // 좌표 열 위치가 달라도 WGS84 범위로 안전하게 판별합니다.
    const latIndex=cells.findIndex((v,i)=>i>0 && Number(v)>=37.0&&Number(v)<38.2&& /^37\.\d+/.test(v));
    const lngIndex=cells.findIndex((v,i)=>i>0 && Number(v)>=126&&Number(v)<128 && /^12[67]\.\d+/.test(v));
    if(latIndex<0||lngIndex<0)continue;
    const rawLines=String(cells[1]||'').split(/[·|/]/).map(x=>x.trim()).filter(Boolean);
    const known=[...new Set(rawLines.map(normalizeLineName).filter(x=>Object.hasOwn(SUBWAY_LINE_COLORS,x)))];
    const normalized=normalizeStationQueryName(name);
    const override=SUBWAY_LINES[normalized]||[];
    const lineList=[...new Set([...known,...override])];
    if(!lineList.length)continue;
    results.push({id:`official/${normalized}/${results.length}`,kind:'subway',name:normalized,
      lng:Number(cells[lngIndex]),lat:Number(cells[latIndex]),lines:lineList,arsId:'',source:'historical-station-master'});
  }
  return results;
}
async function loadStationMaster(timeout=9000){
  let lastError=null;
  for(const url of [STATION_MASTER_URL,STATION_MASTER_MIRROR]){
    const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),timeout);
    try{
      const resp=await fetch(url,{signal:ctrl.signal,cache:'force-cache'});
      if(!resp.ok)throw new Error(`station master HTTP ${resp.status}`);
      const stations=parseStationMasterCSV(await resp.text());
      if(stations.length<120)throw new Error(`불충분한 역사 마스터 (${stations.length})`);
      return stations;
    }catch(error){lastError=error;}finally{clearTimeout(timer);}
  }
  throw lastError||new Error('역사 좌표 자료 조회 실패');
}
const arrivalMemo = new Map();
let stationMetroQuotaUntil=0,stationMetroQuotaResult=null;
function rememberStationMetroQuota(body,response){stationMetroQuotaUntil=Date.now()+metroQuotaRetryMs(body,response.headers?.get('Retry-After'));stationMetroQuotaResult={state:'error',code:'ERROR-337',items:[],sourceStatus:'quota',message:'서울시 지하철 API 일일 조회량을 초과했습니다. 이용 가능해지면 다시 조회됩니다.',quotaUntil:stationMetroQuotaUntil};return stationMetroQuotaResult;}
const arrivalInFlight = createInFlightRequests();
// 환승역은 OSM 태그에 노선명이 없을 수 있어 안정적인 기초 호선 정보를 보완합니다.
// 신규 역 개통이나 명칭 변경 시 갱신이 필요합니다.
const SUBWAY_LINES = {
  '노량진':['1호선','9호선'], '대방':['1호선','신림선'], '동작':['4호선','9호선'],
  '흑석':['9호선'], '노들':['9호선'], '남성':['7호선'],
  '숭실대입구':['7호선'], '상도':['7호선'], '장승배기':['7호선'],
  '신대방삼거리':['7호선'], '보라매':['7호선','신림선'],
  '총신대입구':['4호선','7호선'], '이수':['4호선','7호선'],
  '사당':['2호선','4호선'], '신대방':['2호선'],
  '서울지방병무청':['신림선'], '보라매병원':['신림선'], '보라매공원':['신림선'],
  '영등포':['1호선'], '신길':['1호선','5호선'], '용산':['1호선','경의중앙선'],
  '이촌':['4호선','경의중앙선'], '남태령':['4호선'],
  '신풍':['7호선'], '내방':['7호선'],
  '샛강':['9호선','신림선'], '구반포':['9호선'],
  '당곡':['신림선'], '신림':['2호선','신림선'],
  '공덕':['5호선','6호선','경의중앙선','공항철도'],
  '효창공원앞':['6호선','경의중앙선'], '홍대입구':['2호선','경의중앙선','공항철도'],
  '서강대':['경의중앙선'], '한남':['경의중앙선'], '서빙고':['경의중앙선'],
  '옥수':['3호선','경의중앙선'], '응봉':['경의중앙선'], '왕십리':['2호선','5호선','경의중앙선','수인분당선'],
  '디지털미디어시티':['6호선','경의중앙선','공항철도'],
  '서울역':['1호선','4호선','경의중앙선','공항철도'],
  '신용산':['4호선'], '숙대입구':['4호선'], '삼각지':['4호선','6호선'],
  '신림당곡':['신림선']
};

const SUBWAY_LINE_COLORS = {
  '1호선':'#0d57a7',
  '2호선':'#1d9f49',
  '3호선':'#ec8a11',
  '4호선':'#2f9edc',
  '5호선':'#8652a1',
  '6호선':'#a26739',
  '7호선':'#657b2f',
  '8호선':'#e63d80',
  '9호선':'#b89b2f',
  '신림선':'#6789CA',
  '우이신설선':'#bf8c2f',
  '경의중앙선':'#77C4A3',
  '공항철도':'#0090D2', '수인분당선':'#F5A200',
  '신분당선':'#D4003B', '경춘선':'#0C8E72', '서해선':'#81A914',
  '경강선':'#003DA5'
};
const DEFAULT_SUBWAY_LINE_COLOR = '#5f4aa2';
// Station-to-station overview connections, rendered as dashed schematic lines.
// These are NOT surveyed tunnel or track geometries. Only adjacent known stops are connected.
// 사용자가 제공한 노선도에서 확인한 동작구 주요 5개 노선의 역사 순서.
// 이 자료는 실제 터널/선로가 아니라 저배율(원거리) 노선 안내용 도식입니다.
export const SUBWAY_STATION_ORDER = {
  '1호선':['대방','노량진'],
  '4호선':['동작','이수','사당'],
  '7호선':['보라매','신대방삼거리','장승배기','상도','숭실대입구','남성','이수'],
  '9호선':['노량진','노들','흑석','동작'],
  '신림선':['대방','서울지방병무청','보라매','보라매공원','보라매병원']
};
// 바깥 자치구 표시용 확장 순서입니다. 기존 동작구 도식 순서는 그대로 유지합니다.
export const SUBWAY_NEARBY_ORDER = {
  '1호선':['영등포','신길','대방','노량진','용산'],
  '4호선':['이촌','동작','이수','사당','남태령'],
  '7호선':['신풍','보라매','신대방삼거리','장승배기','상도','숭실대입구','남성','이수','내방'],
  '9호선':['샛강','노량진','노들','흑석','동작','구반포'],
  '신림선':['대방','서울지방병무청','보라매','보라매공원','보라매병원','당곡','신림']
};
const SCHEMATIC_ANCHORS = {
  '1호선':[
    '영등포','신길',{lng:126.9198,lat:37.5150},'대방',{lng:126.9336,lat:37.5149},
    '노량진',{lng:126.9490,lat:37.5145},{lng:126.9569,lat:37.5150},'용산'
  ],
  '4호선':[
    '이촌',{lng:126.9734,lat:37.5093},'동작',{lng:126.9794,lat:37.5028},
    {lng:126.9821,lat:37.4952},'이수',{lng:126.9829,lat:37.4900},'사당','남태령'
  ],
  '7호선':[
    '신풍',{lng:126.9138,lat:37.5003},'보라매','신대방삼거리','장승배기',
    {lng:126.9412,lat:37.5062},'상도',{lng:126.9558,lat:37.5053},'숭실대입구',
    {lng:126.9683,lat:37.4949},'남성','이수','내방'
  ],
  '9호선':[
    '샛강',{lng:126.9297,lat:37.5165},'노량진',{lng:126.9441,lat:37.5146},
    '노들',{lng:126.9526,lat:37.5138},'흑석',{lng:126.9648,lat:37.5094},'동작','구반포'
  ],
  '신림선':[
    '대방',{lng:126.9282,lat:37.5134},'서울지방병무청','보라매',{lng:126.9208,lat:37.4991},
    '보라매공원','보라매병원',{lng:126.9292,lat:37.4907},'당곡','신림'
  ]
};
// Overpass 지하철역 목록 조회가 실패해도 동작구 전역의 개략 노선은 표시됩니다.
// 아래 좌표는 지도 안내용 대략적인 선형이며, 측량된 터널/선로가 아닙니다.
const FALLBACK_OVERVIEW_LINES={
  '1호선':[[126.917,37.516],[126.926,37.513],[126.942,37.514],[126.953,37.515]],
  '4호선':[[126.971,37.512],[126.977,37.501],[126.980,37.493],[126.982,37.486],[126.981,37.477]],
  '7호선':[[126.910,37.500],[126.920,37.492],[126.929,37.500],[126.939,37.505],[126.948,37.503],[126.956,37.498],[126.968,37.491],[126.979,37.486]],
  '9호선':[[126.921,37.516],[126.941,37.514],[126.953,37.513],[126.963,37.508],[126.977,37.502],[126.988,37.502]],
  '신림선':[[126.926,37.513],[126.923,37.506],[126.920,37.498],[126.923,37.494],[126.929,37.486]]
};
export function makeNearbyRailOverview(stations=[],isInside=()=>true){
  // 역사별 정확한 좌표 사이를 잇는 저배율 노선도. 실제 터널의 정확한 위치·형상을 뜻하지 않습니다.
  const stationsByName=new Map();
  for(const item of stations){
    if(item.kind!=='subway')continue;
    const key=lineStationKey(item.name);
    if(!stationsByName.has(key))stationsByName.set(key,item);
  }
  const lines=[];
  for(const [line,order] of Object.entries(STATION_LINE_ORDER)){
    let current=[];
    const flush=()=>{
      if(current.length>=2){
        lines.push({type:'Feature',properties:{line,color:subwayLineColor(line),schematic:true,source:'historical-station-master'},
          geometry:{type:'LineString',coordinates:current}});
      }
      current=[];
    };
    for(const stationName of order){
      const item=stationsByName.get(lineStationKey(stationName));
      const belongs=item?.lines?.some(x=>normalizeLineName(x)===line);
      if(!item||!belongs){flush();continue;}
      const coordinate=[item.lng,item.lat];
      if(current.length && meterDistance(current.at(-1),coordinate)>3000)flush();
      current.push(coordinate);
    }
    flush();
  }
  return scopeRailConnections(smoothSchematicRailConnections({type:'FeatureCollection',features:lines},4),isInside);
}
export function fallbackRailOverview(){
  return {type:'FeatureCollection',features:Object.entries(FALLBACK_OVERVIEW_LINES).map(([line,coordinates])=>({
    type:'Feature',properties:{line,color:subwayLineColor(line),schematic:true,source:'reference-diagram'},
    geometry:{type:'LineString',coordinates}
  }))};
}
export const RAIL_OVERVIEW_MIN_ZOOM = 10.7;
export const RAIL_OVERVIEW_MAX_ZOOM = 14;
// 역명 데이터의 이수/총신대입구 혼용(4호선·7호선 환승)을 통일합니다.
const SUBWAY_STATION_ALIASES = {'총신대입구':'이수'};
function lineStationKey(name) {
  const clean=normalizeStationQueryName(name);
  return SUBWAY_STATION_ALIASES[clean] || clean;
}
// 곡선 보간은 노선도가 직각으로 꺾이지 않게 하기 위한 시각화입니다.
// 역 위치와 순서는 바꾸지 않으며 측량된 선형으로 취급하지 않습니다.
export function smoothSchematicRailConnections(collection, steps=7){
  const smoothed=(collection?.features || []).map(feature=>{
    if(feature?.geometry?.type!=='LineString')return feature;
    const coords=feature.geometry.coordinates;
    if(!Array.isArray(coords)||coords.length<3)return feature;
    const out=[coords[0]];
    const n=Math.max(2,Math.min(12,Math.floor(steps)));
    for(let i=0;i<coords.length-1;i++){
      const a=coords[Math.max(i-1,0)],b=coords[i],c=coords[i+1],d=coords[Math.min(i+2,coords.length-1)];
      for(let k=1;k<n;k++){
        const t=k/n,t2=t*t,t3=t2*t;
        const p=[0,1].map(axis=>{
          const x0=a[axis],x1=b[axis],x2=c[axis],x3=d[axis];
          const x=.5*((2*x1)+(-x0+x2)*t+(2*x0-5*x1+4*x2-x3)*t2+(-x0+3*x1-3*x2+x3)*t3);
          const padding=Math.abs(x2-x1)*.15;
          return Math.max(Math.min(x1,x2)-padding,Math.min(Math.max(x1,x2)+padding,x));
        });
        out.push(p);
      }
      out.push(c);
    }
    return {...feature,geometry:{...feature.geometry,coordinates:out}};
  });
  return {type:'FeatureCollection',features:smoothed};
}
// This is a schematic network, not the surveyed tunnel alignment.
// Extend schematic endpoints *only to the real district boundary* so lines do not
// abruptly stop at their first / last available station inside Dongjak-gu.
function meterDistance(a,b){
  const lat=(a[1]+b[1])/2*Math.PI/180;
  return Math.hypot((a[0]-b[0])*111320*Math.cos(lat),(a[1]-b[1])*111320);
}
function boundaryEnd(station, neighbor, isInside){
  if(!isInside(station[0],station[1]))return station;
  const lat=station[1]*Math.PI/180;
  const dx=(station[0]-neighbor[0])*111320*Math.cos(lat);
  const dy=(station[1]-neighbor[1])*111320;
  const length=Math.hypot(dx,dy);
  if(length<80)return station;
  const ux=dx/length,uy=dy/length;
  let prior=station;
  for(let m=65;m<=4500;m+=65){
    const cur=[station[0]+ux*m/(111320*Math.cos(lat)), station[1]+uy*m/111320];
    if(!isInside(cur[0],cur[1])){
      let lo=prior,hi=cur;
      for(let i=0;i<13;i++){
        const mid=[(lo[0]+hi[0])/2,(lo[1]+hi[1])/2];
        if(isInside(mid[0],mid[1]))lo=mid;else hi=mid;
      }
      return lo;
    }
    prior=cur;
  }
  return station; // never draw invented off-district geometry when boundary cannot be established
}
export function makeSchematicRailConnections(stations=[],isInside=()=>true,options={}){
  const index=new Map();
  for(const station of stations){
    if(station.kind!=='subway'||!Number.isFinite(station.lng)||!Number.isFinite(station.lat))continue;
    const name=lineStationKey(station.name);
    if(!index.has(name))index.set(name,station);
  }
  const features=[];
  const orderedLines=options.includeOuter?SUBWAY_NEARBY_ORDER:SUBWAY_STATION_ORDER;
  for(const [line,ordered] of Object.entries(orderedLines)){
    const pathSpec=(SCHEMATIC_ANCHORS[line]||ordered).filter(Boolean);
    const rawPath=[];
    for(const item of pathSpec){
      if(typeof item==='string'){
        const station=index.get(lineStationKey(item));
        if(station) rawPath.push({type:'station',name:lineStationKey(item),coord:[station.lng,station.lat]});
      }else if(Number.isFinite(item?.lng)&&Number.isFinite(item?.lat)){
        rawPath.push({type:'anchor',coord:[item.lng,item.lat]});
      }
    }
    if(rawPath.filter(x=>x.type==='station').length<2)continue;
    let segment=[];
    let missingGap=false;
    const flush=()=>{
      const stationCount=segment.filter(x=>x.type==='station').length;
      if(stationCount<2){segment=[];missingGap=false;return;}
      let coords=segment.map(x=>x.coord);
      const firstStation=segment.find(x=>x.type==='station');
      const lastStation=[...segment].reverse().find(x=>x.type==='station');
      const firstName=firstStation?.name;
      const lastName=lastStation?.name;
      if(coords.length>=2 && (ordered.length && firstName===lineStationKey(ordered[0]))){
        const edge=boundaryEnd(coords[0],coords[1],isInside);
        if(meterDistance(edge,coords[0])>20)coords=[edge,...coords];
      }
      if(coords.length>=2 && (ordered.length && lastName===lineStationKey(ordered.at(-1)))){
        const edge=boundaryEnd(coords.at(-1),coords.at(-2),isInside);
        if(meterDistance(edge,coords.at(-1))>20)coords=[...coords,edge];
      }
      features.push({type:'Feature',properties:{line,color:subwayLineColor(line),schematic:true,
        firstStation:firstName||'',lastStation:lastName||''},geometry:{type:'LineString',coordinates:coords}});
      segment=[];missingGap=false;
    };
    for(const item of pathSpec){
      if(typeof item==='string'){
        const station=index.get(lineStationKey(item));
        if(!station){ if(segment.length) missingGap=true; continue; }
        const node={type:'station',name:lineStationKey(item),coord:[station.lng,station.lat]};
        if(segment.length){
          const prevStation=[...segment].reverse().find(x=>x.type==='station');
          if(missingGap || (prevStation && meterDistance(prevStation.coord,node.coord)>3100)) flush();
        }
        segment.push(node);
        continue;
      }
      if(Number.isFinite(item?.lng)&&Number.isFinite(item?.lat) && segment.length && !missingGap){
        segment.push({type:'anchor',coord:[item.lng,item.lat]});
      }
    }
    flush();
  }
  return {type:'FeatureCollection',features};
}

// 구역 밖의 노선은 지리적 맥락용으로 얇고 연하게 표시합니다.
// 실제 터널 선형이 아닌 개략 노선이라는 점은 동일합니다.
export function scopeRailConnections(collection,isInside){
  const result=[];
  for(const f of collection?.features||[]){
    const coordinates=f.geometry?.coordinates||[];
    if(f.geometry?.type!=='LineString'||coordinates.length<2)continue;
    let active=null, segment=[];
    const flush=()=>{
      if(segment.length>=2)result.push({...f,properties:{...f.properties,scope:active},
        geometry:{type:'LineString',coordinates:[...segment]}});
    };
    for(let i=1;i<coordinates.length;i++){
      const a=coordinates[i-1],b=coordinates[i];
      const midpoint=[(a[0]+b[0])/2,(a[1]+b[1])/2];
      const scope=isInside(midpoint[0],midpoint[1])?'inside':'outside';
      if(active!==scope){flush();active=scope;segment=[a,b];}
      else segment.push(b);
    }
    flush();
  }
  return {type:'FeatureCollection',features:result};
}
export function normalizeLineName(line){
  const value=String(line||'').trim().replace(/\s+/g,'').replace(/수도권전철/g,'').replace(/서울지하철/g,'');
  if(/^(경의.?중앙선?|경의중앙|경의선|중앙선|경원선|Gyeongui.?Jungang)$/i.test(value)) return value==='경원선'?'1호선':'경의중앙선';
  if(/^(경부선|경인선|장항선)$/.test(value)) return '1호선';
  if(/^(과천선|안산선)$/.test(value)) return '4호선';
  if(value==='일산선')return '3호선';
  if(value==='분당선'||value==='수인선')return '수인분당선';
  if(value.startsWith('공항철도'))return '공항철도';
  if(value.startsWith('9호선'))return '9호선';
  if(/^(신림선?|SillimLine|Sillim)$/i.test(value))return '신림선';
  if(/^(공항철도|AREX)$/i.test(value))return '공항철도';
  if(/^(수인.?분당선?|수인분당)$/i.test(value))return '수인분당선';
  if(/^[1-9]$/.test(value))return `${value}호선`;
  return value;
}
export function subwayLineColor(line){
  return SUBWAY_LINE_COLORS[normalizeLineName(line)] || DEFAULT_SUBWAY_LINE_COLOR;
}

export function metroLineBadgeText(line){
  const value=String(line||'').trim();
  const standard=value.match(/^([1-9])호선$/);
  if(standard)return standard[1];
  if(value==='신림선')return '신림';
  if(normalizeLineName(value)==='경의중앙선')return '경의중앙';
  if(value==='공항철도')return '공항';
  if(value==='수인분당선')return '수인분당';
  if(value==='우이신설선')return 'U';
  return ''; // 확인되지 않은 호선에는 임의의 색·이름을 표시하지 않음
}
export function knownRailLine(tags={}){
  const text=[tags.ref,tags.line,tags['railway:line'],tags.route_ref,tags.name].filter(Boolean).join(' ');
  const direct=String(text).match(/(?:^|[ ,;:/])(신림선|우이신설선|[1-9]호선)(?:$|[ ,;:/])/);
  if(direct)return direct[1];
  const ref=String(tags.ref||tags.line||'').trim();
  if(/^[1-9]$/.test(ref))return `${ref}호선`;
  return null;
}
export function railwayGeometryFeatures(elements, isInside=()=>true){
  const tracks=[],platforms=[];
  for(const item of asArray(elements)){
    if(item.type!=='way'||!Array.isArray(item.geometry)||item.geometry.length<2)continue;
    const tags=item.tags||{};
    const coords=item.geometry.map(p=>[Number(p.lon),Number(p.lat)]).filter(p=>p.every(Number.isFinite));
    if(coords.length<2||!coords.some(p=>isInside(p[0],p[1])===true))continue;
    const isPlatform=tags.railway==='platform'||(tags.public_transport==='platform'&&tags.subway==='yes');
    const isTrack=tags.railway==='subway'||tags.railway==='light_rail';
    if(!isPlatform&&!isTrack)continue;
    const line=knownRailLine(tags);
    const closed=coords.length>=4&&coords[0][0]===coords.at(-1)[0]&&coords[0][1]===coords.at(-1)[1];
    (isPlatform?platforms:tracks).push({type:'Feature',properties:{
      id:`way/${item.id}`,name:String(tags.name||''),line:line||'',color:line?subwayLineColor(line):'#9ba9ad'
    },geometry:{type:closed&&isPlatform?'Polygon':'LineString',coordinates:closed&&isPlatform?[coords]:coords}});
  }
  return {tracks:{type:'FeatureCollection',features:tracks},platforms:{type:'FeatureCollection',features:platforms}};
}
// OSM 노선 relation의 실제 way 좌표. 조회 성공 시에만 선로 형상을 표시합니다.
export function railwayRelationTracks(elements=[],isRelevant=()=>true){
  const features=[];
  const seen=new Set();
  for(const relation of elements||[]){
    if(relation.type!=='relation'||!['subway','light_rail','train'].includes(relation.tags?.route))continue;
    const tags=relation.tags||{};
    const label=[tags.ref,tags['name:ko'],tags.name].filter(Boolean).join(' ');
    const candidate=label.match(/경의\s*[·\-]?\s*중앙선?|신림선|[1-9]호선|공항철도|수인분당선|우이신설선/i)?.[0]
      || (/^[1-9]$/.test(String(tags.ref||''))?`${tags.ref}호선`:'');
    const line=normalizeLineName(candidate);
    if(!Object.hasOwn(SUBWAY_LINE_COLORS,line))continue;
    for(const member of relation.members||[]){
      if(member.type!=='way'||!Array.isArray(member.geometry)||member.geometry.length<2)continue;
      if(/^(stop|platform|stop_entry_only|stop_exit_only)$/.test(member.role||''))continue;
      const points=member.geometry.map(g=>[Number(g.lon),Number(g.lat)]).filter(x=>x.every(Number.isFinite));
      if(points.length<2||!points.some(x=>isRelevant(x[0],x[1])))continue;
      const key=`${line}:${member.ref}`;
      if(seen.has(key))continue;seen.add(key);
      features.push({type:'Feature',properties:{line,color:subwayLineColor(line),schematic:false,source:'OSM route relation'},
        geometry:{type:'LineString',coordinates:points}});
    }
  }
  return {type:'FeatureCollection',features};
}

function subwaySecondaryColor(lines){
  return subwayLineColor((Array.isArray(lines) && lines[1]) || lines?.[0] || '');
}
function subwayLineStyle(line){
  const color=subwayLineColor(line);
  return `--line-accent:${color};--line-bg:${color}18;--line-border:${color}66;--line-text:${color}`;
}
let closeActivePanel = () => {};
let transportBusy = false;
let cachedTransportPlaces = [];
export function searchCachedTransportPlaces(query) {
  const term = normalizeStationQueryName(query).toLowerCase().replace(/\s/g,'');
  if (term.length < 2) return [];
  return cachedTransportPlaces.filter(p => {
    const name=normalizeStationQueryName(p.name).toLowerCase().replace(/\s/g,'');
    return name.includes(term)||String(p.arsId||'').includes(term);
  }).slice(0,8).map(p=>({
    name:p.name,lng:p.lng,lat:p.lat,
    label:p.name,category:p.kind==='bus'?'버스정류장':'지하철·철도역',
    address:[p.arsId?`ARS ${p.arsId}`:'', ...(p.lines||[])].filter(Boolean).join(' · ')
  }));
}

// OpenFreeMap Bright 기반 지도의 교통 아이콘은 poi_transit 레이어에 들어갑니다.
// 해당 레이어의 데이터는 class='bus' 또는 'rail'이며, 별도의 Overpass 목록과 무관합니다.
// v17에서는 class가 bus/rail인 아이콘을 판별하지 못해 탭이 무반응이었습니다.
export function baseMapTransitPlace(feature, fallbackLngLat={}) {
  const p=feature?.properties||{};
  const layer=String(feature?.layer?.id||'').toLowerCase();
  const sourceLayer=String(feature?.layer?.['source-layer']||'').toLowerCase();
  const cls=String(p.class||'').toLowerCase();
  const subclass=String(p.subclass||'').toLowerCase();
  // 다른 POI가 교통 아이콘으로 오인되지 않도록 실제 OpenMapTiles POI만 채택합니다.
  if(sourceLayer && sourceLayer!=='poi')return null;
  if(!sourceLayer && !/^poi[_-]/.test(layer))return null;
  let kind;
  if(cls==='bus' || /^(bus_stop|bus_station)$/.test(subclass))kind='bus';
  else if(cls==='rail' || /^(subway|station|halt|tram_stop)$/.test(subclass))kind='subway';
  else return null;
  const geometry=feature.geometry;
  const coords=geometry?.type==='Point'&&Array.isArray(geometry.coordinates)?geometry.coordinates:[];
  const lng=Number(coords[0]??fallbackLngLat.lng);
  const lat=Number(coords[1]??fallbackLngLat.lat);
  if(!Number.isFinite(lng)||!Number.isFinite(lat))return null;
  const knownName=koreanNameOnly(p['name:ko'],p['name:nonlatin'],p.name);
  const needsOfficialName=kind==='bus'&&!knownName;
  const name=knownName || (kind==='bus'?'이름 미등록 버스정류장':'이름 미등록 철도역');
  const stationName=normalizeStationQueryName(name);
  const known=(SUBWAY_LINES[stationName]||[]);
  const tagged=kind==='subway'? [p.line,p.ref,p['subway:line'],p['railway:line']].filter(Boolean).flatMap(x=>String(x).split(/[,;/]+/).map(normalizeLineName)).filter(x=>Object.hasOwn(SUBWAY_LINE_COLORS,x)):[];
  const lines=kind==='subway'? [...new Set([...known,...tagged])]:[];
  return {id:`basemap/${kind}/${feature.id??`${lng.toFixed(6)}-${lat.toFixed(6)}`}`,
    kind,name,lng,lat,lines:[...lines],arsId:'',needsOfficialName,source:'basemap-poi'};
}


export function closeTransportPanel(restoreOverview=true){ closeActivePanel(restoreOverview); }

export function normalizeStationQueryName(name){
  const plain=String(name||'').trim().replace(/\s*\([^)]*\)\s*/g,'').replace(/역$/,'').trim();
  // 동일한 4·7호선 환승역을 서로 다른 역으로 표시하지 않습니다.
  return plain==='총신대입구'?'이수':plain;
}

// 멀리서는 한 역당 하나의 통합 배지, 가까이에서는 노선별 개별 배지를 표시합니다.
// 세부 배지는 각 노선의 실제 지도 선형 위 좌표를 따릅니다.
export const METRO_PLATFORM_SPLIT_ZOOM=METRO_PLATFORM_SPLIT_ZOOM_DATA;
export function metroMarkerVisibleAtZoom(role,isTransfer,zoom){
  if(zoom<METRO_MARKER_MIN_ZOOM)return false;
  if(zoom<METRO_PLATFORM_SPLIT_ZOOM)return role==='summary';
  return role==='detail';
}
const PLATFORM_MERGE_DISTANCE_METERS=45;
function metroPointDistanceMeters(a,b){
  const lat=(a[1]+b[1])*Math.PI/360;
  return Math.hypot((a[0]-b[0])*111320*Math.cos(lat),(a[1]-b[1])*111320);
}
function railLineCode(line){return line==='신림선'?'신림':String(line||'').replace(/호선$/,'');}
function railGeometryForLine(line){
  const code=railLineCode(line);
  return railGeojson.features.find(f=>String(f.properties?.line||'')===code)?.geometry?.coordinates || [];
}
function projectPointOnSegment(point,a,b){
  const lat=(point[1]+a[1]+b[1])*Math.PI/540;
  const sx=111320*Math.cos(lat), sy=111320;
  const ax=(a[0]-point[0])*sx, ay=(a[1]-point[1])*sy;
  const bx=(b[0]-point[0])*sx, by=(b[1]-point[1])*sy;
  const dx=bx-ax, dy=by-ay;
  const t=Math.max(0,Math.min(1,(-ax*dx-ay*dy)/((dx*dx+dy*dy)||1)));
  const x=ax+t*dx, y=ay+t*dy;
  return {t,distance:Math.hypot(x,y), point:[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]};
}
function snapPointToLine(point,lineCoords){
  if(!Array.isArray(lineCoords)||lineCoords.length<2)return {point,segment:0,t:0,along:0};
  let best={distance:Infinity,point,segment:0,t:0,along:0};
  let traveled=0;
  for(let i=1;i<lineCoords.length;i++){
    const a=lineCoords[i-1], b=lineCoords[i];
    const segLen=metroPointDistanceMeters(a,b);
    const hit=projectPointOnSegment(point,a,b);
    if(hit.distance<best.distance){best={distance:hit.distance,point:hit.point,segment:i-1,t:hit.t,along:traveled+segLen*hit.t};}
    traveled+=segLen;
  }
  return best;
}
function coordinateAlongLine(lineCoords,targetAlong){
  if(!Array.isArray(lineCoords)||lineCoords.length<2)return lineCoords?.[0]||null;
  let traveled=0;
  for(let i=1;i<lineCoords.length;i++){
    const a=lineCoords[i-1], b=lineCoords[i];
    const segLen=metroPointDistanceMeters(a,b);
    const next=traveled+segLen;
    if(targetAlong<=next || i===lineCoords.length-1){
      const t=segLen?Math.max(0,Math.min(1,(targetAlong-traveled)/segLen)):0;
      return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
    }
    traveled=next;
  }
  return lineCoords.at(-1);
}
/**
 * 고정 자료에 호선별 좌표가 있으면 그 점을 사용합니다.
 * 같은 기준점을 공유하는 환승역은 화면 픽셀 오프셋이 아니라
 * 각 호선 선형 위에서 몇 m씩만 벌려, 아이콘이 항상 노선 위에 있도록 합니다.
 */
/** Index the exact colored rail features currently rendered by MapLibre.
 *  The official GIS geometry replaces the schematic fallback when loaded.
 *  Every path is kept separate: disconnected official segments never gain
 *  artificial joining edges. */
export function indexRenderedMetroRail(collection){
  const lines=new Map();
  for(const feature of collection?.features||[]){
    if(feature?.geometry?.type!=='LineString')continue;
    const route=normalizeLineName(feature.properties?.line||'');
    const coords=feature.geometry.coordinates;
    if(!route||!Array.isArray(coords)||coords.length<2)continue;
    if(!lines.has(route))lines.set(route,[]);
    lines.get(route).push(coords);
  }
  return lines;
}
function nearestRenderedRail(point,paths){
  let best=null;
  for(const path of paths||[]){
    const candidate=snapPointToLine(point,path);
    if(Number.isFinite(candidate.distance)&&(!best||candidate.distance<best.distance))best=candidate;
  }
  return best;
}
export function metroLineMarkerPlacements(name,lines,lng,lat,renderedRailPaths=null){
  const station=normalizeStationQueryName(name);
  const unique=[...new Set((lines||[]).map(normalizeLineName).filter(Boolean))];
  const placements=unique.map(line=>{
    const code=railLineCode(line);
    const reference=stationsGeojson.features.find(f=>{
      return f.properties.line===code && normalizeStationQueryName(f.properties.name)===station;
    });
    const coordinates=reference?.geometry?.coordinates;
    return {line,lng:coordinates?.[0]??lng,lat:coordinates?.[1]??lat,
      source:reference?.properties?.source||'station-center',screenOffset:[0,0]};
  });
  for(const p of placements){
    const nearby=placements.filter(other=>metroPointDistanceMeters([p.lng,p.lat],[other.lng,other.lat])<PLATFORM_MERGE_DISTANCE_METERS);
    if(nearby.length>1){
      const sameLineGroup=[...nearby].sort((a,b)=>String(a.line).localeCompare(String(b.line),'ko'));
      const index=sameLineGroup.indexOf(p);
      const shiftMeters=Math.round((index-(sameLineGroup.length-1)/2)*34);
      const lineCoords=railGeometryForLine(p.line);
      const snapped=snapPointToLine([p.lng,p.lat],lineCoords);
      const moved=coordinateAlongLine(lineCoords,snapped.along+shiftMeters);
      if(Array.isArray(moved)&&moved.length===2&&Number.isFinite(moved[0])&&Number.isFinite(moved[1])){
        p.lng=moved[0]; p.lat=moved[1];
      }
    } else {
      const lineCoords=railGeometryForLine(p.line);
      const snapped=snapPointToLine([p.lng,p.lat],lineCoords);
      if(Array.isArray(snapped.point)&&Number.isFinite(snapped.point[0])&&Number.isFinite(snapped.point[1])){
        p.lng=snapped.point[0]; p.lat=snapped.point[1];
      }
    }
  }
  // The map can replace its fallback line with a more accurate official GIS
  // line asynchronously. Snap the badge to that SAME visible line, not an old
  // schematic curve. Limit displacement to avoid teleporting to a distant branch.
  if(renderedRailPaths instanceof Map){
    for(const p of placements){
      const match=nearestRenderedRail([p.lng,p.lat],renderedRailPaths.get(p.line));
      if(match&&match.distance<=220){
        p.lng=match.point[0];p.lat=match.point[1];
        p.source='rendered-rail-geometry';
      }
    }
  }
  // Different line badges must not collapse onto precisely the same coordinate.
  // Move only genuinely overlapping badges along EACH line's rendered geometry;
  // screen-pixel offsets would make the badge leave the route after map movements.
  if(placements.length>1){
    for(let i=0;i<placements.length;i++)for(let j=i+1;j<placements.length;j++){
      const a=placements[i],b=placements[j];
      if(metroPointDistanceMeters([a.lng,a.lat],[b.lng,b.lat])>=62)continue;
      for(const [p,sign] of [[a,-1],[b,1]]){
        const paths=renderedRailPaths instanceof Map?renderedRailPaths.get(p.line):null;
        const linePaths=paths?.length?paths:[railGeometryForLine(p.line)];
        const best=nearestRenderedRail([p.lng,p.lat],linePaths);
        if(!best)continue;
        // A line's curved path is a physical anchor: no free-floating icon.
        const bestPath=linePaths.find(path=>{
          const hit=snapPointToLine([p.lng,p.lat],path);
          return Math.abs(hit.distance-best.distance)<0.005;
        });
        if(!bestPath)continue;
        const shifted=coordinateAlongLine(bestPath,best.along+sign*22);
        if(shifted && metroPointDistanceMeters([p.lng,p.lat],shifted)<180){
          p.lng=shifted[0];p.lat=shifted[1];p.source='separated-on-rail';
        }
      }
    }
  }
  return placements;
}
export function arrivalsForSelectedMetroLine(place,items=[]){
  if(place?.kind!=='subway'||!place.selectedLine)return items;
  const requested=normalizeLineName(place.selectedLine);
  return items.filter(item=>normalizeLineName(item.line||item.route||'')===requested);
}
// 서울시 API의 역명 검색은 지도(OSM)의 역명·부역명 표기와 일치하지 않을 수 있습니다.
// 기본 이름으로 조회했는데 결과가 없을 때만 부역명 포함 표기 등을 재시도합니다.
const SUBWAY_API_NAME_ALIASES={
  '상도':['상도(LG전자사거리)','상도(중앙대앞)','상도역'],
  '숭실대입구':['숭실대입구(살피재)','숭실대입구역'],
  '이수':['총신대입구','총신대입구(이수)','이수역']
};
export function subwayStationQueryCandidates(name){
  const normal=normalizeStationQueryName(name).replace(/\s+/g,'');
  if(!normal)return [];
  return [...new Set([normal,...(SUBWAY_API_NAME_ALIASES[normal]||[])])];
}
function asArray(value){return Array.isArray(value) ? value : [];} 
function groupRefs(value){
  return [...new Set(String(value||'').split(/[;,/\s]+/).map(x=>x.trim()).filter(Boolean))];
}
function featureCollection(items){return {type:'FeatureCollection',features:items.map(x=>({
  type:'Feature', geometry:{type:'Point',coordinates:[x.lng,x.lat]}, properties:{
    osmId:x.id,
    name:x.name,
    label: x.kind==='bus' ? (x.name && !['이름 미등록','정류장명 미등록'].includes(x.name) ? busStopDisplayName(x) : (x.arsId ? `정류장 · ${x.arsId}` : '정류장명 미등록')) : x.name,
    direction:x.direction||'',
    median:Boolean(x.median),
    kind:x.kind,
    arsId:x.arsId||'',
    lines:x.lines.join(', '),
    primaryLine:x.lines?.[0]||'',
    secondaryLine:x.lines?.[1]||x.lines?.[0]||'',
    lineCount:Number(x.lines?.length||0),
    lineColor: x.kind==='subway' ? subwayLineColor(x.lines?.[0]||'') : '#2579c6',
    lineStrokeColor: x.kind==='subway' ? subwaySecondaryColor(x.lines||[]) : '#ffffff'
  }
}))};}
function normalizedName(tags){return koreanOSMName(tags, '이름 미등록');}
function lngLat(item){
  const p = item.center || item;
  return [Number(p.lon),Number(p.lat)];
}
function classifyOSM(item){
  const tags=item.tags||{};
  if(tags.highway==='bus_stop'||(tags.public_transport==='platform'&&tags.bus==='yes')) return 'bus';
  if(tags.railway==='station'||tags.railway==='halt'||tags.station==='subway'||(tags.public_transport==='station'&&tags.bus!=='yes')) return 'subway';
  return null;
}
export function normalizeOSMTransport(elements,isInside=()=>true){
  const byId=new Map();
  for(const item of asArray(elements)){
    const kind=classifyOSM(item);
    if(!kind)continue;
    const [lng,lat]=lngLat(item);
    if(!Number.isFinite(lng)||!Number.isFinite(lat)||!isInside(lng,lat))continue;
    const tags=item.tags||{};
    const id=`${item.type}/${item.id}`;
    const name=normalizedName(tags);
  const needsOfficialName=kind==='bus'&&(!name||name==='이름 미등록');
    const stationName=normalizeStationQueryName(name);
    const tagged=kind==='subway' ? (tags.line||tags['subway:line']||tags['ref:line']||'') : (tags.route_ref||tags['bus:routes']||'');
    const lines=[...new Set([...(kind==='subway'?groupRefs(tagged).map(normalizeLineName).filter(x=>Object.hasOwn(SUBWAY_LINE_COLORS,x)):groupRefs(tagged)),...(kind==='subway'?(SUBWAY_LINES[stationName]||[]):[])])];
    const possibleArs=String(tags['ref:seoul']||tags['ref:bus:stop']||tags.local_ref||tags.ref||'').trim();
    const arsId=/^\d{5}$/.test(possibleArs)?possibleArs:'';
    byId.set(id,{id,kind,lng,lat,name,arsId,lines,needsOfficialName});
  }
  return [...byId.values()];
}
function el(tag,className,text){const x=document.createElement(tag);if(className)x.className=className;if(text!==undefined)x.textContent=text;return x;}
export function makeLineBadge(line,extraClass=''){
  const badge=document.createElement('span');
  badge.className=`metro-badge-number ${extraClass}`.trim();
  const normalized=normalizeLineName(line);
  badge.textContent=metroLineBadgeText(normalized);
  badge.style.backgroundColor=subwayLineColor(normalized);
  if(normalized==='신림선')badge.classList.add('metro-badge-shinlim');
  if(normalized==='경의중앙선')badge.classList.add('metro-badge-gyeongui');
  badge.title=normalized;
  badge.setAttribute('aria-label',normalized);
  return badge;
}
/** Show a separate native-color badge for each verified transfer line. */
export function metroTransferBadgeLines(stationName,providedLines=[]){
  const key=lineStationKey(stationName);
  const available=new Set(Object.entries(STATION_LINE_ORDER)
    .filter(([,names])=>names.some(name=>lineStationKey(name)===key))
    .map(([line])=>normalizeLineName(line)));
  const preferred=(providedLines||[]).map(normalizeLineName)
    .filter(line=>Object.hasOwn(SUBWAY_LINE_COLORS,line));
  // Station Master may know lines not covered by the schematic order; preserve them.
  return [...new Set([...preferred,...available])];
}

/** Adjacent detail navigation is limited to Dongjak and documented boundary stops. */
export function canNavigateToMetroNeighbor(place,isInside=()=>false,isNearBoundary=()=>false){
  if(!place||!Number.isFinite(place.lng)||!Number.isFinite(place.lat))return false;
  return isInside(place.lng,place.lat)===true || isNearBoundary(place.lng,place.lat)===true;
}

export function createMetroLineCard(line,stationName){
  const card=el('div','metro-info-line-card');
  const neighbor=adjacentStationNames(stationName,line);
  const prev=neighbor.verified?(neighbor.previous||metroTerminalLabel(stationName,line,'previous')):'이전역 자료 미확인';
  const next=neighbor.verified?(neighbor.next||metroTerminalLabel(stationName,line,'next')):'다음역 자료 미확인';
  const tail=el('div','metro-neighbor-row');
  tail.style?.setProperty?.('--dj-metro-route-color',subwayLineColor(line));
  if(tail.dataset)tail.dataset.line=normalizeLineName(line);
  tail.setAttribute('aria-label',`${line} 이전역, 현재역, 다음역`);
  const previousNode=el('span','metro-rail-previous',`‹ ${prev}`);
  const nextNode=el('span','metro-rail-next',`${next} ›`);
  // A verified terminal has no adjacent destination; do not present a button.
  if(neighbor.verified&&!neighbor.previous)previousNode.hidden=true;
  if(neighbor.verified&&!neighbor.next)nextNode.hidden=true;
  tail.append(previousNode,el('strong','metro-rail-current',`${normalizeStationQueryName(stationName)}역`),nextNode);
  card.append(tail);
  return card;
}
function displayLines(container,lines,kind){
  container.replaceChildren();
  if(!lines.length){container.append(el('p','transport-empty',kind==='bus'?'공개 지도에 등록된 노선번호가 없습니다. 실제 노선이 없다는 뜻은 아닙니다.':'공개 지도에서 호선 정보를 확인하지 못했습니다.'));return;}
  for(const line of lines){
    const chip=el('span',`transport-line ${kind}`,line);
    if(kind==='subway'){chip.setAttribute('style',subwayLineStyle(line));chip.prepend(makeLineBadge(line,'metro-panel-badge'));}
    container.append(chip);
  }
}
// 서울시 실시간 도착 API의 방향은 버전마다 '상행 · ...' 또는 별도 필드로 도착할 수 있습니다.
// 모호한 문자열은 임의로 상·하행으로 단정하지 않습니다.
export function subwayArrivalDirection(row={}){
  const value=String(row.directionType||row.updnLine||row.direction||'').trim();
  const first=value.split(/[·|,/\s]+/).find(Boolean)||'';
  if(first==='상행'||first==='하행')return first;
  if(first==='내선'||first==='외선')return first;
  if(/상행/.test(value))return '상행';
  if(/하행/.test(value))return '하행';
  if(/내선/.test(value))return '내선';
  if(/외선/.test(value))return '외선';
  return '방향 미확인';
}
export function groupSubwayArrivals(items=[]){
  const lines=new Map();
  for(const row of items){
    const raw=normalizeLineName(row.line||row.route||'');
    const line=Object.hasOwn(SUBWAY_LINE_COLORS,raw)?raw:'호선 미확인';
    if(!lines.has(line))lines.set(line,new Map());
    const direction=subwayArrivalDirection(row);
    if(!lines.get(line).has(direction))lines.get(line).set(direction,[]);
    lines.get(line).get(direction).push(row);
  }
  return lines;
}
/** Explicit 9-line train types only; missing provider data is never guessed. */
export function nineLineServiceKind(row={}){
  if(row.express===true)return '급행';
  if(row.express===false)return '일반';
  const raw=[row.serviceType,row.trainType,row.routeType,row.trainKind,row.destination,row.route,row.direction]
    .filter(value=>typeof value==='string').join(' ');
  if(/급행|express/i.test(raw))return '급행';
  if(/일반|완행|local/i.test(raw))return '일반';
  return '종별 미확인';
}
/** Keep provider text verbatim while visually separating its final stop note. */
export function splitMetroArrivalText(value=''){
  const raw=String(value||'정보 없음').trim();
  const match=/^(.*?)\s*(\([^()]+\))$/.exec(raw);
  if(match&&match[1].trim())return {primary:match[1].trim(),secondary:match[2]};
  return {primary:raw,secondary:''};
}
function showArrivalsWithProviderStatus(container,place,result){
  const filtered=arrivalsForSelectedMetroLine(place,result.items||[]);
  const state=place.kind==='subway'?result.sourceStatus:'';
  if(!filtered.length){
    container.replaceChildren();
    const message=state==='stale'
      ? '최근 열차정보 갱신이 지연되어 도착예정을 표시하지 않습니다. 아래 시간표 탭에서 계획 운행시각을 확인하세요.'
      : result.emptyMessage||'현재 검증된 도착예정 정보가 없습니다.';
    container.append(el('p',`transport-empty${state==='stale'?' metro-stale-notice':''}`,message));
    if(place.kind==='subway' && !isScheduleMergedStation(place) && ['stale','expired','empty','unverified'].includes(state)){
      const action=el('button','metro-open-schedule','시간표 확인');
      action.type='button';
      action.addEventListener('click',()=>document.getElementById('transport-tab-hours')?.click());
      container.append(action);
    }
    return;
  }
  if(state==='status-only'){
    // The feed contains status reports but no verified ETA. Show one concise
    // explanation and the timetable action; omit the redundant expandable log.
    const notice=el('div','metro-status-summary');
    notice.append(el('strong','','실시간 도착시간 미제공'));
    notice.append(el('span','','최근 열차 상태는 수신했지만 남은 도착시간은 확인할 수 없습니다.'));
    const action=isScheduleMergedStation(place)?null:el('button','metro-open-schedule metro-open-schedule--primary','앱에서 계획 시간표 보기');
    if(action){action.type='button';
    action.addEventListener('click',()=>document.getElementById('transport-tab-hours')?.click());}
    container.replaceChildren(...(action?[notice,action]:[notice]));
    return;
  }
  displayArrivals(container,place.kind,filtered);
}
function displayArrivals(container,kind,items){
  container.replaceChildren();
  if(!items.length){container.append(el('p','transport-empty','현재 제공되는 도착예정 정보가 없습니다.'));return;}
  if(kind!=='subway'){
    for(const row of items){
      const item=el('div','transport-arrival-row');
      if(/운행\s*종료|운행\s*중단|막차\s*종료/.test(String(row.message||'')))item.dataset.dj912Ended='true';
      const left=el('div','transport-arrival-main');
      if(/^\d{5,15}$/.test(String(row.routeId||''))){
        item.dataset.busRouteId=String(row.routeId);
        item.dataset.busRouteName=String(row.route||'버스');
        item.dataset.busRouteType=String(row.routeType||'');
        item.setAttribute('role','button');item.setAttribute('tabindex','0');
        item.setAttribute('aria-label',`${row.route||'버스'}번 노선 지도에 표시`);
        item.setAttribute('aria-pressed','false');
        item.style.cursor='pointer';
      }
      const routeBadge=el('strong','',row.route||row.line||row.direction||'버스');
      routeBadge.dataset.routeType=String(row.routeType||row.routeTy||row.busType||'');
      left.append(routeBadge);
      const direction=String(row.destination||row.direction||'').trim();
      left.append(el('small','',direction&&!/방면$/.test(direction)?`${direction} 방면`:direction));
      const message=String(row.message||'정보 없음').replace(/(\d+)\s*분\s*후/g,'$1분 후');
      item.append(left,el('span','transport-arrival-time',message));
      container.append(item);
    }
    return;
  }
  if(items.some(row=>row.isPlanned)){
    container.append(el('p','metro-planned-notice',items.every(row=>row.isPlanned)
      ?'시간표 예상 도착 · 실시간 지연 미반영':'시간표 기준으로 표시된 열차는 실시간 지연을 반영하지 않습니다.'));
  }
  const groups=groupSubwayArrivals(items);
  const order=['상행','하행','내선','외선','방향 미확인'];
  for(const [line,directions] of groups){
    const section=el('section','metro-arrival-group');
    // When a station has one selected line, the station navigation already
    // identifies it. Do not repeat a second large '1호선' heading above cards.
    if(groups.size>1){
      const heading=el('div','metro-arrival-group-heading');
      if(Object.hasOwn(SUBWAY_LINE_COLORS,line))heading.append(makeLineBadge(line,'metro-panel-badge'));
      heading.append(el('strong','',line));section.append(heading);
    }
    const grid=el('div','metro-direction-grid');
    for(const direction of [...directions.keys()].sort((a,b)=>order.indexOf(a)-order.indexOf(b))){
      const subsection=el('section',`metro-arrival-direction-group ${direction==='상행'?'up':direction==='하행'?'down':''}`.trim());
      const subtitle=el('div',`metro-direction-heading ${direction==='상행'?'up':direction==='하행'?'down':''}`);
      subtitle.append(el('span','metro-direction-arrow',direction==='상행'?'↑':direction==='하행'?'↓':'•'));
      subtitle.append(el('strong','',direction));
      subsection.append(subtitle);
      // 9호선만 일반/급행을 별도 소제목 아래 표시합니다.
      // 종류가 확인되지 않으면 일반열차로 단정하지 않습니다.
      const routeGroups=line==='9호선'
        ?[['일반',[]],['급행',[]],['종별 미확인',[]]]
        :[['',[]]];
      const groupMap=new Map(routeGroups);
      for(const row of directions.get(direction))groupMap.get(line==='9호선'?nineLineServiceKind(row):'').push(row);
      for(const [service,rows] of routeGroups){
        if(!rows.length)continue;
        if(line==='9호선'){
          const typeHeading=el('div',`metro-nine-service-heading${service==='급행'?' express':''}`.trim(),
            service==='급행'?'급행열차':service==='일반'?'일반열차':'열차 종류 미확인');
          subsection.append(typeHeading);
        }
        for(const [idx,row] of rows.entries()){
          const item=el('div',`transport-arrival-row${idx===0?' metro-arrival-next':''}`);
          const left=el('div','transport-arrival-main metro-arrival-main');
          const desc=el('div','metro-arrival-detail');
          const info=formatMetroArrivalCard(row);
          desc.append(el('strong','',info.heading));
          const details=line==='9호선'&&['일반','급행'].includes(service)
            ?info.details?.replace(/\s*\(급행\)/g,'').replace(/\s*·\s*(일반|급행)$/,''):info.details;
          if(details)desc.append(el('small','metro-arrival-route',details));
          left.append(desc);
          const right=el('div','metro-arrival-time-block');
          const timeParts=splitMetroArrivalText(info.arrival);
          right.append(el('strong','metro-arrival-countdown',timeParts.primary));
          if(row.isPlanned){
            const displayPlannedTime=String(row.plannedTime||'');
            right.append(el('small','metro-planned-time-meta',
              `${displayPlannedTime ? `${displayPlannedTime} · ` : ''}시간표 기준`));
          }else if(timeParts.secondary)right.append(el('small','metro-arrival-position',timeParts.secondary));
          item.append(left,right);
          subsection.append(item);
        }
      }
      grid.append(subsection);
    }
    section.append(grid);
    container.append(section);
  }
}
function arrivalRequestKey(place){
  return place.kind==='bus' ? `bus:${place.arsId||`${place.lat},${place.lng}`}` : `subway:${normalizeStationQueryName(place.name)}:${normalizeLineName(place.selectedLine||'all')}`;
}
async function requestArrival(place,{forceRefresh=false}={}){
  const memoKey=arrivalRequestKey(place);
  if(place.kind==='subway'&&stationMetroQuotaUntil>Date.now()&&stationMetroQuotaResult)return stationMetroQuotaResult;
  const saved=arrivalMemo.get(memoKey);
  if(!forceRefresh && saved && Date.now()-saved.at<12000)return saved.value;
  // A repeated tap or polling tick shares the same provider request; force
  // refresh bypasses only the completed cache, never duplicates in-flight I/O.
  return arrivalInFlight.run(memoKey,()=>fetchArrival(place,memoKey));
}
async function fetchArrival(place,memoKey){
  if(!TRANSPORT_API_BASE) return {state:'unconfigured',items:[]};
  const isBus=place.kind==='bus';
  const subwayNames=isBus?[]:subwayStationQueryCandidates(place.name);
  const selectedMetroLine=isBus?'':normalizeLineName(place.selectedLine||'');
  const selectedLineId=selectedMetroLine?seoulSubwayIdForLine(selectedMetroLine):'';
  const params=isBus
    ? [`bus?${new URLSearchParams(place.arsId?{arsId:place.arsId}:{lat:String(place.lat),lng:String(place.lng),name:place.name})}`]
    : subwayNames.map(station=>{
        const search=new URLSearchParams({station});
        if(selectedLineId)search.set('line',selectedMetroLine);
        return `subway?${search}`;
      });
  if(!params.length)return {state:'error',message:'실시간 조회할 역 이름을 확인할 수 없습니다.',items:[]};
  let firstError=null,firstEmpty=null;
  for(let i=0;i<params.length;i++){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),9500);
    try{
      const response=await fetch(`${TRANSPORT_API_BASE}/${params[i]}`,{signal:controller.signal,cache:'no-store'});
      if(!response.ok){
        const body=await response.json().catch(()=>({}));
        const error={state:'error',message:body.error||`도착정보 서버 오류 (${response.status})`,items:[],code:body.code||''};
        if(isBus && error.code==='MISSING_BUS_KEY')error.message='버스 실시간 정보를 제공할 인증키가 없습니다. 로컬 .env 또는 Cloudflare Pages의 SEOUL_BUS_SERVICE_KEY를 확인하세요.';
        if(isBus && error.code==='BUS_API_AUTH')error.message='버스 정보 API 인증 또는 서비스 사용 승인을 확인해야 합니다. 인증키·서비스 권한을 점검하세요.';
        if(isBus && error.code==='BUS_API_RATE_LIMIT')error.message='버스 도착 API 요청 제한에 도달했습니다. 잠시 후 다시 조회해 주세요.';
        if(!isBus&&isMetroDailyQuota(response.status,body))return rememberStationMetroQuota(body,response);
        if(!firstError)firstError=error;
        // 인증키/네트워크 오류는 역명 변경으로 해결되지 않으므로 추가 호출을 하지 않습니다.
        if(response.status>=500 || response.status===401 || response.status===403)break;
        continue;
      }
      const body=await response.json();
      const verifiedBody=isBus?body:guardSubwayProxyArrival(body);
      const result={state:'ok',items:asArray(verifiedBody.items),routes:asArray(verifiedBody.routes),
        arsId:verifiedBody.arsId||'',updatedAt:verifiedBody.updatedAt||'',checkedAt:verifiedBody.checkedAt||'',
        sourceStatus:verifiedBody.sourceStatus||'unverified',sourceAgeSeconds:verifiedBody.sourceAgeSeconds??null,
        sourceTimestamp:verifiedBody.sourceTimestamp||'',
        emptyMessage:verifiedBody.emptyMessage||'',stationQuery:isBus?'':subwayNames[i]};
      if(isBus || result.items.length){
        arrivalMemo.set(memoKey,{at:Date.now(),value:result});
        return result;
      }
      // An empty response can be due to late-night service termination or
      // stale source rows; preserve the server's explicit reason.
      const rank={ 'status-only':5,'expired':4,'stale':3,'unverified':2,'empty':1 };
      if(!firstEmpty || (rank[result.sourceStatus]||0)>(rank[firstEmpty.sourceStatus]||0))firstEmpty=result;
    }catch(error){
      if(!firstError)firstError={state:'error',message:'도착정보 중계 서버에 연결할 수 없습니다.',items:[]};
      // 서버 접속이 실패한 경우 다른 역명으로 반복 요청해도 도움이 되지 않습니다.
      break;
    }finally{clearTimeout(timer);}
  }
  // Compare with the provider's documented ALL feed only after individual
  // names have failed. Bulk rows must match this exact station and line on
  // the server; the browser still verifies source recptnDt independently.
  if(!isBus && permitsSubwayBulkRecovery(place.name,selectedLineId||'1007') && firstEmpty){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),8000);
    try{
      const q=new URLSearchParams({station:normalizeStationQueryName(place.name),mode:'bulk',line:selectedMetroLine||'7호선'});
      const response=await fetch(`${TRANSPORT_API_BASE}/subway?${q}`,{signal:controller.signal,cache:'no-store'});
      const body=await response.json().catch(()=>({}));
      if(isMetroDailyQuota(response.status,body))return rememberStationMetroQuota(body,response);
      if(response.ok){
        const value=guardSubwayProxyArrival(body);
        if(asArray(value.items).length){
          const result={state:'ok',items:value.items,routes:[],updatedAt:value.updatedAt||'',
            checkedAt:value.checkedAt||'',sourceStatus:value.sourceStatus||'unverified',
            sourceTimestamp:value.sourceTimestamp||'',sourceAgeSeconds:value.sourceAgeSeconds??null,
            stationQuery:normalizeStationQueryName(place.name),sourceMode:'bulk-verified'};
          arrivalMemo.set(memoKey,{at:Date.now(),value:result});
          return result;
        }
      }
    }catch{ /* A bulk outage must not overwrite the original station result. */ }
    finally{clearTimeout(timer);}
  }
  if(firstEmpty){
    if(selectedMetroLine==='신림선' && firstEmpty.sourceStatus==='empty'){
      firstEmpty.emptyMessage='신림선의 검증된 실시간 도착정보가 서울시 API에서 확인되지 않습니다. 열차 도착시간을 임의로 표시하지 않으며, 시간표 탭에서 제공 여부를 확인하거나 운영기관 안내를 참고하세요.';
    }
    const value={...firstEmpty,emptyMessage:firstEmpty.emptyMessage||(
      subwayNames.length>1
        ? `${subwayNames.map(x=>`‘${x}’`).join('·')}로 조회했지만 현재 도착정보가 없습니다. 서울시 데이터 제공 상태를 확인해 주세요.`
        : '현재 서울시 API에 해당 역의 도착정보가 없습니다.')};
    arrivalMemo.set(memoKey,{at:Date.now(),value});
    return value;
  }
  return firstError||{state:'error',message:'실시간 도착정보 조회에 실패했습니다.',items:[]};
}
function registerBusStopPictogram(map){
  if(map.hasImage?.('dj-bus-blue-marker'))return true;
  if(typeof document==='undefined')return false;
  const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;
  const ctx=canvas.getContext?.('2d');if(!ctx)return false;
  // Familiar square blue stop sign with a white front-view bus, used by every
  // confirmed city stop. Do not replace real stop coordinates with illustrations.
  ctx.fillStyle='#ffffff';ctx.beginPath();ctx.roundRect(5,5,54,54,12);ctx.fill();
  ctx.fillStyle='#287cc7';ctx.beginPath();ctx.roundRect(8,8,48,48,9);ctx.fill();
  ctx.fillStyle='#ffffff';ctx.beginPath();ctx.roundRect(17,13,30,34,6);ctx.fill();
  ctx.fillStyle='#287cc7';ctx.beginPath();ctx.roundRect(21,17,22,15,2);ctx.fill();
  ctx.fillStyle='#287cc7';ctx.fillRect(24,35,16,3);
  ctx.fillStyle='#ffffff';ctx.fillRect(22,46,5,5);ctx.fillRect(37,46,5,5);
  ctx.fillStyle='#287cc7';ctx.beginPath();ctx.arc(23,42,2.8,0,Math.PI*2);ctx.arc(41,42,2.8,0,Math.PI*2);ctx.fill();
  try{map.addImage('dj-bus-blue-marker',{width:64,height:64,data:ctx.getImageData(0,0,64,64).data});return true;}
  catch(error){console.debug('[버스 픽토그램] 등록 실패',error);return false;}
}
/** Hide only the bus pictogram embedded in OpenFreeMap POI tiles.
 * The unified GeoJSON layer below draws the same blue sign for OSM and Seoul
 * official stops. Other base-map POIs and transit lines are untouched. */
export function suppressNativeBusStopGlyphs(map){
  const busFilter=['any',
    ['==',['get','class'],'bus'],
    ['==',['get','subclass'],'bus_stop'],
    ['==',['get','subclass'],'bus_station']];
  let adjusted=0;
  for(const layer of map.getStyle?.()?.layers||[]){
    if(layer.type!=='symbol'||layer['source-layer']!=='poi'||layer.id==='dj-basemap-bus-pictogram')continue;
    try{
      const original=map.getPaintProperty(layer.id,'icon-opacity');
      const kept=(typeof original==='number'||Array.isArray(original))?original:1;
      map.setPaintProperty(layer.id,'icon-opacity',['case',busFilter,0,kept]);
      // Hide the base-map's duplicate stop name; custom GeoJSON uses Korean names.
      const originalText=map.getPaintProperty(layer.id,'text-opacity');
      const textKept=(typeof originalText==='number'||Array.isArray(originalText))?originalText:1;
      map.setPaintProperty(layer.id,'text-opacity',['case',busFilter,0,textKept]);
      adjusted++;
    }catch(error){console.debug('[정류장 원본 심벌] 조정 불가',layer.id,error);}
  }
  return adjusted;
}

/**
 * Tile-native safety net: draw the SAME blue sign from the basemap's `poi`
 * source, not from the asynchronously populated official bus-stop GeoJSON.
 * Without this layer, suppressing native POI icons makes every stop vanish
 * whenever Seoul's stops endpoint or a source-feature scan is unavailable.
 * Insert below official symbols so they win priority over overlapping tiles.
 */
export function installBasemapBusStopFallback(map,districtGeometry=null){
  const id='dj-basemap-bus-pictogram';
  if(map.getLayer?.(id))return true;
  if(!map.hasImage?.('dj-bus-blue-marker'))return false;
  const poi=map.getStyle?.()?.layers?.find(layer=>layer.id==='poi_transit'&&layer.type==='symbol'&&layer['source-layer']==='poi'&&layer.source)
    ||map.getStyle?.()?.layers?.find(layer=>layer.type==='symbol'&&layer['source-layer']==='poi'&&layer.source);
  if(!poi)return false;
  try{
    const layer={id,type:'symbol',source:poi.source,'source-layer':'poi',minzoom:16.4,
      filter:busFilterInsideDistrict(
        ['any',['==',['get','class'],'bus'],['==',['get','subclass'],'bus_stop'],['==',['get','subclass'],'bus_station']],
        districtGeometry),
      layout:{'icon-image':'dj-bus-blue-marker',
        'icon-size':['interpolate',['linear'],['zoom'],16.4,0.262,18.2,0.331,20,0.393],
        'icon-allow-overlap':true,'icon-ignore-placement':true,'icon-padding':1,
        'text-field':['step',['zoom'],'',18.4,['coalesce',['get','name:nonlatin'],['get','name:ko'],['get','name_ko'],['get','name'],'']],
        'text-font':['Noto Sans Regular','Open Sans Regular'],'text-size':['interpolate',['linear'],['zoom'],18.4,10.2,20,12.1],
        'text-anchor':'top','text-offset':[0,1.85],'text-max-width':13,
        'text-allow-overlap':false,'text-ignore-placement':false,'text-optional':true,
        'text-pitch-alignment':'viewport','text-rotation-alignment':'viewport',
        'icon-pitch-alignment':'viewport','icon-rotation-alignment':'viewport'},
      paint:{'icon-opacity':1,'text-color':busStopLabelPalette(typeof document!=='undefined'?document.documentElement?.dataset?.theme:'light').text,
        'text-halo-color':busStopLabelPalette(typeof document!=='undefined'?document.documentElement?.dataset?.theme:'light').halo,'text-halo-width':1.05}};
    const before=map.getLayer?.('dj-transport-bus-pictogram')?'dj-transport-bus-pictogram':undefined;
    map.addLayer(layer,before);
    return true;
  }catch(error){console.warn('[정류장 타일 예비 아이콘] 레이어 설치 실패',error);return false;}
}

const BUS_NAME_FILTERS=Object.freeze({
  'transport-bus-names':['all',['!=',['get','label'],'정류장명 미등록'],['!=',['get','label'],'이름 미등록']],
  'transport-bus-names-close':['all',['!=',['get','label'],'정류장명 미등록'],['!=',['get','label'],'이름 미등록'],['!=',['get','label'],'']],
  'dongjak-zoom-busstop-names':['all',['any',
    ['in',['get','class'],['literal',['bus','bus_stop','bus_station']]],
    ['in',['get','subclass'],['literal',['bus_stop','bus_station']]]],
    ['!=',['coalesce',['get','name:nonlatin'],['get','name:ko'],['get','name_ko'],['get','name'],''],'']]
});
function circlePolygonAround(lng,lat,radiusMeters,points=20){
  const ring=[];const latRad=lat*Math.PI/180;
  const dLat=radiusMeters/111320;
  const dLng=radiusMeters/(111320*Math.max(Math.cos(latRad),0.25));
  for(let i=0;i<=points;i++){
    const a=i/points*Math.PI*2;
    ring.push([lng+Math.cos(a)*dLng,lat+Math.sin(a)*dLat]);
  }
  return {type:'Polygon',coordinates:[ring]};
}
function syncNearbyBusStopNameFilters(map){
  if(!map?.getCenter||!map?.setFilter)return;
  const zoom=Number(map.getZoom?.()||0);
  const center=map.getCenter();
  const radius=zoom>=19.2?180:zoom>=18.4?250:zoom>=17.75?320:0;
  const nearby=radius&&Number.isFinite(center?.lng)&&Number.isFinite(center?.lat)
    ? ['within',circlePolygonAround(center.lng,center.lat,radius)] : null;
  for(const [layerId,base] of Object.entries(BUS_NAME_FILTERS)){
    if(!map.getLayer?.(layerId))continue;
    const next=nearby?['all',base,nearby]:base;
    try{if(JSON.stringify(map.getFilter?.(layerId))!==JSON.stringify(next))map.setFilter(layerId,next);}catch(error){console.debug('[버스정류장명] 근접 필터 조정 실패',layerId,error?.message);}
  }
}

function labelVisibility(map){
  // 줌이 낮을 때 버스정류장명까지 전부 그리면 지도가 지나치게 복잡해집니다.
  // 지하철 역명은 13배율부터, 버스정류장명은 15.3배율부터 보입니다.
  const layers=[
    {id:'transport-bus-stop',type:'circle',source:'transport-bus',minzoom:16.4,
      // A fully transparent hit area keeps stop click handlers working.
      // Never render a second, different-sized circle under the bus icon.
      paint:{'circle-radius':['interpolate',['linear'],['zoom'],16.4,8,18.5,10],
        'circle-color':'#2579c6','circle-opacity':0,
        'circle-stroke-opacity':0}},
    {id:'transport-subway-station-shadow',type:'circle',source:'transport-subway',minzoom:11.1,
      paint:{'circle-radius':['interpolate',['linear'],['zoom'],11.1,8,16,11], 'circle-color':'#ffffff','circle-stroke-color':'rgba(30,56,42,0.14)','circle-stroke-width':1.2,'circle-opacity':0.98}},
    {id:'transport-subway-station',type:'circle',source:'transport-subway',minzoom:11.1,
      paint:{
        'circle-radius':['interpolate',['linear'],['zoom'],11.1,5.8,16,8],
        'circle-color':['coalesce',['get','lineColor'], DEFAULT_SUBWAY_LINE_COLOR],
        'circle-stroke-color':['case',['>', ['get','lineCount'],1], ['coalesce',['get','lineStrokeColor'], DEFAULT_SUBWAY_LINE_COLOR], '#ffffff'],
        'circle-stroke-width':['case',['>', ['get','lineCount'],1],2.8,1.9]
      }},
    // 역 아이콘이 기존 지도의 심벌과 겹쳐 사라지는 문제를 줄이기 위해 독립 M 마커를 최상단에 표시합니다.
    {id:'transport-subway-glyph',type:'symbol',source:'transport-subway',minzoom:11.1,
      layout:{'text-field':'M','text-font':['Open Sans Regular'],'text-size':['interpolate',['linear'],['zoom'],11.1,10,16,12],
        'text-pitch-alignment':'viewport','text-rotation-alignment':'viewport','text-allow-overlap':true},
      paint:{'text-color':'#ffffff','text-halo-color':'rgba(0,0,0,0.2)','text-halo-width':0.5}},
    {id:'transport-subway-names',type:'symbol',source:'transport-subway',minzoom:11.6,
      layout:{'text-field':['get','name'],'text-font':['Noto Sans Bold','Noto Sans Regular','Open Sans Semibold','Open Sans Regular'],'text-size':['interpolate',['linear'],['zoom'],11.6,12.5,16,14.5],'text-offset':[0,1.35],'text-optional':true},
      paint:{'text-color':['coalesce',['get','lineColor'],DEFAULT_SUBWAY_LINE_COLOR],'text-halo-color':'rgba(255,255,255,0.98)','text-halo-width':2.1}},
    {id:'transport-bus-names',type:'symbol',source:'transport-bus',minzoom:17.75,maxzoom:18.4,
      filter:['all',['!=',['get','label'],'정류장명 미등록'],['!=',['get','label'],'이름 미등록']],
      layout:{'text-field':['get','label'],'text-font':['Noto Sans Regular','Open Sans Regular'],
        'text-size':['interpolate',['linear'],['zoom'],17.75,10.0,19,11.5],
        'text-offset':[0,1.85],'text-max-width':18,'text-optional':true,
        'text-anchor':'top',
        'text-allow-overlap':false,'text-ignore-placement':false,'text-padding':2},
      paint:{'text-color':'#18508e','text-halo-color':'#fff','text-halo-width':1.05}},
    // Once a user zooms in to street level, prioritize actual bus-stop names over
    // background label collisions. Only supplied OSM/Seoul names can appear.
    {id:'transport-bus-names-close',type:'symbol',source:'transport-bus',minzoom:18.4,
      filter:['all',['!=',['get','label'],'정류장명 미등록'],['!=',['get','label'],'이름 미등록'],
        ['!=',['get','label'],'']],
      layout:{'text-field':['get','label'],'text-font':['Noto Sans Regular','Open Sans Regular'],
        'text-size':['interpolate',['linear'],['zoom'],18.4,10.7,20,12.2],
        'text-offset':[0,1.85],'text-anchor':'top','text-max-width':14,
        'text-allow-overlap':false,'text-ignore-placement':false,'text-optional':true,
        'text-pitch-alignment':'viewport','text-rotation-alignment':'viewport'},
      paint:{'text-color':'#18508e','text-halo-color':'rgba(255,255,255,0.97)','text-halo-width':1.05}}
  ];
  for(const layer of layers){try{map.addLayer(layer);}catch(e){console.warn('교통 레이어 오류',layer.id,e);}}
  if(registerBusStopPictogram(map)){
    // OSM base-map stop coordinates remain available through querySourceFeatures.
    // Display each stop with this one consistent blue pictogram, not native icons.
    try{map.addLayer({id:'dj-transport-bus-pictogram',type:'symbol',source:'transport-bus',minzoom:16.4,
      layout:{'icon-image':'dj-bus-blue-marker',
        'icon-size':['interpolate',['linear'],['zoom'],16.4,0.262,18.2,0.331,20,0.393],
        'icon-allow-overlap':true,'icon-ignore-placement':true,'icon-pitch-alignment':'viewport',
        'icon-rotation-alignment':'viewport'}});}
    catch(e){console.info('[버스정류장 아이콘] 새 레이어 추가 실패',e);}
  }
  // Keep bus pictogram size and label clearance identical across all viewports.
  const syncSharedBusPresentation=()=>{
    try{
      if(map.getLayer?.('dj-transport-bus-pictogram'))map.setLayoutProperty('dj-transport-bus-pictogram','icon-size',
        ['interpolate',['linear'],['zoom'],16.4,0.262,18.2,0.331,20,0.393]);
      if(map.getLayer?.('transport-bus-names'))map.setLayoutProperty('transport-bus-names','text-offset',[0,1.85]);
      if(map.getLayer?.('transport-bus-names-close'))map.setLayoutProperty('transport-bus-names-close','text-offset',[0,1.85]);
    }catch(error){console.debug('[버스정류장 공통 표시 간격]',error?.message);}
  };
  syncSharedBusPresentation();
}

export function initTransportMap({map,maplibregl,isDongjak,isNearBoundary=()=>false,boundaryGeometry=null,
  getDistrictGeometry=()=>boundaryGeometry,onOpen,onClose,canOpen,
  canPickRoute=()=>false,onRoutePick=()=>{},onRouteSelect=()=>{}}){
  const panel=document.getElementById('transport-sheet');
  // Account-ready bookmarks for bus stops and metro stations. Keep v8.25
  // selection pin, directional arrival data, line switch and camera motion.
  const actionsRow=panel?.querySelector?.('.transport-selection-actions');
  const transportBookmark=actionsRow?document.createElement('button'):null;
  const transportShare=actionsRow?document.createElement('button'):null;
  const transportFolder=actionsRow?document.createElement('select'):null;
  if(transportBookmark&&transportShare&&transportFolder){
    transportBookmark.type='button';transportBookmark.id='transport-save-place';
    transportBookmark.textContent='☆ 즐겨찾기';transportBookmark.setAttribute('aria-label','교통 장소 즐겨찾기');
    transportShare.type='button';transportShare.id='transport-share-place';
    transportShare.className='dj-news-transport-share';
    transportShare.setAttribute('aria-label','교통 장소 공유');transportShare.title='교통 장소 공유';
    transportShare.innerHTML='<svg data-dj-transport-icon="share" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.7 10.7 6.6-4.4m-6.6 7.4 6.6 4.4"/></svg>';
    transportShare.addEventListener('click',()=>{
      if(!selected)return;
      const place=favoritePlace(selected);
      const url=placeShareUrl(place);
      if(url)void shareMapUrl(url,`${selected.name||'대중교통 시설'} · 동작지도`);
    });
    transportFolder.id='transport-save-folder';
    transportFolder.disabled=true;
    transportFolder.setAttribute('aria-label','교통 장소 저장 그룹');
    const favoritesRow=document.createElement('div');
    favoritesRow.className='dj824-transport-favorites';
    favoritesRow.append(transportBookmark,transportShare,transportFolder);
    actionsRow.after(favoritesRow);
  }
  const sourceStatus=document.getElementById('transport-source-status');
  const title=document.getElementById('transport-title');
  const kindEl=document.getElementById('transport-kind');
  const description=document.getElementById('transport-description');
  const chips=document.getElementById('transport-chips');
  const linesEl=document.getElementById('transport-lines');
  const neighborsEl=document.getElementById('transport-neighbors');
  const arrivalsEl=document.getElementById('transport-arrivals');
  const liveTab=document.getElementById('transport-tab-live');
  const hoursTab=document.getElementById('transport-tab-hours');
  const modeTabs=document.getElementById('transport-mode-tabs');
  const sectionLive=document.querySelector?.('.transport-arrivals-title');
  const sectionHours=document.getElementById('transport-service-hours');
  // Keep a user's tab choice while they compare nearby stations. A new page
  // session still starts in realtime mode; nothing silently claims schedule = live.
  let preferredTransportView='live';
  function syncTimetableTabVisibility(place){
    const merged=isScheduleMergedStation(place);
    if(panel.dataset)panel.dataset.scheduleMerged=String(merged);
    if(hoursTab)hoursTab.hidden=merged;
    if(modeTabs)modeTabs.hidden=merged;
    if(liveTab)liveTab.textContent=merged?'도착예정':'실시간';
    return merged;
  }
  function selectTransportMode(mode,{remember=false}={}){
    const view=mode==='hours'&&!isScheduleMergedStation(selected)?'hours':'live';
    if(remember)preferredTransportView=view;
    if(panel.dataset)panel.dataset.transportView=view;
    liveTab?.setAttribute?.('aria-pressed',String(view==='live'));
    hoursTab?.setAttribute?.('aria-pressed',String(view==='hours'));
    liveTab?.setAttribute?.('aria-selected',String(view==='live'));
    hoursTab?.setAttribute?.('aria-selected',String(view==='hours'));
    if(view==='hours'){
      // A true separate tab, not a scroll link into the realtime section.
      timetableExpanded=true;
      if(visibleServiceHours)renderServiceHours(visibleServiceHours);
    }
    // The station title remains visible when changing tabs on small screens.
    const viewport=panel.querySelector?.('.dj875-transit-scroll')||panel;
    if(typeof viewport.scrollTo==='function')viewport.scrollTo({top:0,behavior:'smooth'});
  }
  liveTab?.addEventListener('click',()=>selectTransportMode('live',{remember:true}));
  hoursTab?.addEventListener('click',()=>selectTransportMode('hours',{remember:true}));

  const updatedEl=document.getElementById('transport-update-time');
  const serviceHoursEl=document.getElementById('transport-service-hours');
  let officialMetro=fixedMetroStations(),osmTransport=[];
  const allStationByName=new Map();
  let stops=new Map();
  let selected=null;
  const routeStatus=el('div','transport-empty');
  routeStatus.hidden=true;routeStatus.setAttribute('role','status');
  arrivalsEl.before?.(routeStatus);
  const clearRouteButton=el('button','metro-open-schedule dj-bus-route-clear','노선 표시 해제');
  clearRouteButton.type='button';
  arrivalsEl.before?.(clearRouteButton);clearRouteButton.hidden=true;
  const mapClearRouteButton=el('button','dj-bus-route-clear dj-bus-route-map-clear','노선 표시 해제');
  mapClearRouteButton.id='dj-bus-route-map-clear';mapClearRouteButton.type='button';mapClearRouteButton.hidden=true;
  document.getElementById('app')?.append(mapClearRouteButton);
  let routePresentation=null;
  function syncRouteClearDock(){
    if(mapClearRouteButton.hidden||document.getElementById('app')?.dataset.tab!=='map')return;
    const shown=node=>{
      const rect=node?.getBoundingClientRect?.();
      const style=node&&getComputedStyle(node);
      return Boolean(node&&!node.hidden&&rect?.height>0&&rect?.width>0&&style?.display!=='none'&&style?.visibility!=='hidden');
    };
    const preview=panel.dataset.djBusRoutePreview==='true'&&shown(panel);
    const blockers=[document.getElementById('bottom-nav'),document.getElementById('dj840-map-tip'),preview?panel:null].filter(shown);
    const edge=Math.min(globalThis.innerHeight||800,...blockers.map(n=>n.getBoundingClientRect().top));
    const upper=Math.max(80,...[document.querySelector('.topbar'),document.getElementById('dj-v794-toolbar')].filter(shown).map(n=>n.getBoundingClientRect().bottom+8));
    const top=Math.max(upper,Math.round(edge-Math.max(34,mapClearRouteButton.getBoundingClientRect()?.height||36)-12));
    mapClearRouteButton.style.setProperty('top',top+'px','important');
    mapClearRouteButton.style.setProperty('bottom','auto','important');
  }
  function scheduleRouteClearDock(){
    if(typeof requestAnimationFrame==='function')requestAnimationFrame(syncRouteClearDock);
    else syncRouteClearDock();
  }
  function syncRoutePresentation(){
    const state=routePresentation;
    const busSheet=selected?.kind==='bus'&&!panel.hidden;
    const preview=busSheet&&panel.dataset.djBusRoutePreview==='true';
    routeStatus.hidden=!state||!busSheet||preview;
    clearRouteButton.hidden=!state||state.status==='error'||!busSheet||preview;
    mapClearRouteButton.hidden=!state||state.status==='error';
    if(state&&state.status!=='error'){
      const status=state.vehicleStatus==='live'?'버스 '+state.vehicleCount+'대 · ':state.vehicleStatus==='error'?'위치 조회 실패 · ':state.vehicleStatus==='empty'?'운행 위치 없음 · ':'';
      mapClearRouteButton.textContent=state.route+'번 · '+status+'해제 ×';
      mapClearRouteButton.title=state.status==='shown'&&!state.stopCount?'공식 경유 정류소 조회 불가':'확대하면 경유 정류소 표시';
      mapClearRouteButton.setAttribute('aria-label',state.route+'번 버스 노선 표시 해제');
    }
    scheduleRouteClearDock();
  }
  globalThis.addEventListener?.('resize',scheduleRouteClearDock,{passive:true});
  if(typeof ResizeObserver!=='undefined'){
    const routeDockObserver=new ResizeObserver(scheduleRouteClearDock);
    for(const node of [panel,document.getElementById('bottom-nav'),document.getElementById('dj840-map-tip')])if(node)routeDockObserver.observe(node);
  }
  function syncRouteRows(){
    const active=busRouteOverlay.getActive();
    for(const row of (arrivalsEl.querySelectorAll?.('[data-bus-route-id]')||[])){
      const chosen=active?.id===row.dataset.busRouteId;
      row.setAttribute('aria-pressed',String(chosen));
      row.style.removeProperty('outline');row.style.removeProperty('outline-offset');
      row.style.setProperty('--dj-bus-selected-color',busRouteColor(row.dataset.busRouteType));
    }
  }
  const busRouteOverlay=createBusRouteOverlay({map,apiBase:TRANSPORT_API_BASE,vehicleFetcher:globalThis.fetch,onState:state=>{
    routePresentation=state;syncRoutePresentation();
    if(state?.status==='shown'&&panel.dataset.djBusRoutePreview==='true'&&!panel.hidden){
      requestAnimationFrame(()=>{
        if(panel.hidden||panel.dataset.djBusRoutePreview!=='true'||busRouteOverlay.getActive()?.id!==state.id)return;
        const coordinates=busRouteOverlay.getRouteCoordinates();
        if(!Array.isArray(coordinates)||coordinates.length<2)return;
        const xs=coordinates.map(p=>p[0]),ys=coordinates.map(p=>p[1]);
        const covered=Math.max(170,(globalThis.innerHeight||800)-(panel.getBoundingClientRect()?.top||500)+12);
        map.fitBounds?.([[Math.min(...xs),Math.min(...ys)],[Math.max(...xs),Math.max(...ys)]],{padding:{top:210,bottom:covered,right:32,left:32},maxZoom:15.5,duration:600});
        scheduleRouteClearDock();
      });
    }
    routeStatus.textContent=!state?'':state.status==='loading'?`${state.route}번 노선 불러오는 중`:state.status==='shown'?`${state.route}번 노선 · ${state.stopCount?`경유 정류소 ${state.stopCount}개 · 확대하면 표시`:'지도 표시 중 · 경유 정류소 조회 불가'}`:`${state.route}번 노선 · ${({ROUTE_PATH_AUTH:'노선 API 이용 권한 미확인',MISSING_BUS_KEY:'노선 API 설정 필요',ROUTE_PATH_RATE_LIMIT:'API 호출 한도 초과',ROUTE_PATH_UNAVAILABLE:'공식 경로 데이터 없음',ROUTE_PATH_FORMAT:'공식 좌표 형식 오류'})[state.code]||'노선 서버 연결 실패'} · 다시 눌러 재시도`;
    syncRouteRows();
  }});
  const clearSelectedBusRoute=()=>{busRouteOverlay.clear();delete panel.dataset.djBusRoutePreview;syncRoutePresentation();};
  clearRouteButton.addEventListener('click',clearSelectedBusRoute);
  mapClearRouteButton.addEventListener('click',event=>{event.stopPropagation();clearSelectedBusRoute();});
  function activateBusRoute(event){
    const row=event.target?.closest?.('[data-bus-route-id]');
    if(!row||!arrivalsEl.contains(row)||panel.hidden||selected?.kind!=='bus')return;
    if(event.type==='keydown'&&!['Enter',' '].includes(event.key))return;
    event.preventDefault();event.stopPropagation();
    if(globalThis.matchMedia?.('(max-width:699px)')?.matches){
      panel.dataset.djBusRoutePreview='true';
      if(panel.classList.contains('dj871-sheet-expanded'))setMobileSheetExpanded(panel,false,document,globalThis.window);
      panel.querySelector('.dj875-transit-scroll')?.scrollTo?.({top:0,behavior:'instant'});
    }
    syncRoutePresentation();
    void busRouteOverlay.select({routeId:row.dataset.busRouteId,route:row.dataset.busRouteName,routeType:row.dataset.busRouteType});
  }
  arrivalsEl.addEventListener('click',activateBusRoute);
  arrivalsEl.addEventListener('keydown',activateBusRoute);
  if(typeof MutationObserver==='function')new MutationObserver(syncRouteRows).observe(arrivalsEl,{childList:true,subtree:true});
  let selectionMarker=null;
  let seq=0;
  const favoritePlace=raw=>raw?{
    name:String(raw.name||'').trim(),lng:Number(raw.lng),lat:Number(raw.lat),
    kind:raw.kind==='bus'?'bus':'subway',
    category:raw.kind==='bus'?'버스정류장':'지하철역',
    arsId:raw.arsId||'',direction:raw.direction||'',median:raw.median===true,
    selectedLine:raw.selectedLine||'',lines:raw.lines||[]
  }:null;
  function updateTransportFavorite(){
    if(!selected||!transportBookmark||!transportFolder)return;
    const record=favoritePlace(selected);
    const id=placeKey(record);
    const saved=id?savedPlaces().find(p=>placeKey(p)===id):null;
    transportBookmark.disabled=!id;
    transportBookmark.dataset.djSaved=String(Boolean(saved));
    transportBookmark.setAttribute('aria-pressed',String(Boolean(saved)));
    transportBookmark.setAttribute('aria-label',saved?'즐겨찾기 해제':'즐겨찾기 추가');
    if(!transportBookmark.querySelector('svg'))transportBookmark.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/></svg>';
    transportFolder.replaceChildren();
    for(const folder of getPlaceFolders()){
      const option=document.createElement('option');option.value=folder;option.textContent=folder;
      transportFolder.append(option);
    }
    transportFolder.value=saved?.folder||'즐겨찾기';
    transportFolder.disabled=!saved;
  }
  transportBookmark?.addEventListener('click',()=>{
    if(!selected)return;
    const result=toggleSavedPlace(favoritePlace(selected));
    if(result.ok)updateTransportFavorite();
  });
  transportFolder?.addEventListener('change',()=>{
    if(!selected)return;
    setSavedPlaceFolder(favoritePlace(selected),transportFolder.value);
  });
  if(typeof window!=='undefined')window.addEventListener('dongjak:saved-places-change',updateTransportFavorite);
  if(typeof window!=='undefined')window.addEventListener('dongjak:open-saved-transport',event=>{
    const p=event.detail?.place;
    if(!p||!['bus','subway'].includes(p.kind)||!placeKey(p))return;
    // Opening a bookmarked transport place must use the v8.25 live sheet.
    void open({...p,kind:p.kind,lines:Array.isArray(p.lines)?p.lines:[]});
  });
  // The transport window has ONE open/close authority. Other UI modules
  // request dismissal; they must never simulate a second button click.
  const windowState=createTransportWindowLifecycle();
  const close=(restore=true)=>{
    const wasVisible=!panel.hidden;
    if(wasVisible)markAiSurfaceDismissal();
    windowState.dismiss();
    panel.hidden=true;selected=null;delete panel.dataset.djBusRoutePreview;seq++;syncRoutePresentation();
    selectionMarker?.remove?.();selectionMarker=null;
    document.getElementById('app')?.classList?.remove?.('transport-sheet-open');
    if(wasVisible&&restore)onClose();
  };
  closeActivePanel=close;
  const closeButton=document.getElementById('transport-close');
  closeButton.addEventListener('click',event=>{
    // The close action is fully processed before the browser can deliver
    // an additional click to the map under the disappearing bottom sheet.
    event?.stopPropagation?.();
    markAiSurfaceDismissal();
    document.dispatchEvent?.(new CustomEvent('dongjak:transport-dismiss-start'));
    // A newly selected station/stop may reopen before the old close fade
    // finishes. The old completion must never dismiss the new selection.
    const closingSequence=seq;
    if(globalThis.window?.DongjakWindowMotion){
      globalThis.window.DongjakWindowMotion.close(panel,()=>{
        if(seq===closingSequence)close(true);
      });
    }else close(true);
  });
  // Stop the entire touch sequence at its real target, not just its
  // synthesized click. Keep native button semantics and accessibility.
  for(const eventType of ['pointerdown','pointerup','touchstart','touchend']){
    closeButton.addEventListener(eventType,event=>event.stopPropagation(),{passive:true});
  }
  // All other callers (home, another sheet, a swipe gesture) use the same
  // method. The event never bubbles and never re-triggers a click handler.
  panel.addEventListener('dongjak:transport-dismiss',()=>close(true));
  document.getElementById('transport-refresh').addEventListener('click',()=>selected&&open(selected,true));
  for(const [buttonId,which] of [['transport-use-start','start'],['transport-use-end','end']]){
    document.getElementById(buttonId).addEventListener('click',()=>{
      if(!selected)return;
      const place={...selected};
      close(false);
      onRouteSelect(which,place);
    });
  }
  map.addSource('transport-bus',{type:'geojson',data:featureCollection([])});
  map.addSource('transport-subway',{type:'geojson',data:featureCollection([])});
  // OSM 실제 철도 선로/승강장 공간정보. 선로의 호선을 확인하지 못하면 임의로 색을 배정하지 않습니다.
  map.addSource('transport-rail-tracks',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
  map.addSource('transport-rail-platforms',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
  const localRailGeometry=fixedRailCollection(boundaryGeometry);
  let renderedRailPaths=indexRenderedMetroRail(localRailGeometry);
  let lastMetroMarkerItems=[];
  map.addSource('transport-schematic-connections',{type:'geojson',data:localRailGeometry});
  setDisplayedRailPaths(map,renderedRailPaths);
  // 실제 노선 공간정보(행안부 2026) 우선: 도로·하천의 실제 굴곡과 교차점을 보존합니다.
  // 공식 API에 없는 신림선 또는 조회 실패한 호선은 오프라인 안내용 선형을 유지합니다.
  // 외부 자료를 기다리느라 기존 지도를 중단하지 않습니다.
  if(typeof window!=='undefined' && /^https?:$/.test(window.location?.protocol||'')){
    void fetchOfficialRailPaths().then(paths=>{
      const result=mergeOfficialRail(localRailGeometry,paths);
      if(!result.lines.length)return;
      const source=map.getSource('transport-schematic-connections');
      if(!source)return;
      source.setData(result.collection);
      // Keep station badges anchored to the actual displayed official curves.
      renderedRailPaths=indexRenderedMetroRail(result.collection);
      setDisplayedRailPaths(map,renderedRailPaths);
      if(lastMetroMarkerItems.length)renderMetroMarkers(lastMetroMarkerItems);
      const dataSources=[...new Set(result.collection.features.filter(f=>!f.properties?.schematic).map(f=>f.properties?.source).filter(Boolean))];
       console.info('[지하철 노선] 실제 지형 선형 적용:',result.lines.map(k=>k==='신림'?'신림선':`${k}호선`).join(', '),'출처:',dataSources.join(', '));
       window.dispatchEvent(new CustomEvent('dj:rail-geometry-loaded',{detail:{lines:result.lines,sources:dataSources}}));
    }).catch(error=>{
      console.info('[지하철 노선] 공공 GIS 조회 실패, 기존 안내선형 유지:',error?.message||error);
    });
  }
  map.addSource('transport-actual-connections',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
  const firstLabel=map.getStyle().layers.find(l=>l.type==='symbol')?.id;
  // 전체 동작구를 볼 때는 역보다 노선이 우선 보이도록 선형을 더 진하게 표시합니다.
  // 실제 철도/터널 선형과 혼동되지 않도록 역 기반 개략 노선임을 명시합니다.
  // 수작업 고정 노선은 모든 확대 단계에 유지합니다. 구 경계 바깥 3.1km까지 페이드.
  // line-opacity는 피처의 거리별 opacity이며, 렌더링 중 서버를 호출하지 않습니다.
  map.addLayer({id:'transport-schematic-subway-casing',type:'line',source:'transport-schematic-connections',
    minzoom:METRO_MARKER_MIN_ZOOM,maxzoom:20,layout:{'line-cap':'round','line-join':'round'},
    paint:{'line-color':'#ffffff','line-width':['interpolate',['linear'],['zoom'],10.2,4.4,13,6.2,17,5.2],
      'line-opacity':['*',['get','opacity'],0.68],
      'line-blur':['interpolate',['linear'],['get','opacity'],0.0,1.1,0.18,0.7,0.45,0.32,1.0,0.12]}});
  map.addLayer({id:'transport-schematic-subway',type:'line',source:'transport-schematic-connections',
    minzoom:METRO_MARKER_MIN_ZOOM,maxzoom:20,layout:{'line-cap':'round','line-join':'round'},
    paint:{'line-color':['get','color'],
      'line-width':['interpolate',['linear'],['zoom'],10.2,2.9,13,4.3,17,3.8],
      'line-opacity':['get','opacity'],
      'line-blur':['interpolate',['linear'],['get','opacity'],0.0,0.95,0.18,0.62,0.45,0.28,1.0,0.08]}});
  // OSM 실제 노선 relation의 선형이 존재하면 저배율에서 더 선명하게 겹쳐 표시합니다.
  // 오프라인·조회 실패 시 위 개략 노선이 남습니다.
  map.addLayer({id:'transport-real-rail-overview-casing',type:'line',source:'transport-actual-connections',
    minzoom:Math.max(METRO_MARKER_MIN_ZOOM,RAIL_OVERVIEW_MIN_ZOOM),maxzoom:RAIL_OVERVIEW_MAX_ZOOM,
    layout:{'line-cap':'round','line-join':'round'},
    paint:{'line-color':'rgba(255,255,255,0.92)','line-width':['interpolate',['linear'],['zoom'],10.7,4.6,12.8,6.2,14.2,4.8],
      'line-opacity':['interpolate',['linear'],['zoom'],10.7,.78,13.4,.72,14.2,0]}});
  map.addLayer({id:'transport-real-rail-overview',type:'line',source:'transport-actual-connections',
    minzoom:Math.max(METRO_MARKER_MIN_ZOOM,RAIL_OVERVIEW_MIN_ZOOM),maxzoom:RAIL_OVERVIEW_MAX_ZOOM,
    layout:{'line-cap':'round','line-join':'round'},
    paint:{'line-color':['get','color'],'line-width':['interpolate',['linear'],['zoom'],10.7,2.9,12.8,4.4,14.2,3.2],
      'line-opacity':['interpolate',['linear'],['zoom'],10.7,.97,13.4,.9,14.2,0]}});
  // 근접 확대에서는 철도 연결선을 전부 숨기고 역 아이콘과 승강장만 표시합니다.
  // 회색으로 중첩되던 OSM 철도 강조선도 별도 레이어로 그리지 않습니다.
  map.addLayer({id:'transport-platform-area',type:'fill',source:'transport-rail-platforms',minzoom:15.3,
    filter:['==',['geometry-type'],'Polygon'],paint:{'fill-color':'#deddd2','fill-opacity':0.82,'fill-outline-color':'#97a4a0'}},firstLabel);
  map.addLayer({id:'transport-platform-outline',type:'line',source:'transport-rail-platforms',minzoom:15.3,
    paint:{'line-color':'#607b7c','line-width':['interpolate',['linear'],['zoom'],15.3,4.7,18,10]}},firstLabel);
  map.addLayer({id:'transport-platform-surface',type:'line',source:'transport-rail-platforms',minzoom:15.3,
    paint:{'line-color':'#f0eee2','line-width':['interpolate',['linear'],['zoom'],15.3,2.8,18,7.2]}},firstLabel);
  // 구 외부 음영/도로 위에 철도 노선이 보이도록 레이어 순서를 명시합니다.
  if(map.getLayer('district-border')){
    for(const id of ['transport-schematic-subway-casing','transport-schematic-subway','transport-real-rail-overview-casing','transport-real-rail-overview']){
      try{map.moveLayer(id);}catch(error){console.warn('철도 레이어 순서 조정 실패',id,error);}
    }
  }
  labelVisibility(map);
  // Show tile-native stops even when the official GeoJSON remains empty.
  // Both tile and official markers use the identical blue pictogram; hiding
  // native POI icons is safe ONLY after the tile fallback is installed.
  if(!installBasemapBusStopFallback(map,getDistrictGeometry()))
    console.warn('[정류장] 타일 예비 아이콘 설치 실패; 구 외부 정류장 노출 방지를 위해 원본은 숨깁니다.');
  // Initial dark mode also needs recoloring: these layers are added after initTheme.
  applyBusStopLabelTheme(map,typeof document!=='undefined'?document.documentElement?.dataset?.theme||'light':'light');
  // Original POI bus symbols are global; never retain them outside Dongjak.
  suppressNativeBusStopGlyphs(map);
  function bringRailToForeground(){
    const beforeLabel=map.getStyle?.()?.layers?.find?.(layer=>layer.type==='symbol')?.id;
    for(const id of ['transport-schematic-subway-casing','transport-schematic-subway',
      'transport-real-rail-overview-casing','transport-real-rail-overview']){
      if(map.getLayer(id))try{map.moveLayer(id,beforeLabel);}catch(error){console.debug('[노선 표시 순서]',id,error);}
    }
    for(const id of ['district-border-halo','district-border']){
      if(map.getLayer(id))try{map.moveLayer(id,beforeLabel);}catch{}
    }
  }
  bringRailToForeground();
  const refreshNearbyBusStopNames=()=>syncNearbyBusStopNameFilters(map);
  refreshNearbyBusStopNames();
  const viewportLabels=coalesceViewportWork(full=>{refreshNearbyBusStopNames();if(full)updateTileBusFallbackFilter();},{delay:100,isMoving:()=>map.isMoving?.()===true});
  map.on('moveend',()=>viewportLabels.request(true));
  map.on('zoomend',()=>viewportLabels.request(true));
  map.on('styledata',()=>viewportLabels.request());
  const originalTransitFilter=map.getLayer('poi_transit')?map.getFilter?.('poi_transit'):null;
  let suppressNativeRail=true;
  function updateBaseTransitFilter(){
    if(!map.getLayer('poi_transit'))return;
    const rules=[];
    if(originalTransitFilter)rules.push(originalTransitFilter);
    if((map.getZoom?.()??16)<14.25 || document.getElementById('app')?.dataset?.baseBus==='off')rules.push(['all',
      ['!=',['get','class'],'bus'],['!=',['get','subclass'],'bus_stop'],['!=',['get','subclass'],'bus_station']]);
    if(suppressNativeRail || (map.getZoom?.()??16)<12.45 || document.getElementById('app')?.dataset?.baseMetro==='off')rules.push(['!=',['get','class'],'rail']);
    if(typeof map.setFilter!=='function')return;
    try{map.setFilter('poi_transit',rules.length?['all',...rules]:null);}catch(e){console.warn('기본 교통 아이콘 축척 제한 실패',e);}
  }
  updateBaseTransitFilter();
  map.on('zoomend',updateBaseTransitFilter);
  document.addEventListener?.('dongjak-base-layer-change',updateBaseTransitFilter);
  // Turn off the old circle/glyph markers; one geo point source controls all metro markers.
  const metroLayers=['transport-subway-station-shadow','transport-subway-station','transport-subway-glyph','transport-subway-names'];
  for(const id of metroLayers){if(map.getLayer(id))map.setLayoutProperty?.(id,'visibility','none');}

  // Rails and stations use MapLibre's same geographic projection.
  // Never use maplibregl.Marker HTML elements for subway stations: a DOM anchor
  // can appear to shift independently of the rail layer while zooming/panning.
  const stationIconIds=new Set();
  const stationSource='transport-metro-geographic-markers';
  map.addSource(stationSource,{type:'geojson',data:{type:'FeatureCollection',features:[]}});
  function registerStationIcon(iconId,lineList){
    if(stationIconIds.has(iconId)||map.hasImage?.(iconId))return;
    const size=80,canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;
    const ctx=canvas.getContext?.('2d');if(!ctx)return;
    const cx=40,cy=40,r=30;
    const normalizedLines=[...new Set((lineList||[]).map(normalizeLineName).filter(Boolean))];
    const palette=normalizedLines.map(line=>SUBWAY_LINE_COLORS[line]||DEFAULT_SUBWAY_LINE_COLOR);
    ctx.beginPath();ctx.arc(cx,cy,r+4,0,Math.PI*2);ctx.fillStyle='#ffffff';ctx.fill();
    if(palette.length<=1){
      ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fillStyle=palette[0]||DEFAULT_SUBWAY_LINE_COLOR;ctx.fill();
    }else{
      palette.forEach((color,i)=>{
        ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,r,
          -Math.PI/2+i*Math.PI*2/palette.length,-Math.PI/2+(i+1)*Math.PI*2/palette.length);
        ctx.closePath();ctx.fillStyle=color;ctx.fill();
      });
    }
    const label=normalizedLines.map(metroLineBadgeText).filter(Boolean).join('·');
    ctx.fillStyle='#ffffff';ctx.textAlign='center';ctx.textBaseline='middle';
    let fontSize=label.length>4?15:label.length>2?18:label.length>1?25:36;
    ctx.font=`800 ${fontSize}px Pretendard, sans-serif`;
    while(ctx.measureText(label).width>52&&fontSize>11){fontSize--;ctx.font=`800 ${fontSize}px Pretendard, sans-serif`;}
    ctx.shadowColor='rgba(0,0,0,.3)';ctx.shadowBlur=2;ctx.fillText(label,cx,cy+1);
    try{map.addImage(iconId,{width:size,height:size,data:ctx.getImageData(0,0,size,size).data});stationIconIds.add(iconId);}catch(e){console.warn('[역 아이콘 생성 실패]',iconId,e);}
  }
  const markerFilter=role=>['==',['get','role'],role];
  const compactMetroOnMobile=()=>typeof window!=='undefined' && window.innerWidth<=700;
  // Overview: adjacent separate circles per line, close-up shows each route separately.
  // Mobile overview has two display tiers. At a district-wide zoom the compact
  // map shows transfer hubs only. Ordinary stations appear once zoomed in.
  // This avoids covering the streets with labels but keeps per-line circles.
  for(const role of ['summary','detail']){
    const mobile=compactMetroOnMobile();
    const isSummary=role==='summary';
    const minzoom=isSummary?(mobile?12.6:METRO_MARKER_MIN_ZOOM):METRO_PLATFORM_SPLIT_ZOOM;
    const maxzoom=isSummary?METRO_PLATFORM_SPLIT_ZOOM:undefined;
    const baseIconLayout={
      'icon-image':['get','iconId'],
      'icon-size':isSummary
        ? mobile
          ?['interpolate',['linear'],['zoom'],METRO_MARKER_MIN_ZOOM,0.18,12.6,0.22,METRO_PLATFORM_SPLIT_ZOOM,0.26]
          :['interpolate',['linear'],['zoom'],METRO_MARKER_MIN_ZOOM,0.23,METRO_PLATFORM_SPLIT_ZOOM,0.30]
        :mobile
          ?['interpolate',['linear'],['zoom'],METRO_PLATFORM_SPLIT_ZOOM,0.28,16.3,0.36,18,0.44]
          :['interpolate',['linear'],['zoom'],METRO_PLATFORM_SPLIT_ZOOM,0.30,16.3,0.39,18,0.47],
      'icon-offset':['get','iconOffset'],'icon-anchor':'center',
      'icon-allow-overlap':true,'icon-ignore-placement':true,
      'icon-pitch-alignment':'viewport','icon-rotation-alignment':'viewport',
      'text-field':''
    };
    if(isSummary&&mobile){
      map.addLayer({id:'dj-metro-summary-mobile-hubs-icon',type:'symbol',source:stationSource,
        minzoom:METRO_MARKER_MIN_ZOOM,maxzoom:12.6,
        filter:['all',markerFilter('summary'),['==',['get','interchange'],true]],layout:baseIconLayout});
    }
    const id=`dj-metro-${role}-icon`;
    map.addLayer({id,type:'symbol',source:stationSource,minzoom,...(maxzoom?{maxzoom}:{}),
      filter:markerFilter(role),layout:baseIconLayout});
    const labelMinzoom=mobile?(isSummary?13.7:15.72):(isSummary?13.05:15.62);
    map.addLayer({id:`dj-metro-${role}-name`,type:'symbol',source:stationSource,
      minzoom:labelMinzoom,...(isSummary?{maxzoom}:{maxzoom:17.15}),
      filter:['all',markerFilter(role),['==',['get','labelOn'],true],['!=',['get','label'],'']],
      layout:{'text-field':['get','label'],
        'text-font':['Noto Sans Bold','Noto Sans Regular','Open Sans Semibold','Open Sans Regular'],
        'text-size':mobile?['interpolate',['linear'],['zoom'],13.3,10,16,11.6]
          :isSummary?['interpolate',['linear'],['zoom'],METRO_MARKER_MIN_ZOOM,10.3,METRO_PLATFORM_SPLIT_ZOOM,11.7]:11.5,
        'text-offset':['get','labelOffset'],
        'text-anchor':'bottom','text-optional':true,
        'text-allow-overlap':false,'text-ignore-placement':false,
        'text-padding':mobile?4:2,
        // Keep station names on the upper side of the line, never flip underneath.

        'text-pitch-alignment':'viewport','text-rotation-alignment':'viewport'},
      paint:{'text-color':'#21483c','text-halo-color':'rgba(255,255,255,0.98)','text-halo-width':2.1}});
  }
  // At platform-level zoom, all route-specific station names should remain
  // visible. Earlier deduplication silently removed the second 9호선 label.
  map.addLayer({id:'dj-metro-detail-name-very-close',type:'symbol',source:stationSource,minzoom:17.15,
    filter:['all',markerFilter('detail'),['==',['get','labelOn'],true]],
    layout:{'text-field':['get','label'],
      'text-font':['Noto Sans Bold','Noto Sans Regular','Open Sans Semibold','Open Sans Regular'],
      'text-size':11.7,'text-offset':['get','labelOffset'],
      'text-anchor':'bottom',
      'text-allow-overlap':true,'text-ignore-placement':true,
      'text-pitch-alignment':'viewport','text-rotation-alignment':'viewport'},
    paint:{'text-color':'#21483c','text-halo-color':'rgba(255,255,255,0.99)','text-halo-width':2.3}});
  // Hide metro lines and badges at the actual widest camera zoom on *both* PC and mobile.
  installResponsiveMetroVisibility({map,app:document.getElementById('app')});
  let stationLookups=new Map();
  function renderMetroMarkers(items){
    lastMetroMarkerItems=items;
    const geo=metroMarkerGeojson(items,{
      canonicalStations:officialMetro,
      normalizeName:normalizeStationQueryName,normalizeLine:normalizeLineName,
      placements:(name,lines,lng,lat)=>metroLineMarkerPlacements(name,lines,lng,lat,renderedRailPaths),
      colors:SUBWAY_LINE_COLORS,
      radiusPredicate:withinMetroRadius,
      isDistrict:(lng,lat)=>isDongjak(lng,lat)===true,
      nearby:(lng,lat)=>isNearBoundary(lng,lat)
    });
    stationLookups=new Map(items.filter(x=>x.kind==='subway').map(x=>[normalizeStationQueryName(x.name),x]));
    for(const p of geo.features){
      registerStationIcon(p.properties.iconId,p.properties.iconLines||[p.properties.line]);
    }
    map.getSource(stationSource)?.setData(geo);
  }
  function updateMetroMarkerPresentation(){
    // MapLibre reprojects markers itself on every frame; nothing here changes
    // marker coordinates, offsets, or DOM transforms on a map movement.
  }
  const clickableMetroLayers=['dj-metro-summary-mobile-hubs-icon','dj-metro-summary-icon','dj-metro-summary-name','dj-metro-detail-icon','dj-metro-detail-name','dj-metro-detail-name-very-close'];
  function chooseMetroStation(event){
    const feature=event.features?.[0];if(!feature)return;
    event.originalEvent?.stopPropagation?.();
    const p=feature.properties||{};
    const station=stationLookups.get(p.stationKey);
    if(!station||p.openable!==true && p.openable!=='true')return;
    const place={...station};
    if(p.role==='summary'){
      // Overview circles are separate line badges; selecting one must select that line.
      place.lines=p.line?[p.line]:String(p.lines||station.lines?.join(',')||'').split(',').map(x=>x.trim()).filter(Boolean);
      place.selectedLine=p.line||'';
    }else{
      place.lines=[p.line];place.selectedLine=p.line;
    }
    place.lng=feature.geometry.coordinates[0];place.lat=feature.geometry.coordinates[1];
    if(canPickRoute())onRoutePick(place);
    else if(canOpen())open(place,false,'map',event);
  }
  for(const layer of clickableMetroLayers){
    map.on('click',layer,chooseMetroStation);
    map.on('mouseenter',layer,()=>{map.getCanvas().style.cursor='pointer';});
    map.on('mouseleave',layer,()=>{map.getCanvas().style.cursor='';});
  }
  // v7.0.25: do not open a generic MOIS rail provenance popup under a
  // station or bus stop click. Provenance is still available in Data Sources.
  // 실제 철도 OSM 요청은 제거했습니다. 선형은 고정 GeoJSON만 사용합니다.
  let officialStaticStopCount=0;
  function combineStations(){
    const allBuses=osmTransport.filter(x=>x.kind==='bus'&&isDongjak(x.lng,x.lat)===true);
    // One map marker per physical bus stop. Do not merge official opposite-side
    // stops with distinct five-digit ARS IDs.
    const buses=deduplicateBusStops(allBuses);
    const stations=new Map();
    // OSM 목록은 공식 역사 마스터에 없는 최근 개통역을 보충하는 용도입니다.
    for(const place of osmTransport.filter(x=>x.kind==='subway')){
      if(!withinMetroRadius(place.lng,place.lat))continue;
      const key=normalizeStationQueryName(place.name);
      const current=stations.get(key);
      if(!key || key==='이름 미등록' || key==='이름 미등록 철도역')continue;
      if(!current)stations.set(key,{...place,lines:[...(place.lines||[])]});
      else if(meterDistance([current.lng,current.lat],[place.lng,place.lat])<380)
        current.lines=[...new Set([...current.lines,...(place.lines||[])])];
    }
    for(const place of officialMetro){
      if(!withinMetroRadius(place.lng,place.lat))continue;
      const key=normalizeStationQueryName(place.name);
      const original=stations.get(key);
      if(original && meterDistance([original.lng,original.lat],[place.lng,place.lat])<650){
        stations.set(key,{...place,lines:[...new Set([...place.lines,...original.lines])].filter(x=>Object.hasOwn(SUBWAY_LINE_COLORS,normalizeLineName(x)))});
      }else if(!original)stations.set(key,place);
    }
    return [...buses,...stations.values()];
  }
  let lastTileFallbackFilter='';
  let currentVisibleBusStops=[];
  function updateTileBusFallbackFilter(){
    if(!map.getLayer?.('dj-basemap-bus-pictogram')||!map.setFilter)return;
    const center=map.getCenter?.();
    const filter=busFilterInsideDistrict(
      busTileFallbackFilter(currentVisibleBusStops,center),getDistrictGeometry());
    const signature=JSON.stringify(filter);
    if(lastTileFallbackFilter===signature)return;
    try{map.setFilter('dj-basemap-bus-pictogram',filter);lastTileFallbackFilter=signature;}
    catch(error){console.debug('[정류장 예비 레이어 중복 필터]',error?.message||error);}
  }
  function showStops(items){
    const filtered=items.filter(x=>x.kind==='subway'?withinMetroRadius(x.lng,x.lat):isDongjak(x.lng,x.lat)===true);
    stops=new Map(filtered.map(x=>[x.id,x]));
    cachedTransportPlaces=filtered;
    map.getSource('transport-bus').setData(featureCollection(filtered.filter(x=>x.kind==='bus')));
    map.getSource('transport-subway').setData(featureCollection(filtered.filter(x=>x.kind==='subway')));
    renderMetroMarkers(filtered);
    currentVisibleBusStops=filtered.filter(x=>x.kind==='bus');
    updateTileBusFallbackFilter();
    const busCount=currentVisibleBusStops.length;
    sourceStatus.textContent=`버스 ${busCount}곳${officialStaticStopCount ? ' (서울시 공식 정류소 정적자료)' : ' (OSM 보완자료)'} · 철도역 ${filtered.length-busCount}곳 · 지도에서 선택`;
  }
  function refreshStops(){showStops(combineStations());}
  // The authoritative polygon may be updated asynchronously by the admin layer.
  map.on?.('dongjak:boundary-updated',()=>refreshStops());
  // On each deployment official static data is loaded directly as a local asset.
  // Unlike the live station API, this does not require a secret key or network
  // permission from ws.bus.go.kr. It persists into the highest map zoom.
  async function preloadOfficialStaticBusStops(){
    try{
      const response=await fetch('/data/transport/seoul-bus-stops.json',{cache:'force-cache'});
      if(!response.ok)return false; // source file not imported yet
      const dataset=await response.json();
      const verified=officialStaticBusPlaces(dataset,isDongjak);
      if(verified.length<20){console.warn('[공식 정류장 정적파일] 동작구 내부 유효 정류장 수 부족');return false;}
      const identifiers=new Set(osmTransport.filter(x=>x.kind==='bus'&&x.arsId).map(x=>x.arsId));
      for(const stop of verified){
        if(identifiers.has(stop.arsId)){
          const ix=osmTransport.findIndex(x=>x.kind==='bus'&&x.arsId===stop.arsId);
          if(ix>=0)osmTransport[ix]={...osmTransport[ix],...stop};
        }else{
          osmTransport.push(stop);identifiers.add(stop.arsId);
        }
      }
      officialStaticStopCount=verified.length;
      refreshStops();
      console.info(`[공식 정류장 정적파일] 동작구 ${officialStaticStopCount}개 적용 · 기준 ${dataset.sourceDate}`);
      return true;
    }catch(error){console.warn('[공식 정류장 정적파일] 불러오기 실패, OSM 데이터 유지',error?.message);return false;}
  }
  // 오프라인 기본 역 목록. 외부 역사마스터 네트워크에 의존하지 않습니다.
  refreshStops();
  void preloadOfficialStaticBusStops();
  // 별도 Overpass 호출 없이 배경지도 벡터 POI에서 정류소/역을 보충합니다.
  // 확실히 식별되는 철도 class와 이름만 사용하고, 임의로 좌표를 만들지 않습니다.
  function augmentWithBasemapStations(){
    const poiLayer=map.getStyle().layers.find(l=>l['source-layer']==='poi');
    if(!poiLayer)return;
    let features=[];
    try{features=map.querySourceFeatures(poiLayer.source,{sourceLayer:'poi'});}catch{return;}
    if(!features.length)return;
    const additions=[];
    const known=new Set([...osmTransport,...officialMetro].map(p=>`${p.kind}/${normalizeStationQueryName(p.name)}/${p.lng.toFixed(3)}/${p.lat.toFixed(3)}`));
    for(const f of features){
      // querySourceFeatures에는 layer가 없으므로 기존 OpenFreeMap POI layer를 명시합니다.
      const place=baseMapTransitPlace({...f,layer:{id:'poi_transit','source-layer':'poi'}});
      if(!place || (place.kind!=='bus' && place.name.startsWith('이름 미등록')))continue;
      if(place.kind==='subway' && !withinMetroRadius(place.lng,place.lat))continue;
      if(place.kind==='bus' && isDongjak(place.lng,place.lat)!==true)continue;
      const key=`${place.kind}/${normalizeStationQueryName(place.name)}/${place.lng.toFixed(3)}/${place.lat.toFixed(3)}`;
      if(known.has(key))continue;
      // 기본 역사 중 같은 역은 공식 좌표가 기준이며 중복 마커를 만들지 않습니다.
      if(place.kind==='subway' && officialMetro.some(m=>normalizeStationQueryName(m.name)===normalizeStationQueryName(place.name)
          && meterDistance([m.lng,m.lat],[place.lng,place.lat])<550))continue;
      known.add(key);additions.push(place);
    }
    if(additions.length){osmTransport.push(...additions);refreshStops();}
  }
  function classifyOfficialBusLookupError(status,body={}){
    const code=String(body?.code||'');
    const blocked=[401,403].includes(status)||['MISSING_BUS_KEY','BUS_API_AUTH'].includes(code)
      ||/^(?:BUS_API_[478]|UPSTREAM_HTTP_(?:401|403))/.test(code);
    const info=blocked
      ? '버스 정류소 공식 조회 인증 실패: 서버의 SEOUL_BUS_SERVICE_KEY 설정과 활성화 여부를 확인해 주세요.'
      : String(body?.error||`정류소 이름 조회 HTTP ${status}`);
    return {blocked,info,code};
  }
  // At maximum zoom some OpenMapTiles POI symbols disappear because the tiles
  // no longer carry the stop. Keep named OSM stop points in our own persistent
  // GeoJSON source. This is a viewport-only fallback, not a whole-city crawl.
  const osmBusViewportCells=new Map();
  let osmBusViewportBusy=false;
  async function fillHighZoomOSMBusStops(){
    const zoom=Number(map.getZoom?.()||0);
    if(zoom<16.8||osmBusViewportBusy||typeof map.getBounds!=='function')return;
    const center=map.getCenter?.();
    if(!center||!Number.isFinite(center.lng)||!Number.isFinite(center.lat))return;
    if(isDongjak(center.lng,center.lat)!==true)return;
    const bounds=map.getBounds();
    if(!bounds)return;
    const maxLatSpan=0.012,maxLonSpan=0.014;
    const south=Math.max(bounds.getSouth?.()??center.lat-0.004,center.lat-maxLatSpan/2);
    const north=Math.min(bounds.getNorth?.()??center.lat+0.004,center.lat+maxLatSpan/2);
    const west=Math.max(bounds.getWest?.()??center.lng-0.004,center.lng-maxLonSpan/2);
    const east=Math.min(bounds.getEast?.()??center.lng+0.004,center.lng+maxLonSpan/2);
    if(south>=north||west>=east)return;
    const cell=`${Math.floor(center.lng*600)}:${Math.floor(center.lat*600)}`;
    const last=osmBusViewportCells.get(cell)||0;
    if(Date.now()-last<5*60*1000)return;
    osmBusViewportCells.set(cell,Date.now());
    if(osmBusViewportCells.size>50)osmBusViewportCells.delete(osmBusViewportCells.keys().next().value);
    osmBusViewportBusy=true;
    const bbox=[south,west,north,east].map(v=>v.toFixed(6)).join(',');
    const query=`[out:json][timeout:12];(node["highway"="bus_stop"](${bbox});nwr["public_transport"="platform"]["bus"="yes"](${bbox}););out center tags 250;`;
    let completed=false;
    try{
      for(const host of ['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter']){
        const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),7500);
        try{
          const response=await fetch(`${host}?data=${encodeURIComponent(query)}`,{signal:controller.signal});
          if(!response.ok)continue;
          const payload=await response.json();
          if(!Array.isArray(payload.elements))continue;
          let updated=false;
          const seen=new Set(osmTransport.filter(p=>p.kind==='bus').map(p=>p.id));
          for(const item of payload.elements){
            const tags=item.tags||{},pos=item.center||item;
            const lng=Number(pos.lon),lat=Number(pos.lat);
            if(!Number.isFinite(lng)||!Number.isFinite(lat))continue;
            if(isDongjak(lng,lat)!==true)continue;
            const id=`osm-viewport-${item.type}-${item.id}`;
            if(seen.has(id)||osmTransport.some(stop=>stop.kind==='bus'&&stop.arsId&&meterDistance([stop.lng,stop.lat],[lng,lat])<12))continue;
            const name=String(tags['name:ko']||tags['name:nonlatin']||tags.name||'').trim();
            const arsId=/^\d{5}$/.test(String(tags['ref:seoul']||tags.ref||''))?String(tags['ref:seoul']||tags.ref):'';
            osmTransport.push({id,kind:'bus',name:name||'정류장명 미등록',lng,lat,arsId,lines:[],source:'osm-visible-stop',needsOfficialName:!name});
            seen.add(id);updated=true;
          }
          if(updated)refreshStops();
          completed=true;break;
        }catch(error){if(error?.name!=='AbortError')console.debug('[OSM 고배율 정류장 보충]',error?.message||error);}
        finally{clearTimeout(timer);}
      }
    }finally{
      osmBusViewportBusy=false;
      if(!completed)osmBusViewportCells.delete(cell); // retry after subsequent movement
    }
  }
  // Enrich unnamed bus stop points using Seoul's authoritative station-name/ARS API.
  // Coordinate matching is capped and deduplicated; do not invent names.
  const busStopLookups=new Set();
  let busStopLookupInFlight=0;
  let officialBusAuthDisabled=false;
  let officialBusAuthWarned=false;
  function enrichNearbyBusStops(){
    if(officialStaticStopCount>0 || officialBusAuthDisabled || (map.getZoom?.()??0)<15 || busStopLookupInFlight>=2 || busStopLookups.size>=60)return;
    const visible=map.getBounds?.();
    const candidates=osmTransport.filter(p=>p.kind==='bus' && (!p.arsId || !p.name || p.needsOfficialName)
      && (!visible?.contains || visible.contains([p.lng,p.lat])));
    for(const place of candidates){
      if(busStopLookupInFlight>=2 || busStopLookups.size>=60)break;
      const key=`${place.lng.toFixed(4)}/${place.lat.toFixed(4)}`;
      if(busStopLookups.has(key))continue;
      busStopLookups.add(key);busStopLookupInFlight++;
      const params=new URLSearchParams({lat:String(place.lat),lng:String(place.lng),radius:'130'});
      void fetch(`${TRANSPORT_API_BASE}/bus/stops-nearby?${params}`).then(async response=>{
        if(!response.ok){const info=classifyOfficialBusLookupError(response.status,await response.json().catch(()=>({})));if(info.blocked){officialBusAuthDisabled=true;officialBusQueue.length=0;officialBusQueued.clear();}throw new Error(info.info);}
        const data=await response.json();
        const items=(Array.isArray(data.items)?data.items:[]).filter(item=>
          item?.kind==='bus' && /^\d{5}$/.test(String(item.arsId||'')) &&
          String(item.name||'').trim() && Number.isFinite(item.lng) && Number.isFinite(item.lat));
        if(!items.length)return;
        let changed=false;
        const used=new Set();
        for(const item of items){
          if(isDongjak(item.lng,item.lat)!==true)continue;
          if(osmTransport.some(p=>p.kind==='bus' && p.arsId===item.arsId))continue;
          const norm=value=>String(value||'').replace(/[^가-힣a-zA-Z0-9]/g,'');
          const matchIndex=osmTransport.findIndex(p=>p.kind==='bus' && (!p.arsId || !p.name || p.needsOfficialName)
            && !used.has(p.id) && meterDistance([p.lng,p.lat],[item.lng,item.lat])<=95
            && (!p.name || p.needsOfficialName || norm(p.name)===norm(item.name)
              || norm(p.name).includes(norm(item.name)) || norm(item.name).includes(norm(p.name))));
          if(matchIndex>=0){
            const prior=osmTransport[matchIndex];used.add(prior.id);
            osmTransport[matchIndex]={...prior,...item,id:item.id||prior.id,source:'seoul-official-bus-stop',needsOfficialName:false};
            changed=true;
          }else if(meterDistance([place.lng,place.lat],[item.lng,item.lat])<=130){
            osmTransport.push({...item,needsOfficialName:false});changed=true;
          }
        }
        if(changed)refreshStops();
      }).catch(error=>{if(!officialBusAuthWarned){console.warn('[주변 버스정류장 이름] 공식 API 연결 또는 인증 상태 확인 필요:',error.message);officialBusAuthWarned=true;}})
        .finally(()=>{busStopLookupInFlight--;});
    }
  }
  // In a detailed street view, fetch the actual, named Seoul bus stops in view.
  // The older name-enrichment function only ran if OSM had already discovered an
  // unnamed stop, leaving other bus stops invisible forever. The official query
  // is independent from OSM presence and is cached by a coarse sample grid.
  // Progressive viewport coverage. Old 3×3 sampling left gaps between 180m
  // circles, and a failed request was cached forever. These cells are queued
  // across the whole visible viewport, prioritizing the centre and retrying
  // transient failures with a time limit rather than inventing stops.
  const officialBusCells=new Map();
  const officialBusQueue=[];
  const officialBusQueued=new Set();
  let officialBusInFlight=0,officialBusErrorAt=0;
  function isValidOfficialBus(item){
    return item?.kind==='bus' && /^[가-힣]/.test(String(item.name||'').trim())
      && /^\d{5}$/.test(String(item.arsId||''))
      && Number.isFinite(item.lng)&&Number.isFinite(item.lat);
  }
  function drainOfficialBusQueue(){
    if(officialStaticStopCount>0 || officialBusAuthDisabled || (officialBusErrorAt && Date.now()-officialBusErrorAt<45000))return;
    while(officialBusInFlight<2 && officialBusQueue.length){
      const cell=officialBusQueue.shift();officialBusQueued.delete(cell.key);
      const last=officialBusCells.get(cell.key)||0;
      if(last&&Date.now()-last<12*60*1000)continue;
      officialBusCells.set(cell.key,Date.now());officialBusInFlight++;
      const params=new URLSearchParams({lat:String(cell.lat),lng:String(cell.lng),radius:'180'});
      void fetch(`${TRANSPORT_API_BASE}/bus/stops-nearby?${params}`).then(async response=>{
        if(!response.ok){const info=classifyOfficialBusLookupError(response.status,await response.json().catch(()=>({})));if(info.blocked){officialBusAuthDisabled=true;officialBusQueue.length=0;officialBusQueued.clear();}throw new Error(info.info);}
        const payload=await response.json();
        let changed=false;
        for(const item of Array.isArray(payload.items)?payload.items:[]){
          if(!isValidOfficialBus(item))continue;
          if(isDongjak(item.lng,item.lat)!==true)continue;
          if(osmTransport.some(p=>p.kind==='bus'&&p.arsId===item.arsId))continue;
          const old=osmTransport.findIndex(p=>p.kind==='bus'&&(!p.arsId||p.needsOfficialName)
            && meterDistance([p.lng,p.lat],[item.lng,item.lat])<24);
          const replacement={...item,needsOfficialName:false,source:'seoul-official-bus-stop'};
          if(old>=0){osmTransport[old]={...osmTransport[old],...replacement,id:item.id||osmTransport[old].id};}
          else osmTransport.push(replacement);
          changed=true;
        }
        if(changed)refreshStops();
      }).catch(error=>{
        // Only retry after a cool-down; avoid endless API requests on key failure.
        officialBusCells.delete(cell.key);
        officialBusErrorAt=Date.now();
        if(!officialBusAuthWarned){console.warn('[화면 내 버스정류장 조회] 인증키/접근 권한 또는 서버 연결 확인 필요:',error.message);officialBusAuthWarned=true;}
      }).finally(()=>{officialBusInFlight--;drainOfficialBusQueue();});
    }
  }
  function enrichViewportBusStops(){
    if(officialStaticStopCount>0 || (map.getZoom?.()??0)<14.25)return;
    const samples=busCoverageSamples(map,{radiusMeters:180,maxAxis:13});
    if(!samples.length)return;
    for(const cell of samples){
      if(isDongjak(cell.lng,cell.lat)!==true)continue;
      if(officialBusQueued.has(cell.key))continue;
      const last=officialBusCells.get(cell.key);
      if(last&&Date.now()-last<12*60*1000)continue;
      if(officialBusQueue.length>=170)break;
      officialBusQueued.add(cell.key);officialBusQueue.push(cell);
    }
    drainOfficialBusQueue();
  }
  // 공식 서울시 정류소 좌표를 사용해 '(중)' 중앙차로 양 방향을 별개 ARS 지점으로 등록.
  // 화면의 POI 한 점을 인위적으로 좌우로 옮기는 방식은 사용하지 않습니다.
  const medianLookups=new Set();
  let medianInFlight=0;
  function enrichMedianStops(){
    if(officialStaticStopCount>0 || (map.getZoom?.()??0)<15.4||medianInFlight>=2||medianLookups.size>=36)return;
    const visible=map.getBounds?.();
    const candidates=osmTransport.filter(p=>p.kind==='bus' && !p.arsId && isMedianBusStopName(p.name)
      && (!visible?.contains || visible.contains([p.lng,p.lat])));
    for(const place of candidates){
      if(medianInFlight>=2||medianLookups.size>=36)break;
      const key=`${medianStopBaseName(place.name)}/${place.lng.toFixed(3)}/${place.lat.toFixed(3)}`;
      if(medianLookups.has(key))continue;
      medianLookups.add(key);medianInFlight++;
      const params=new URLSearchParams({lat:String(place.lat),lng:String(place.lng),name:place.name});
      void fetch(`${TRANSPORT_API_BASE}/bus/median-nearby?${params}`).then(async response=>{
        if(!response.ok)throw new Error(`공식 중앙차로 조회 HTTP ${response.status}`);
        const data=await response.json();
        const official=(Array.isArray(data.items)?data.items:[]).filter(p=>p?.median && /^\d{5}$/.test(String(p.arsId||''))
          && Number.isFinite(p.lng) && Number.isFinite(p.lat));
        if(!official.length)return;
        const known=new Set(osmTransport.filter(p=>p.arsId).map(p=>p.arsId));
        // 해당 중앙차로 이름의 기존 단일 POI만 교체하고, 다른 정류장은 건드리지 않습니다.
        osmTransport=osmTransport.filter(p=>!(p.kind==='bus' && !p.arsId &&
          medianStopBaseName(p.name)===medianStopBaseName(place.name) &&
          meterDistance([p.lng,p.lat],[place.lng,place.lat])<=130));
        for(const p of official){if(!known.has(p.arsId)){osmTransport.push(p);known.add(p.arsId);}}
        refreshStops();
      }).catch(error=>console.info('[중앙차로 방향별 좌표] 공식 자료 조회 실패:',error.message))
        .finally(()=>{medianInFlight--;});
    }
  }
  let fallbackScans=0;
  const viewportEnrichment=coalesceViewportWork(scan=>{
    if(scan&&fallbackScans<20){fallbackScans++;augmentWithBasemapStations();}
    enrichNearbyBusStops();enrichMedianStops();enrichViewportBusStops();void fillHighZoomOSMBusStops();
  },{delay:200,isMoving:()=>map.isMoving?.()===true});
  map.on('idle',()=>viewportEnrichment.request(fallbackScans<8));
  map.on('moveend',()=>viewportEnrichment.request(fallbackScans<20));
  map.on('zoomend',()=>viewportEnrichment.request());
  function fetchAndShow(){
    // 철도/정류장 위치는 저장된 좌표 + 현재 배경지도 POI로 표시합니다.
    // 실시간 도착 및 버스 경유노선만 5178 교통정보 서버에 요청합니다.
    refreshStops();
    augmentWithBasemapStations();
  }
  // 공식 운행 시간표는 실시간 도착정보와 구분하고, 요일/방향/호선별 전체 표를 제공합니다.
  const serviceHoursMemo=new Map();
  // Plans are never used as real-time ETAs. Cache the official station table,
  // but recalculate the visible countdown on every 15-second screen refresh.
  const arrivalPlanMemo=new Map();
  async function loadArrivalPlan(place,clock){
    if(place?.kind!=='subway')return null;
    const line=normalizeLineName(place.selectedLine||'');
    if(!/^(?:[1-9]호선|신림선)$/.test(line))return null;
    const name=normalizeStationQueryName(place.name);
    const key=`${name}|${line}|${clock.day}`;
    const existing=arrivalPlanMemo.get(key);
    if(existing && Date.now()-existing.at<10*60*1000)return existing.promise;
    const cachedPlan=loadTimetable(place,clock.day);
    if(Array.isArray(cachedPlan?.timetable)&&cachedPlan.timetable.length)return cachedPlan;
    const promise=(async()=>{
      const inline=verifiedInlineOperatorTimetable(name,line,clock.day);
      if(inline?.timetable?.length)return inline;
      // 1호선: 코레일 역별 원본 시각표에서 검증·변환된 정적 JSON만 사용.
      // JSON이 없으면 ETA를 만들어 내지 않고 기존 상태 안내를 유지합니다.
      if(line==='1호선'){
        try{
          const response=await fetch('/data/transport/korail-line1-stations.json',{cache:'no-cache'});
          if(response.ok){
            const imported=await response.json();
            const normalized=verifiedKorailLine1Timetable(imported,name,clock.day);
            if(normalized?.timetable?.length)return normalized;
          }
        }catch{ /* 원본 시간표 미탑재: 실시간 상태 안내 유지 */ }
      }
      const params=new URLSearchParams({station:name,day:clock.day});
      const url=line==='신림선'
        ?`${TRANSPORT_API_BASE}/operator-timetable?${params}`
        :`${TRANSPORT_API_BASE}/service-hours?${new URLSearchParams({kind:'subway',station:name,line,day:clock.day})}`;
      try{
        const ctrl=new AbortController();
        const timer=setTimeout(()=>ctrl.abort(),6500);
        let response;
        try{response=await fetch(url,{signal:ctrl.signal});}finally{clearTimeout(timer);}
        if(!response.ok)return null;
        const data=await response.json();
        return data?.status==='ok'&&Array.isArray(data.timetable)&&data.timetable.length?data:null;
      }catch{return null;}
    })();
    arrivalPlanMemo.set(key,{at:Date.now(),promise});
    return promise;
  }
  function passedLastTrainDirections(data,clock){
    if(!data||data.status!=='ok'||(data.day&&data.day!==clock.day))return [];
    const rows=Array.isArray(data.timetable)?data.timetable:[];
    const labels={'1':'상행','2':'하행'};
    const result=[];
    for(const code of ['1','2']){
      const minutes=rows.filter(row=>String(row.directionCode)===code&&Number.isFinite(Number(row.minute)))
        .map(row=>{const minute=Number(row.minute);return clock.afterMidnight&&minute<240?minute+1440:minute;});
      if(minutes.length&&clock.minute>Math.max(...minutes))result.push(labels[code]);
    }
    if(!rows.length){
      for(const item of data.items||[]){
        if(item?.passed===true){
          const label=String(item.direction||'');
          if(/상행|내선/.test(label)&&!result.includes('상행'))result.push('상행');
          if(/하행|외선/.test(label)&&!result.includes('하행'))result.push('하행');
        }
      }
    }
    return result;
  }
  function syncArrivalAvailability(place,result){
    const limited=place?.kind==='subway'&&result?.sourceStatus==='quota';
    const refresh=document.getElementById('transport-refresh');
    if(refresh){refresh.disabled=limited;refresh.title=limited?'서울시 지하철 API 일일 조회량 초과':'';}
    if(limited){updatedEl.textContent='조회 한도 초과';if(liveTab)liveTab.textContent='도착예정';}
    else if(liveTab)liveTab.textContent='실시간';
    if(panel.dataset)panel.dataset.metroQuota=String(limited);
  }
  async function showArrivalOrPlannedCountdown(container,place,result,activeSeq){
    // Always show current source status immediately; use an official timetable
    // only to identify the end of service or show clearly labelled planned ETAs.
    syncArrivalAvailability(place,result);
    showArrivalsWithProviderStatus(container,place,result);
    if(place?.kind!=='subway')return;
    const hasSelectedLive=result?.sourceStatus==='ok' &&
      arrivalsForSelectedMetroLine(place,result?.items||[]).length>0;
    if(hasSelectedLive)return;
    const line=normalizeLineName(place.selectedLine||'');
    if(!/^(?:[1-9]호선|신림선)$/.test(line))return;
    const clock=seoulServiceClock();
    const data=await loadArrivalPlan(place,clock);
    if(activeSeq!==seq||selected!==place||panel.hidden)return;
    if(data?.day && data.day!==clock.day)return;
    const passed=passedLastTrainDirections(data,clock);
    if(passed.length && passed.length===2){
      const notice=el('div','metro-last-train-passed');
      notice.append(el('strong','','계획 막차 시각 경과'));
      notice.append(el('span','',`${passed.join('·')} 방향 · 시간표 기준, 실제 운행 종료 여부 미확인`));
      if(result?.sourceStatus==='quota')container.replaceChildren(el('p','metro-quota-notice',result.message),notice);
      else container.replaceChildren(notice);
      return;
    }
    if(!['1호선','신림선'].includes(line))return;
    const future=plannedArrivalsFromTimetable(data?.timetable,line,clock);
    if(!future.length)return;
    const group=el('div','metro-scheduled-arrivals');
    const cards=el('div','metro-scheduled-arrival-cards');
    displayArrivals(cards,'subway',future);
    group.append(cards);
    if(passed.length){
      const notice=el('small','metro-plan-direction-ended',`${passed.join('·')} 방향은 계획 막차 시각 경과 · 실시간 운행 종료 확인 아님`);
      group.append(notice);
    }
    if(liveTab)liveTab.textContent='도착예정';
    if(result?.sourceStatus==='quota'){
      cards.querySelector('.metro-planned-notice')?.remove();
      const notice=el('p','metro-quota-notice','실시간 API 조회 한도 초과 · 시간표 기준 예상 도착 (실시간 지연 미반영)');
      container.replaceChildren(notice,group);
    }else container.replaceChildren(group);
  }
  let visibleServiceHours=null;
  let timetableExpanded=false,timetableDay=null,timetableLine='all',timetableDirection='all';
  function activeSeoulDay(){return seoulServiceClock().day;}
  const makeOption=(value,title)=>{
    const option=document.createElement('option');option.value=value;option.textContent=title;return option;
  };
  function appendOfficialOperatorTimetables(){
    const resources=operatorTimetableResources(selected);
    if(!resources.length)return false;
    const section=el('section','transport-official-time-sources');
    const heading=el('strong','transport-official-time-heading','운영기관 공식 시간표');
    const intro=el('p','transport-official-time-explainer',
      '서울시 실시간 도착 API에 남은 시간이 없거나 이 노선의 계획 시간표가 제공되지 않아도, 운영기관의 원본 시각표를 확인할 수 있습니다.');
    section.append(heading,intro);
    for(const resource of resources){
      const card=el('article','transport-official-time-card');
      const name=el('strong','transport-official-time-line',`${resource.line} · ${resource.provider}`);
      const action=el('a','transport-official-time-link',`${resource.label} 보기`);
      action.href=resource.url;action.target='_blank';action.rel='noopener noreferrer';
      action.setAttribute('aria-label',`${resource.line} ${resource.provider} 공식 시간표를 새 창에서 열기`);
      card.append(name,el('p','transport-official-time-guidance',resource.guidance),action,
        el('small','transport-official-time-notice',resource.notice));
      section.append(card);
    }
    serviceHoursEl.append(section);
    return true;
  }
  function appendObservedBusHistory(place){
    if(place?.kind!=='bus'||!place.arsId)return;
    const observed=latestBusObservations(place.arsId);
    const section=el('section','dj-v724-observed-bus');
    section.append(el('strong','dj-v724-bus-label','최근 버스 도착예정 관측 기록'));
    section.append(el('p','dj-v723-source-note',
      '이 기기가 앱 실행 중 수신한 도착예정 정보입니다. 실제 도착시각이 아니며, 앱 사용 이전 기록은 제공되지 않습니다.'));
    if(!observed.length){section.append(el('p','transport-hours-notice','아직 저장된 관측 기록이 없습니다. 실시간 정보를 조회하면 이 기기에 누적됩니다.'));serviceHoursEl.append(section);return;}
    const table=el('table','dj-v723-timetable-table');
    const head=el('thead',''),rowHead=el('tr','');
    for(const title of ['버스 노선','최근 조회','마지막 도착예정','예상 배차'])rowHead.append(el('th','',title));
    head.append(rowHead);table.append(head);
    const body=el('tbody','');
    for(const item of observed){
      const row=el('tr','');
      const headway=expectedBusHeadway(item);
      for(const value of [item.route,displaySeoulObservationTime(item.at),
        item.confirmedArrivalNotice?'도착 알림 관측':item.message||'미확인',
        headway===null?'자료 부족':`약 ${headway}분 (1·2차 예정 차이)`])row.append(el('td','',value));
      body.append(row);
    }
    table.append(body);const wrapper=el('div','dj-v723-table-scroll');wrapper.append(table);section.append(wrapper);
    serviceHoursEl.append(section);
  }
  function renderServiceHours(data){
    visibleServiceHours=data;
    const serviceClock=seoulServiceClock();
    const nowSeoul=serviceClock.minute;
    if(!serviceHoursEl)return;
    serviceHoursEl.replaceChildren();
    const verifiedInline=Boolean(data?.sourceUrl && data?.status==='ok' && Array.isArray(data?.timetable) && data.timetable.length);
    const requestedLineNames=[...(data?.requestedLines||[]),selected?.selectedLine||'']
      .map(line=>normalizeLineName(line)).filter(Boolean);
    const inAppOperatorLine=requestedLineNames.some(line=>line==='1호선'||line==='신림선');
    const hasOperatorSources=verifiedInline||inAppOperatorLine?false:appendOfficialOperatorTimetables();
    if(verifiedInline)serviceHoursEl.append(el('p','transport-hours-inline-credit',
      `${data.source} · 앱 내 직접 표시 · 공식 계획 시각표 / 실시간 ETA 아님`));
    if(!data||data.status!=='ok'||(!Array.isArray(data.items)||!data.items.length)&&(!Array.isArray(data.timetable)||!data.timetable.length)){
      serviceHoursEl.append(el('p','transport-hours-notice',data?.notice||'이 역의 검증된 시각표 데이터가 아직 확인되지 않았습니다.'));
      if(data?.status!=='ok'&&!hasOperatorSources&&!inAppOperatorLine && selected?.kind==='subway'){
        const a=el('a','transport-timetable-official-link','서울교통공사 공식 시간표 안내');
        a.href='https://www.seoulmetro.co.kr';a.target='_blank';a.rel='noopener noreferrer';serviceHoursEl.append(a);
      }
      appendObservedBusHistory(selected);
      return;
    }
    const rawTimetableRows=Array.isArray(data.timetable)?data.timetable:[];
    const derivedSummary=[];
    const buildDerivedSummary=(line,rows)=>{
      if(!rows.length)return;
      const directionGroups=[['1','상행·내선'],['2','하행·외선']];
      for(const [code,label] of directionGroups){
        const directionRows=rows.filter(row=>row.directionCode===code && Number.isFinite(row.minute));
        if(!directionRows.length)continue;
        const categories=line==='9호선'
          ? [
              {route:'일반',records:directionRows.filter(row=>row.express===false)},
              {route:'급행',records:directionRows.filter(row=>row.express===true)},
              {route:'종별 미확인',records:directionRows.filter(row=>row.express!==true&&row.express!==false)}
            ]
          : [{route:'',records:directionRows}];
        for(const category of categories){
          if(!category.records.length)continue;
          const sorted=[...category.records].sort((a,b)=>a.minute-b.minute);
          const first=sorted.find(row=>row.minute>=240&&row.minute<1440)?.minute ?? sorted[0]?.minute;
          const last=Math.max(...sorted.map(row=>row.minute<240?row.minute+1440:row.minute));
          derivedSummary.push({line,direction:label,route:category.route,
            first:formatTime(first),last:formatTime(last),
            firstMinute:first,lastMinute:last,derived:true});
        }
      }
    };
    const existingSummaryKeys=new Set((Array.isArray(data.items)?data.items:[]).map(row=>`${row.line}|${row.direction}|${row.route||''}`));
    const timetableLines=[...new Set(rawTimetableRows.map(x=>x.line).filter(Boolean))];
    for(const line of timetableLines){
      const lineRows=rawTimetableRows.filter(row=>row.line===line);
      const beforeCount=derivedSummary.length;
      buildDerivedSummary(line,lineRows);
      if(derivedSummary.length>beforeCount){
        // 같은 line-direction-route의 공식 요약이 이미 있으면 중복 추가하지 않습니다.
      }
    }
    const mergedItems=[...(Array.isArray(data.items)?data.items:[])];
    for(const row of derivedSummary){
      const key=`${row.line}|${row.direction}|${row.route||''}`;
      if(!existingSummaryKeys.has(key))mergedItems.push(row);
    }
    const lineOrder=[...new Set([...(data.requestedLines||[]),...mergedItems.map(x=>x.line),...rawTimetableRows.map(x=>x.line)])].filter(Boolean);
    const lineNotes=String(data.notice||'').split(' · ').filter(Boolean).reduce((map,note)=>{
      const matched=note.match(/^([^:]+):\s*(.+)$/);
      if(!matched)return map;
      const [,line,message]=matched;
      if(!map.has(line))map.set(line,[]);
      map.get(line).push(message);
      return map;
    },new Map());
    const summaryGrid=el('div','transport-hours-line-grid');
    for(const line of lineOrder){
      const panelWrap=el('section','transport-hours-line-panel');
      const head=el('div','transport-hours-line-head');
      const badge=makeLineBadge(line,'metro-panel-badge');
      const title=el('strong','transport-hours-line-title',line);
      title.prepend(badge);
      head.append(title);
      panelWrap.append(head);
      const items=mergedItems.filter(row=>row.line===line).sort((a,b)=>{
        const directionOrder={'상행·내선':0,'하행·외선':1};
        const routeOrder={'일반':0,'':0,'급행':1,'종별 미확인':2};
        return (directionOrder[a.direction]??9)-(directionOrder[b.direction]??9)
          || (routeOrder[a.route]??9)-(routeOrder[b.route]??9);
      });
      const cards=el('div',`transport-hours-summary-grid ${line==='9호선'?'transport-hours-summary-grid--line9':''}`.trim());
      for(const row of items){
        const wrap=el('article','transport-hours-row transport-hours-summary-card');
        const labelWrap=el('div','transport-hours-summary-labels');
        labelWrap.append(el('strong','hours-line',[row.direction,row.route].filter(Boolean).join(' · ')));
        const times=el('div','transport-hours-times');
        times.append(el('span','',`첫차 ${row.first||'미확인'}`));
        times.append(el('span','',`막차 ${row.last||'미확인'}`));
        wrap.append(labelWrap,times);
        const lastMinute=Number.isFinite(row.lastMinute)?(serviceClock.afterMidnight&&row.lastMinute<240?row.lastMinute+1440:row.lastMinute):null;
        const timePassed=data.kind==='subway' && (!data.day||data.day===serviceClock.day) && Number.isFinite(lastMinute)
          && nowSeoul>lastMinute;
        const busStatus=data.kind==='bus'?busLastServiceStatus(row,{minute:nowSeoul,afterMidnight:serviceClock.afterMidnight}):null;
        if(row.passed||timePassed||busStatus){
          const message=data.kind==='subway'
            ? '시간표상 막차 시각이 지났습니다. 실제 통과 여부는 확인되지 않았습니다.'
            : busStatus?.message||'운영기관이 운행 종료로 안내했습니다.';
          wrap.append(el('div',`transport-hours-alert${busStatus?' bus-service-status':''}`,message));
        }
        cards.append(wrap);
      }
      if(!items.length){
        const empty=el('div','transport-hours-row transport-hours-summary-card transport-hours-summary-card--empty');
        empty.append(el('strong','hours-line','조회 결과 없음'));
        empty.append(el('div','transport-hours-notice',`${line} 첫차·막차 정보를 아직 받지 못했습니다.`));
        cards.append(empty);
      }
      panelWrap.append(cards);
      const notes=lineNotes.get(line)||[];
      if(notes.length){
        panelWrap.append(el('p','transport-hours-panel-note',`${line}: ${notes.join(' · ')}`));
      }
      summaryGrid.append(panelWrap);
    }
    serviceHoursEl.append(summaryGrid);
    const genericNotes=String(data.notice||'').split(' · ').filter(Boolean)
      .filter(note=>!note.includes(':'));
    if(genericNotes.length)serviceHoursEl.append(el('p','transport-hours-notice',genericNotes.join(' · ')));
    if(data.kind==='bus'){
      // Seoul's official station API provides route-by-route FIRST/LAST planned
      // times, not a minute-by-minute stop timetable. Do not invent departures.
      const busRows=Array.isArray(data.items)?data.items:[];
      if(busRows.length){
        const caption=el('p','dj-v723-source-note','서울시 정류소별 노선 첫차·막차 예정시간 · 정류장 실제 통과시각이 아닙니다.');
        serviceHoursEl.append(caption);
        const table=el('table','dj-v723-timetable-table');
        const head=el('thead','');const headings=el('tr','');
        for(const label of ['노선','첫차 예정','막차 예정'])headings.append(el('th','',label));
        head.append(headings);table.append(head);
        const body=el('tbody','');
        for(const item of busRows){
          const row=el('tr','');
          for(const value of [item.route||'노선 미확인',item.first||'미확인',item.last||'미확인'])row.append(el('td','',value));
          body.append(row);
        }
        table.append(body);const box=el('div','dj-v723-table-scroll');box.append(table);serviceHoursEl.append(box);
      }
      appendObservedBusHistory(selected);
      return;
    }

    const toggle=document.createElement('button');toggle.type='button';toggle.className='transport-timetable-toggle';
    toggle.textContent=timetableExpanded?'전체 운행시간표 접기':'전체 운행시간표 보기';
    toggle.setAttribute('aria-expanded',String(timetableExpanded));
    toggle.addEventListener('click',()=>{timetableExpanded=!timetableExpanded;renderServiceHours(data);});
    serviceHoursEl.append(toggle);
    if(!timetableExpanded)return;

    const whole=el('section','transport-timetable-content');
    const controls=el('div','transport-timetable-controls');
    const daySelect=document.createElement('select');daySelect.setAttribute('aria-label','시간표 요일');
    daySelect.append(makeOption('1','평일'),makeOption('2','토요일'),makeOption('3','일요일·공휴일'));
    daySelect.value=data.day||timetableDay||activeSeoulDay();
    daySelect.addEventListener('change',()=>{
      if(!selected||panel.hidden)return;
      timetableDay=daySelect.value;
      void refreshServiceHours(selected,seq);
    });
    const allLines=[...new Set([...(data.requestedLines||[]),...mergedItems.map(x=>x.line),...rawTimetableRows.map(x=>x.line)])].filter(Boolean);
    const lineSelect=document.createElement('select');lineSelect.setAttribute('aria-label','시간표 호선');
    lineSelect.append(makeOption('all','전체 호선'),...allLines.map(line=>makeOption(line,line)));
    lineSelect.value=allLines.includes(timetableLine)?timetableLine:'all';
    lineSelect.addEventListener('change',()=>{timetableLine=lineSelect.value;renderServiceHours(data);});
    const labeledSelect=(title,control)=>{
      const wrapper=el('label','transport-timetable-filter');
      wrapper.append(el('span','transport-timetable-filter-label',title),control);
      return wrapper;
    };
    controls.append(labeledSelect('운행 요일',daySelect),labeledSelect('지하철 호선',lineSelect));
    whole.append(controls);

    const directionSwitch=el('div','transport-timetable-direction-switch');
    directionSwitch.setAttribute('role','group');
    directionSwitch.setAttribute('aria-label','시간표 방향');
    for(const [value,title] of [['all','양방향'],['1','상행 · 내선'],['2','하행 · 외선']]){
      const btn=el('button','transport-timetable-direction-button',title);
      btn.type='button';btn.setAttribute('aria-pressed',String(timetableDirection===value));
      btn.addEventListener('click',()=>{timetableDirection=value;renderServiceHours(data);});
      directionSwitch.append(btn);
    }
    whole.append(directionSwitch);

    const allRows=rawTimetableRows;
    const rows=allRows.filter(x=>(lineSelect.value==='all'||x.line===lineSelect.value)
      &&(timetableDirection==='all'||x.directionCode===timetableDirection));
    whole.append(el('p','transport-timetable-count',`${rows.length}편 · ${daySelect.selectedOptions[0]?.textContent||'선택 요일'} 계획 운행시간표`));
    if(!rows.length){
      whole.append(el('p','transport-hours-notice','선택한 호선·방향의 시간표가 없습니다. 다른 필터를 선택하거나 서버 조회 상태를 확인해 주세요.'));
      serviceHoursEl.append(whole);
      return;
    }

    // Unified timetable table with actual operator rows (not synthesized ETAs).
    // The original verbose card rendering below stays as legacy code but is
    // bypassed for rows which have been rendered as a table.
    const timetable=el('table','dj-v723-timetable-table');
    const thead=el('thead','');const hdr=el('tr','');
    for(const label of ['호선','방향','출발','행선지','구분'])hdr.append(el('th','',label));
    thead.append(hdr);timetable.append(thead);
    const tbody=el('tbody','');
    const sortedRows=[...rows].sort((a,b)=>Number(a.minute||0)-Number(b.minute||0));
    for(const item of sortedRows){
      const tr=el('tr','');
      for(const value of [item.line||'미확인',item.directionCode==='1'?'상행·내선':item.directionCode==='2'?'하행·외선':'미확인',
        item.time||'미확인',item.destination||'행선지 미확인',item.express===true?'급행':item.express===false?'일반':'미확인']){
        tr.append(el('td','',value));
      }
      tbody.append(tr);
    }
    timetable.append(tbody);
    const scroll=el('div','dj-v723-table-scroll');scroll.append(timetable);
    whole.append(scroll);
    serviceHoursEl.append(whole);
    serviceHoursEl.append(el('p','transport-hours-disclaimer','공식 계획 출발시각표입니다. 실시간 도착시간이 아니며 운행 변경 가능성이 있습니다.'));
    return;

    const visibleLines=(lineSelect.value==='all'?allLines:[lineSelect.value]).filter(Boolean);
    const directions=[
      {code:'1',label:'상행 · 내선',theme:'up'},
      {code:'2',label:'하행 · 외선',theme:'down'}
    ];
    const makeTrainRow=(row)=>{
      const item=el('div','transport-timetable-train');
      const time=document.createElement('time');
      time.className='transport-timetable-train-time';
      time.textContent=String(row.time||'--:--');
      const detail=el('div','transport-timetable-train-info');
      detail.append(el('strong','transport-timetable-train-dest',row.destination?`${row.destination}행`:'행선지 미제공'));
      if(row.express===true)detail.append(el('span','transport-timetable-express','급행'));
      item.append(time,detail);
      return item;
    };
    const lineGrid=el('div','transport-timetable-line-grid');
    for(const line of visibleLines){
      const lineRows=rows.filter(row=>row.line===line);
      const routePanel=el('section','transport-timetable-route-panel');
      const routeHeader=el('header','transport-timetable-route-header');
      const routeTitle=el('strong','transport-timetable-route-title',line);
      routeTitle.prepend(makeLineBadge(line,'metro-panel-badge'));
      routeHeader.append(routeTitle,el('span','transport-timetable-route-count',`${lineRows.length}편`));
      routePanel.append(routeHeader);
      const directionGrid=el('div','transport-timetable-direction-grid');
      for(const direction of directions){
        if(timetableDirection!=='all'&&timetableDirection!==direction.code)continue;
        const dirRows=lineRows.filter(row=>row.directionCode===direction.code);
        const pane=el('section',`transport-timetable-pane transport-timetable-pane--${direction.theme}`);
        pane.setAttribute('aria-label',`${line} ${direction.label} 열차 시간표`);
        const header=el('header','transport-timetable-pane-header');
        const headerText=el('div','transport-timetable-pane-heading');
        headerText.append(el('strong','transport-timetable-pane-title',direction.label),
          el('span','transport-timetable-pane-subtitle','계획 출발시각'));
        header.append(headerText,el('span','transport-timetable-pane-count',`${dirRows.length}편`));
        pane.append(header);
        const list=el('div','transport-timetable-pane-list');
        if(!dirRows.length){
          list.append(el('p','transport-timetable-no-trains','해당 방향에 제공된 시간표가 없습니다.'));
        }else if(line==='9호선'){
          const serviceGrid=el('div','transport-timetable-service-grid');
          const categories=[
            {title:'일반열차',kind:'local',records:dirRows.filter(row=>row.express===false)},
            {title:'급행열차',kind:'express',records:dirRows.filter(row=>row.express===true)},
            {title:'종별 미확인',kind:'unknown',records:dirRows.filter(row=>row.express!==true&&row.express!==false)}
          ];
          for(const category of categories){
            if(category.kind==='unknown'&&!category.records.length)continue;
            const section=el('section',`transport-timetable-service-group transport-timetable-service-group--${category.kind}`);
            section.setAttribute('aria-label',`9호선 ${direction.label} ${category.title} 시간표`);
            const head=el('div','transport-timetable-service-head');
            head.append(el('strong','transport-timetable-service-title',category.title),
              el('span','transport-timetable-service-count',`${category.records.length}편`));
            section.append(head);
            if(category.records.length){
              for(const row of category.records)section.append(makeTrainRow(row));
            }else{
              section.append(el('p','transport-timetable-service-empty',`이 역의 ${category.title} 시간표가 제공되지 않았습니다.`));
            }
            serviceGrid.append(section);
          }
          list.append(serviceGrid);
        }else{
          const grouped=new Map();
          grouped.set(line,dirRows);
          for(const trainRows of grouped.values()){
            for(const row of trainRows)list.append(makeTrainRow(row));
          }
        }
        pane.append(list);directionGrid.append(pane);
      }
      routePanel.append(directionGrid);
      const notes=lineNotes.get(line)||[];
      if(notes.length)routePanel.append(el('p','transport-hours-panel-note',`${line}: ${notes.join(' · ')}`));
      lineGrid.append(routePanel);
    }
    const unknownRows=rows.filter(row=>!['1','2'].includes(row.directionCode));
    if(unknownRows.length){
      lineGrid.append(el('p','transport-hours-notice',`방향 코드가 확인되지 않은 열차 ${unknownRows.length}편은 분리 표시하지 않았습니다.`));
    }
    whole.append(lineGrid);
    serviceHoursEl.append(whole);
    serviceHoursEl.append(el('p','transport-hours-disclaimer','공식 계획 출발시각 기준이며 실제 운행·통과 여부와 다를 수 있습니다. 공휴일은 운영기관 편성에 따라 달라질 수 있습니다.'));
  }
  function serviceHoursQuery(place,day=timetableDay){
    if(!TRANSPORT_API_BASE)return null;
    const params=new URLSearchParams();
    params.set('kind',place.kind);
    if(place.kind==='bus'){
      if(!/^\d{5}$/.test(String(place.arsId||'')))return null;
      params.set('arsId',place.arsId);
    }else{
      const stationName=normalizeStationQueryName(place.name);
      const allLines=Array.isArray(place.lines)&&place.lines.length?place.lines:(SUBWAY_LINES[stationName]||[]);
      params.set('station',stationName);
      // 환승역은 전체 호선을 요청하고, 확대하여 선택한 승강장은 해당 호선만 조회합니다.
      // 신림선 등 미지원 호선도 전달해 서버가 누락 이유를 명시할 수 있게 합니다.
      params.set('line',place.selectedLine||[...new Set(allLines)].join(','));
      params.set('day',day||activeSeoulDay());
    }
    return `${TRANSPORT_API_BASE}/service-hours?${params}`;
  }
  async function refreshServiceHours(place,activeSeq){
    if(!serviceHoursEl)return;
    // Render the last verified plan immediately, then try to refresh in the
    // background. Stored plans carry a time/source label, never a live ETA.
    const selectedDay=timetableDay||activeSeoulDay();
    const remembered=loadTimetable(place,selectedDay);
    if(remembered){timetableExpanded=true;renderServiceHours(remembered);}
    const inline=verifiedInlineOperatorTimetable(place.name,place.selectedLine||'',selectedDay);
    if(inline){timetableExpanded=true;saveTimetable(place,selectedDay,inline);renderServiceHours(inline);return;}
    // Korail Line 1's OFFICIAL station table is bundled with the app. Use the
    // same verified dataset in both the countdown card and the timetable tab;
    // never fall back to an unsupported Metro service-hours response first.
    if(place.kind==='subway' && normalizeLineName(place.selectedLine||'')==='1호선'){
      try{
        const response=await fetch('/data/transport/korail-line1-stations.json',{cache:'no-cache'});
        if(response.ok){
          const payload=await response.json();
          const table=verifiedKorailLine1Timetable(payload,normalizeStationQueryName(place.name),selectedDay);
          if(activeSeq!==seq||selected!==place||panel.hidden)return;
          if(table?.timetable?.length){
            timetableExpanded=true;
            saveTimetable(place,selectedDay,table);
            renderServiceHours(table);
            return;
          }
        }
      }catch{ /* Missing/invalid local Korail table: existing failure state below. */ }
    }
    // For other Sillim stations fetch the operator's publicly posted table
    // through our same-origin API, not an external site navigation.
    if(place.kind==='subway'&&normalizeLineName(place.selectedLine||'')==='신림선'){
      renderServiceHours({status:'loading',notice:'신림선 운영기관 게시 시간표를 확인하고 있습니다.'});
      try{
        const params=new URLSearchParams({station:normalizeStationQueryName(place.name),day:selectedDay});
        const response=await fetch(`${TRANSPORT_API_BASE}/operator-timetable?${params}`);
        const data=await response.json().catch(()=>({}));
        if(activeSeq!==seq||selected!==place||panel.hidden)return;
        if(response.ok&&data.status==='ok'&&Array.isArray(data.timetable)&&data.timetable.length){
          timetableExpanded=true;saveTimetable(place,selectedDay,data);renderServiceHours(data);return;
        }
        if(!remembered)renderServiceHours({status:'unavailable',kind:'subway',requestedLines:['신림선'],
          notice:data.notice||'신림선 운영기관의 역별 전체 시간표를 앱 안으로 불러오지 못했습니다. 잠시 후 다시 조회해 주세요.'});
        return;
      }catch(error){
        if(activeSeq!==seq||selected!==place||panel.hidden)return;
        if(!remembered)renderServiceHours({status:'unavailable',kind:'subway',requestedLines:['신림선'],
          notice:'신림선 운영기관 시간표 서버에 연결하지 못했습니다. 연결을 확인한 뒤 다시 조회해 주세요.'});
        return;
      }
    }
    const url=serviceHoursQuery(place);
    if(!url){if(!remembered)renderServiceHours({notice:place.kind==='bus'?'ARS 정류소 번호가 확인돼야 시간표를 조회할 수 있습니다.':'첫차·막차 시간표는 현재 로컬 API 서버 연결이 필요합니다.'});return;}
    const cacheKey=url;
    const saved=serviceHoursMemo.get(cacheKey);
    if(saved && Date.now()-saved.at<10*60*1000){renderServiceHours(saved.value);return;}
    if(!remembered)renderServiceHours({status:'loading',notice:'계획 운행시간표 서버를 조회하고 있습니다. 공식 운영기관 시간표는 바로 열 수 있습니다.'});
    try{
      const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),30000);
      let response;
      try{response=await fetch(url,{signal:ctrl.signal});}finally{clearTimeout(timer);}
      const body=await response.json().catch(()=>({}));
      if(activeSeq!==seq||selected!==place||panel.hidden)return;
      const data=response.ok?body:{status:'error',notice:body.notice||body.error||'운행시간표 조회에 실패했습니다.'};
      if(response.ok&&data.status==='ok'){
        serviceHoursMemo.set(cacheKey,{at:Date.now(),value:data});
        saveTimetable(place,selectedDay,data);
      }
      if(response.ok&&data.status==='ok'||!remembered)renderServiceHours(data);
    }catch(error){
      if(activeSeq!==seq||selected!==place||panel.hidden)return;
      if(!remembered)renderServiceHours({notice:'운행시간표 서버에 연결하지 못했습니다. 실제 통과 여부는 확인되지 않았습니다.'});
    }
  }
  async function open(place,refresh=false,origin='programmatic',mapEvent=null){
    if(!canOpen())return;
    // Preserve explicit route selection across previous/next-station navigation.
    if(place.kind==='subway'){
      const valid=metroTransferBadgeLines(place.name,[...(place.lines||[]),...(place.selectedLine?[place.selectedLine]:[])]);
      const requested=normalizeLineName(place.selectedLine||'');
      const selectedLine=valid.includes(requested)?requested:(valid[0]||'');
      place={...place,selectedLine,lines:[...new Set([...(place.lines||[]),...valid]) ]};
    }
    const sameStationLineChange=Boolean(refresh&&selected&&!panel.hidden
      &&selected.kind==='subway'&&place.kind==='subway'
      &&normalizeStationQueryName(selected.name)===normalizeStationQueryName(place.name)
      &&normalizeLineName(selected.selectedLine)!==normalizeLineName(place.selectedLine));
    const openKey=`${place.kind}:${place.id||place.name}:${place.selectedLine||''}`;
    if(!windowState.beginOpen(openKey,{origin,refresh,mapEvent}))return;
    // Cancel the outgoing animation *before* changing the content. Otherwise
    // its opacity/clip-path can remain on the next transport card and its
    // delayed callback may hide the newly opened bus or subway information.
    globalThis.window?.DongjakWindowMotion?.cancel?.(panel);
    // This domain controller already rejects ghost map gestures. Preserve a
    // validated new selection through the shared window's recent-close guard.
    if(!sameStationLineChange)globalThis.DongjakWindowLifecycle?.requestOpen?.('transport-sheet');
    const thisSeq=++seq;
    selected=place;
    if(!refresh)delete panel.dataset.djBusRoutePreview;
    updateTransportFavorite();
    if(placeKey(favoritePlace(place))&&!sameStationLineChange)recordRecentPlace(favoritePlace(place));
    visibleServiceHours=null;
    timetableExpanded=false;timetableDay=null;timetableLine='all';timetableDirection='all';
    // Switching a transfer-line tab MUST NOT dismiss/reopen the same sheet.
    if(!sameStationLineChange){onOpen();panel.hidden=false;}
    syncRoutePresentation();
    panel.classList.toggle('dj874-line-switching',sameStationLineChange);
    document.getElementById('app')?.classList?.add?.('transport-sheet-open');
    // One selected coordinate pin. Reuse on line changes and remove on close.
    if(!sameStationLineChange)selectionMarker=createSelectedTransportPin({map,maplibregl,place,previous:selectionMarker});
    const jangseungbaegi = place.kind==='subway'
      && normalizeStationQueryName(place.name)==='장승배기';
    if(panel.dataset)panel.dataset.stationFocus='default';
    // One geographic focus for both buses and metro.  A negative MapLibre
    // offset locates the selected stop just ABOVE the viewport midpoint, so
    // the card does not cover its marker.  Changing a transfer line must not
    // move the camera again or re-open the sheet animation.
    if(!sameStationLineChange && !refresh && Number.isFinite(Number(place.lng)) && Number.isFinite(Number(place.lat))
      && Number(place.lng)>=125 && Number(place.lng)<=128 && Number(place.lat)>=36 && Number(place.lat)<=39){
      const mapBounds=map.getContainer?.()?.getBoundingClientRect?.();
      const viewportHeight=mapBounds?.height||map.getContainer?.()?.clientHeight||globalThis.innerHeight||800;
      const phoneFocus=true;
      const upward=Math.round(Math.min(112,Math.max(46,viewportHeight*.10)));
      const offsetY=phoneFocus
        ?mobileTransportFocusOffset({viewportHeight,panelTop:panel.getBoundingClientRect?.()?.top,
          containerTop:mapBounds?.top||0})
        :-upward;
      const focusZoom=place.kind==='bus'?16.5:15.3;
      // Always focus a newly selected stop in the unobscured map area.
      try{map.easeTo?.({center:[Number(place.lng),Number(place.lat)],offset:[0,offsetY],
        zoom:Math.max(map.getZoom?.()||0,focusZoom),duration:420});}
      catch(error){console.debug('[교통 위치 초점 이동 실패]',error);}
      // The previous rAF + timeout focus correction moved the camera twice
      // after the initial easeTo and caused visible jitter. Keep one move.
    }
    kindEl.textContent=place.kind==='bus'?'버스정류장':'지하철역';
    const stationTitle=(place.kind==='subway'&&normalizeStationQueryName(place.name)==='이수')
      ?'이수역 · 총신대입구역'
      :place.kind==='bus'?busStopDisplayName(place):`${normalizeStationQueryName(place.name)}역`;
    // Keep the same header DOM while selecting another line. Replacing the
    // entire header can flash on iOS and steal the focused badge tap.
    if(!sameStationLineChange)title.replaceChildren();
    if(place.kind==='subway'){
      const badgeLines=metroTransferBadgeLines(place.name,
        [...(place.lines||[]),...(place.selectedLine?[place.selectedLine]:[])]);
      if(!sameStationLineChange)title.append(document.createTextNode(stationTitle));
      if(sameStationLineChange){
        for(const btn of title.querySelectorAll('.dj-metro-line-selector')){
          const line=btn.dataset.djLine;
          const active=normalizeLineName(place.selectedLine||'')===line;
          btn.setAttribute('aria-pressed',String(active));
          btn.style.removeProperty('border-color');
          btn.querySelector('.metro-panel-badge')?.classList.toggle('dj-active-transfer-line',active);
        }
      }
      if(!sameStationLineChange)for(const line of badgeLines){
        const button=document.createElement('button');button.type='button';
        button.className='dj-metro-line-selector';button.dataset.djLine=normalizeLineName(line);button.style.setProperty('--dj-line-color',subwayLineColor(line));
        button.setAttribute('aria-label',`${line} 호선으로 전환`);
        button.setAttribute('aria-pressed',String(normalizeLineName(place.selectedLine||'')===line));
        button.title=`${line} 정보 보기`;
        const badge=makeLineBadge(line,'metro-panel-badge');
        badge.style.setProperty('background-color',subwayLineColor(line),'important');
        badge.style.setProperty('color','#fff','important');
        button.style.setProperty('background-color','transparent','important');
        // Selection is rendered by the compact header material, not an inline outer border.
        if(normalizeLineName(place.selectedLine||'')===line)badge.classList.add('dj-active-transfer-line');
        button.append(badge);
        // Treat transfer selection as an interaction within this sheet, never
        // as an outside click that can dismiss it or activate the route tab.
        for(const type of ['pointerdown','pointerup','touchstart','touchend']){
          button.addEventListener(type,event=>event.stopPropagation(),{passive:true});
        }
        button.addEventListener('click',event=>{
          event.preventDefault();event.stopPropagation();
          const current=selected;
          if(!current||current.kind!=='subway'||normalizeLineName(current.selectedLine||'')===line)return;
          // Use current state, not the closure captured when the header was created.
          void open({...current,selectedLine:line},true);
        });
        title.append(button);
      }
    }else if(!sameStationLineChange)title.textContent=place.kind==='bus'?stationTitle.replace(/역\s*(\d+)번\s*출구/g,'역 $1번 출구'):stationTitle;
    // The selected route badge and station name form one centered heading.
    title.classList?.toggle?.('subway-title',place.kind==='subway');
    if(panel.dataset)panel.dataset.kind=place.kind;
    if(title.dataset){if(place.kind==='bus'&&/^\d{5}$/.test(String(place.arsId||'')))title.dataset.dj912Ars=String(place.arsId);else delete title.dataset.dj912Ars;}
    panel.style?.setProperty?.('--transport-line-color',place.kind==='subway'
      ? subwayLineColor(place.selectedLine||place.lines?.[0]||'') : '#13836b');
    // Do not always reset to realtime when the user explicitly chose the timetable.
    syncTimetableTabVisibility(place);
    selectTransportMode(preferredTransportView);
    description.textContent=place.kind==='bus'
      ? (place.median?`중앙차로 실제 정류소 위치 · ARS ${place.arsId}${place.direction?` · ${place.direction} 방면`:''}`
        :place.arsId?`ARS 정류소번호 ${place.arsId}`:'ARS 정류소번호 미확인 · 지도 데이터 기반')
      :place.selectedLine?`${place.selectedLine} 선택 · 표시 위치는 호선별 역사 기준점 또는 근사점입니다.`:'노선별 도착정보는 서울시 API 기준으로 표시합니다.';
    chips.replaceChildren();
    chips.append(el('span','transport-chip',place.kind==='bus'?'버스':'지하철'));
    if(place.kind==='subway'){
      for(const line of place.lines){
        const chip=el('span','transport-chip transport-chip-line',line);
        chip.setAttribute('style',subwayLineStyle(line));
        chip.prepend(makeLineBadge(line,'metro-panel-badge'));
        chips.append(chip);
      }
    }
    if(place.arsId)chips.append(el('span','transport-chip muted',`ARS ${place.arsId}`));
    if(place.median && place.direction)chips.append(el('span','transport-chip muted',`${place.direction} 방면`));
    neighborsEl?.replaceChildren(...(place.kind==='subway'&&place.selectedLine && Object.hasOwn(SUBWAY_LINE_COLORS,normalizeLineName(place.selectedLine))
      ?[createMetroLineCard(place.selectedLine,place.name)]:[]));
    // v7.0.25: previous/next station controls select that station and recenter
    // the real map. Only resolve names present in our validated local station
    // set; an unverified/terminal station remains descriptive text.
    if(place.kind==='subway'){
      const nearbyStations=combineStations();
      for(const card of neighborsEl?.querySelectorAll('.metro-neighbor-row')||[]){
        const line=normalizeLineName(card.dataset.line||place.selectedLine||place.lines?.[0]||'');
        const adjacent=adjacentStationNames(place.name,line);
        for(const [selector,name] of [['.metro-rail-previous',adjacent.previous],['.metro-rail-next',adjacent.next]]){
          const neighbor=card.querySelector(selector);
          if(!neighbor||!name)continue;
          const destination=nearbyStations.find(item=>item.kind==='subway' &&
            lineStationKey(item.name)===lineStationKey(name) && (item.lines||[]).some(l=>normalizeLineName(l)===line));
          if(!destination)continue;
          neighbor.setAttribute('role','button');neighbor.setAttribute('tabindex','0');
          neighbor.setAttribute('aria-label',`${name}역 정보 보기`);
          const activate=()=>{
            if(!canNavigateToMetroNeighbor(destination,isDongjak,isNearBoundary)){
              let notice=card.querySelector('.metro-neighbor-status');
              if(!notice){
                notice=el('p','metro-neighbor-status');
                notice.setAttribute('role','status');
                card.append(notice);
              }
              notice.textContent=`${name}역은 동작구 밖의 지역입니다. 동작구 경계 인접 역이 아니므로 이동할 수 없습니다.`;
              return;
            }
            card.querySelector('.metro-neighbor-status')?.remove();
            map.easeTo?.({center:[destination.lng,destination.lat],zoom:Math.max(map.getZoom?.()||0,15.2),duration:550});
            void open({...destination,selectedLine:line});
          };
          neighbor.addEventListener('click',activate);
          neighbor.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();activate();}});
        }
      }
    }
    // Keep the same interactive neighbor pill above every API result or error.
    const selectionBox=panel.querySelector?.('.transport-selection-box');
    if(place.kind==='subway'&&sectionLive?.parentNode)
      sectionLive.parentNode.insertBefore(neighborsEl,sectionLive);
    else if(place.kind==='bus'&&selectionBox?.parentNode)
      selectionBox.parentNode.insertBefore(neighborsEl,selectionBox);
    arrivalsEl.setAttribute?.('aria-busy','true');
    if(!sameStationLineChange)arrivalsEl.replaceChildren(el('p','transport-empty','실시간 도착정보 연결 상태를 확인하고 있습니다.'));
    else {
      // The previous line's live results must never be presented as the newly
      // selected line. Keep the sheet/header in place, replace only its data.
      arrivalsEl.replaceChildren(el('p','transport-empty',`${place.selectedLine} 도착정보 불러오는 중`));
      if(arrivalsEl.dataset)arrivalsEl.dataset.loadingLine=place.selectedLine||'';
    }
    updatedEl.textContent='';
    syncArrivalAvailability(place,place.kind==='subway'&&stationMetroQuotaUntil>Date.now()?stationMetroQuotaResult:null);
    void refreshServiceHours(place,thisSeq);
    const arrival=await requestArrival(place,{forceRefresh:refresh&&!sameStationLineChange});
    if(thisSeq!==seq)return;
    arrivalsEl.removeAttribute?.('aria-busy');
    if(arrivalsEl.dataset)delete arrivalsEl.dataset.loadingLine;
    if(arrival.state==='ok'){
      if(place.kind==='bus')storeBusObservation(place.arsId||arrival.arsId,arrival.items||[]);
      if(arrival.arsId && !place.arsId){
        place.arsId=arrival.arsId;
        if(title.dataset&&place.kind==='bus'&&/^\d{5}$/.test(String(place.arsId)))title.dataset.dj912Ars=String(place.arsId);
        description.textContent=`ARS 정류소번호 ${place.arsId}`;
        chips.append(el('span','transport-chip muted',`ARS ${place.arsId}`));
        if(place.kind==='bus')void refreshServiceHours(place,thisSeq);
      }
      await showArrivalOrPlannedCountdown(arrivalsEl,place,arrival,thisSeq);
      if(thisSeq!==seq||selected!==place||panel.hidden)return;
      updatedEl.textContent=arrival.updatedAt?`${arrival.updatedAt} 갱신`:arrival.checkedAt?`${arrival.checkedAt} 조회`:'조회 완료';
    } else {
      const message=arrival.state==='unconfigured'?'실시간 도착정보 서버가 아직 연결되지 않았습니다.':arrival.message;
      await showArrivalOrPlannedCountdown(arrivalsEl,place,
        {...arrival,sourceStatus:arrival.sourceStatus||'unverified',emptyMessage:message},thisSeq);
    }
  }
  // Refresh only the currently visible stop/station, without rebuilding the entire panel.
  // Hidden tabs and inactive pages must not poll the public data API.
  let arrivalPolling=false;
  async function autoRefreshSelectedArrival(){
    if(!selected||panel.hidden||document.hidden||arrivalPolling||arrivalInFlight.has(arrivalRequestKey(selected)))return;
    if(selected.kind==='subway'&&stationMetroQuotaUntil>Date.now())return;
    const active=selected,activeSeq=seq;
    arrivalPolling=true;
    try{
      const next=await requestArrival(active,{forceRefresh:true});
      if(activeSeq!==seq||selected!==active||panel.hidden)return;
      if(next.state==='ok'){
        if(active.kind==='bus')storeBusObservation(active.arsId||next.arsId,next.items||[]);
        await showArrivalOrPlannedCountdown(arrivalsEl,active,next,activeSeq);
        if(activeSeq!==seq||selected!==active||panel.hidden)return;
        updatedEl.textContent=next.updatedAt?`${next.updatedAt} 갱신`:next.checkedAt?`${next.checkedAt} 조회`:'조회 완료';
        if(visibleServiceHours)renderServiceHours(visibleServiceHours);
      }else{
        await showArrivalOrPlannedCountdown(arrivalsEl,active,
          {...next,sourceStatus:next.sourceStatus||'unverified',emptyMessage:next.message||'실시간 정보를 갱신하지 못했습니다.'},activeSeq);
        if(activeSeq!==seq||selected!==active||panel.hidden)return;
        updatedEl.textContent=next.sourceStatus==='quota'?'조회 한도 초과':'연결 확인 필요';
      }
    }catch(error){console.warn('[실시간 도착정보 갱신]',error);}
    finally{arrivalPolling=false;}
  }
  const arrivalInterval=setInterval(()=>{void autoRefreshSelectedArrival();},15000);
  arrivalInterval?.unref?.(); // prevent Node unit-test timers from holding the process open
  document.addEventListener?.('visibilitychange',()=>{
    if(!document.hidden)void autoRefreshSelectedArrival();
  });
  for(const [layerId,kind] of [['transport-bus-stop','bus'],['dj-transport-bus-pictogram','bus'],['transport-subway-station-shadow','subway'],['transport-subway-station','subway'],['transport-subway-glyph','subway'],['transport-subway-names','subway'],['transport-bus-names','bus'],['transport-bus-names-close','bus']]){
    map.on('click',layerId,event=>{
      if(!canOpen())return;
      const id=event.features?.[0]?.properties?.osmId;
      const place=stops.get(id);
      if(place && !(place.kind==='subway' && isDongjak(place.lng,place.lat)!==true && !isNearBoundary(place.lng,place.lat))){
        event.originalEvent?.stopPropagation();void open(place,false,'map',event);
      }
    });
    map.on('mouseenter',layerId,()=>{if(canOpen())map.getCanvas().style.cursor='pointer';});
    map.on('mouseleave',layerId,()=>{map.getCanvas().style.cursor='';});
  }
  // 배경 지도의 버스 아이콘과 기차 아이콘은 poi_transit 하나의 레이어에 들어갑니다.
  // 이 이벤트는 외부 위치 검색 서버 없이 작동합니다.
  function tryOpenBasemap(event){
    if(!canOpen() || !panel.hidden)return false;
    const point=event.point;
    const precise=['dj-metro-summary-icon','dj-metro-summary-name','dj-metro-detail-icon','dj-metro-detail-name'].filter(id=>map.getLayer(id));
    if(precise.length && map.queryRenderedFeatures(point,{layers:precise}).some(f=>precise.includes(f.layer?.id)))return false;
    // 모바일 터치를 고려해 주변 12px까지 검색합니다. 레이어 클릭 이벤트에는 feature가 직접 들어옵니다.
    const nearby=event.features?.length?event.features:map.queryRenderedFeatures(
      [[point.x-12,point.y-12],[point.x+12,point.y+12]],
      {layers:map.getStyle().layers.filter(layer=>layer.type==='symbol' &&
        (layer['source-layer']==='poi'||/^poi[_-]/.test(layer.id))).map(layer=>layer.id)}
    );
    const candidates=nearby.map(f=>baseMapTransitPlace(f,event.lngLat)).filter(Boolean)
      .filter(p=>(p.kind==='bus'
        ? (map.getZoom?.()??16)>=15 && isDongjak(p.lng,p.lat)===true
        : isDongjak(p.lng,p.lat)===true||isNearBoundary(p.lng,p.lat)));
    if(!candidates.length)return false;
    // 지도 클릭 지점과 실제 아이콘 좌표 사이의 거리로 가까운 정류소를 선택합니다.
    candidates.sort((a,b)=>{
      const ap=map.project([a.lng,a.lat]);const bp=map.project([b.lng,b.lat]);
      return Math.hypot(ap.x-point.x,ap.y-point.y)-Math.hypot(bp.x-point.x,bp.y-point.y);
    });
    event.originalEvent?.stopPropagation();
    void open(candidates[0],false,'map',event);
    return true;
  }
  for(const layerId of ['poi_transit','dj-basemap-bus-pictogram']){
    if(!map.getLayer(layerId))continue;
    map.on('click',layerId,tryOpenBasemap);
    map.on('mouseenter',layerId,event=>{
      if(canOpen() && event.features?.some(f=>baseMapTransitPlace(f,event.lngLat)))map.getCanvas().style.cursor='pointer';
    });
    map.on('mouseleave',layerId,()=>{map.getCanvas().style.cursor='';});
  }
  // 아이콘 옆 라벨/터치 오차도 처리합니다. 버스 class와 철도 rail class 모두 허용합니다.
  map.on('click',tryOpenBasemap);
  fetchAndShow();
}
