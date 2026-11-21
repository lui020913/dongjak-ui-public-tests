/**
 * 동작구 지하철역 기준 위치 (WGS84 longitude, latitude).
 * 출처: 서울시 지하철역_GEOM (역사마스터) — 2026-06 관측분을 정규화한 공개 CSV.
 * https://t-data.seoul.go.kr/dataprovide/trafficdataviewfile.do?data_id=36
 * 신길역: 1호선 승강장 위치를 우선하기 위해 5호선 역사마스터 대표점 대신
 *   1호선별 역 좌표(https://ciy545.tistory.com/293)를 사용했습니다.
 * 정규화 사본: https://github.com/daehyub71/seoul-subway-insight/blob/main/data/station_coords_canonical.csv
 *
 * 중요: 대림역은 OSM의 호선별 승강장 위치를 보정 반영했습니다. 다른 역은 역사마스터 좌표입니다.
 * 중요: 역 위치는 역사마스터 좌표를 기본으로 합니다. 노선 곡선은 이 역 좌표를 통과하는
 * 오프라인 '안내용 개략선'이며 터널/선로의 측량 데이터가 아닙니다.
 * 이 파일 자체는 오프라인 백업 선형이며 Overpass를 호출하지 않습니다.
 * 브라우저의 공식 GIS 노선 선형 조회 성공 시 실제 선형이 우선 표시됩니다.
 */
export const VERIFIED_STATIONS = Object.freeze({"영등포":[126.907628,37.515504],"신길":[126.9177569,37.5170255],"대방":[126.926382,37.513342],"노량진":[126.941005,37.513534],"용산":[126.964561,37.529849],"대림":[126.89562,37.492885],"구로디지털단지":[126.901401,37.485266],"신대방":[126.913149,37.487462],"신림":[126.929715,37.484201],"봉천":[126.941892,37.482362],"서울대입구":[126.952739,37.481247],"낙성대":[126.963693,37.47693],"사당":[126.981651,37.476955],"방배":[126.997596,37.481426],"이촌":[126.974733,37.522295],"동작":[126.978153,37.502878],"총신대입구":[126.981989,37.486263],"남태령":[126.989134,37.463873],"신풍":[126.90993,37.50008],"보라매":[126.920428,37.499872],"신대방삼거리":[126.928276,37.499701],"장승배기":[126.93915,37.504898],"상도":[126.94791,37.502834],"숭실대입구":[126.953822,37.496029],"남성":[126.971251,37.484596],"이수":[126.981605,37.485196],"내방":[126.993513,37.487618],"샛강":[126.928422,37.517274],"노들":[126.953222,37.512887],"흑석":[126.963708,37.50877],"구반포":[126.987332,37.501364],"신반포":[126.995925,37.503415],"서울지방병무청":[126.9227083,37.5060464],"보라매공원":[126.9180827,37.4955691],"보라매병원":[126.9234964,37.4929598],"당곡":[126.9275133,37.4902998],"서원":[126.9330365,37.4782341],"서울대벤처타운":[126.9339351,37.4720019],"관악산":[126.9450639,37.4691018]});
export const FIXED_RAIL_STATION_ORDER = Object.freeze({"1":["영등포","신길","대방","노량진","용산"],"2":["대림","구로디지털단지","신대방","신림","봉천","서울대입구","낙성대","사당","방배"],"4":["이촌","동작","총신대입구","사당","남태령"],"7":["대림","신풍","보라매","신대방삼거리","장승배기","상도","숭실대입구","남성","이수","내방"],"9":["샛강","노량진","노들","흑석","동작","구반포","신반포"],"신림":["샛강","대방","서울지방병무청","보라매","보라매공원","보라매병원","당곡","신림","서원","서울대벤처타운","관악산"]});

// 두 역사 좌표 사이에 부드러운 호선 곡선을 생성하고, 각 역 좌표는 반드시 통과시킵니다.
// 급곡선에서 출렁이는 현상을 줄이기 위해 tangent를 인접 역 간 거리로 제한합니다.
function curveBetween(prev,a,b,next,steps=16){
  const v0=prev||a, v3=next||b;
  const localScale=Math.cos((a[1]+b[1])*Math.PI/360);
  const toXY=p=>[p[0]*localScale,p[1]];
  const P0=toXY(v0),P1=toXY(a),P2=toXY(b),P3=toXY(v3);
  const delta=Math.hypot(P2[0]-P1[0],P2[1]-P1[1]);
  const clamp=(v)=>{
    const n=Math.hypot(...v)||1;
    const lim=delta*0.48;
    return n>lim?[v[0]*lim/n,v[1]*lim/n]:v;
  };
  const t1=clamp([(P2[0]-P0[0])*0.34,(P2[1]-P0[1])*0.34]);
  const t2=clamp([(P3[0]-P1[0])*0.34,(P3[1]-P1[1])*0.34]);
  const out=[];
  for(let j=0;j<=steps;j++){
    const t=j/steps, t2n=t*t,t3=t2n*t;
    const h00=2*t3-3*t2n+1,h10=t3-2*t2n+t,h01=-2*t3+3*t2n,h11=t3-t2n;
    const x=h00*P1[0]+h10*t1[0]+h01*P2[0]+h11*t2[0];
    const y=h00*P1[1]+h10*t1[1]+h01*P2[1]+h11*t2[1];
    out.push(j===0?a:j===steps?b:[Number((x/localScale).toFixed(8)),Number(y.toFixed(8))]);
  }
  return out;
}
function routePoints(points){
  const result=[];
  for(let i=0;i<points.length-1;i++){
    const p=curveBetween(points[i-1]||points[i],points[i],points[i+1],points[i+2]||points[i+1]);
    if(i) p.shift();
    result.push(...p);
  }
  return result;
}
// 도로·하천 회랑을 참고해 역 사이의 도식적 직선 연결을 완화한 안내용 제어점.
// 실제 지하 선로 중심선이 확인되면 MOIS 공개 선형을 우선 사용합니다.
// 확인되지 않은 역을 새로 추가하거나 기존 역 좌표를 옮기지 않습니다.
export const CORRIDOR_GUIDES=Object.freeze({
  '2':Object.freeze({
    '구로디지털단지>신대방':[
      [126.9032,37.48471],[126.9054,37.48448],[126.9067,37.48464],
      [126.9091,37.48542],[126.9112,37.48652]
    ],
    '신대방>신림':[
      [126.9156,37.48746],[126.9178,37.48718],[126.9202,37.48653],
      [126.9227,37.48578],[126.9252,37.48516],[126.9275,37.48458]
    ]
  }),
  '7':Object.freeze({
    '신대방삼거리>장승배기':[
      [126.9306,37.49993],[126.9329,37.50087],
      [126.9354,37.50330],[126.9374,37.50441]
    ],
    '장승배기>상도':[
      [126.9408,37.50491],[126.9423,37.50461],
      [126.9445,37.50392],[126.9462,37.50329]
    ]
  })
});
// 대림역은 2호선(고가)과 7호선(지하)의 승강장 중심이 다릅니다.
// OpenStreetMap railway=stop 위치 참조:
// 2호선 https://www.openstreetmap.org/node/5907762741
// 7호선 https://www.openstreetmap.org/node/6048953573
// 마커는 두 점의 중간값(VERIFIED_STATIONS.대림), 노선은 각각 실제 승강장 쪽을 통과합니다.
// 동작역은 4호선(동쪽 고가)과 9호선(서쪽 지하)이 공간적으로 구분됩니다.
// 두 동작역 점은 출입구 분포를 기준으로 조정한 *지도 표시용 근사점*이며
// 승강장 측량 좌표가 아닙니다. 출입구 분포 참조: https://www.findlatlng.org/en/place/dongjak
const PLATFORM_CENTERS = Object.freeze({
  '2':Object.freeze({'대림':Object.freeze([126.89496,37.49328])}),
  '4':Object.freeze({'동작':Object.freeze([126.98015,37.50278])}),
  '7':Object.freeze({'대림':Object.freeze([126.89628,37.49249])}),
  '9':Object.freeze({'동작':Object.freeze([126.97696,37.50332])})
});
function railStationCoord(name,line){
  return PLATFORM_CENTERS[line]?.[name] || VERIFIED_STATIONS[name] || FADE_GUIDE_COORDS[name];
}
function routeFor(stations,line=''){
  const points=[];
  for(let i=0;i<stations.length;i++){
    points.push(railStationCoord(stations[i],line));
    if(i<stations.length-1){
      const key=`${stations[i]}>${stations[i+1]}`;
      points.push(...(CORRIDOR_GUIDES[line]?.[key]||[]));
    }
  }
  if(points.some(p=>!p))throw new Error(`${line} 노선 구간 좌표 누락`);
  return routePoints(points);
}
// 실제 표시 마지막 역 이후 구간도 '가상의 직선 외삽' 대신 공개 역사 좌표로 유도합니다.
// 아래 역들은 노선 모양을 잡기 위한 제어점이며, 추가 역 마커로 표시하지 않습니다.
// 좌표 출처: 서울시 역사마스터 정규화 사본 (STATION_COORDS.md)
const FADE_GUIDE_COORDS=Object.freeze({
  '신도림':[126.89108,37.50896],
  '남영':[126.97130,37.54102],
  '서울역':[126.97103,37.55723],
  '서초':[127.00792,37.49190],
  '교대':[127.01467,37.49396],
  '삼각지':[126.97260,37.53408],
  '신용산':[126.96789,37.52917],
  '선바위':[127.00230,37.45167],
  '남구로':[126.88725,37.48606],
  '고속터미널':[127.00492,37.50489],
  '국회의사당':[126.91787,37.52810],
  '여의도':[126.92436,37.52175],
  '사평':[127.01526,37.50421]
});
// before는 서쪽/북쪽 끝에서 첫 표시 역 방향, after는 마지막 표시 역에서 바깥 방향입니다.
export const FADE_GUIDE_STATIONS=Object.freeze({
  '1':{before:['신도림'],after:['남영','서울역']},
  '2':{before:['신도림'],after:['서초','교대']},
  '4':{before:['삼각지','신용산'],after:['선바위']},
  '7':{before:['남구로'],after:['고속터미널']},
  '9':{before:['국회의사당','여의도'],after:['고속터미널','사평']},
  '신림':{before:[],after:[]}
});
function railWithFadingEnds(line,stations){
  if(line==='신림')return routeFor(stations,line); // 신림선 종착역 샛강/관악산은 임의 연장 금지
  const {before,after}=FADE_GUIDE_STATIONS[line];
  const names=[...before,...stations,...after];
  // 역 좌표를 다시 덮어쓰지 않고, 안내용 페이드 제어점만 연결합니다.
  return routeFor(names,line);
}
export const railGeojson={type:'FeatureCollection',features:Object.entries(FIXED_RAIL_STATION_ORDER).map(([line,stations])=>({
  type:'Feature',properties:{line,name:line==='신림'?'신림선':`${line}호선`,source:'official-station-anchored-schematic',accuracy:'station-verified-track-schematic'},
  geometry:{type:'LineString',coordinates:railWithFadingEnds(line,stations)}
}))};
export const stationsGeojson={type:'FeatureCollection',features:Object.entries(FIXED_RAIL_STATION_ORDER).flatMap(([line,stations])=>stations.map(name=>({
  type:'Feature',properties:{name:`${name}역`,line,lines:line,source:name==='대림'?'osm-railway-stop':name==='동작'?'station-exit-based-schematic':'seoul-station-geom-master'},
  geometry:{type:'Point',coordinates:railStationCoord(name,line)}
})))};

export const fallbackBoundary={type:'FeatureCollection',features:[{type:'Feature',properties:{name:'동작구 경계 (근사)',accuracy:'schematic-not-official'},geometry:{type:'Polygon',coordinates:[[[126.913,37.501],[126.9195,37.506],[126.923,37.5125],[126.9337,37.5175],[126.94,37.5181],[126.948,37.5159],[126.959,37.515],[126.972,37.5107],[126.9794,37.5082],[126.9808,37.5003],[126.9891,37.4903],[126.9881,37.4813],[126.9815,37.4756],[126.974,37.4763],[126.9656,37.4824],[126.956,37.4852],[126.946,37.4872],[126.938,37.488],[126.929,37.4892],[126.922,37.4916],[126.913,37.501]]]}}]};
export const DATA_IS_SCHEMATIC=true;
