import {APP_VERSION} from '../src/app-version.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {metroMarkerGeojson,visibleMetroLayerRole} from '../src/metro-marker-geodata.js';
import {metroLineMarkerPlacements,normalizeStationQueryName} from '../src/transport-map.js';
import {fixedMetroStations} from '../src/fixed-rail-lines.js';
import {railGeojson,stationsGeojson} from '../src/fixed-rail-data.js';
import {entranceNumber,parsePublicExitArcGIS} from '../src/station-accessibility.js';

const normRoute=route=>String(route).trim();
const colors={'1호선':'#0052A4','9호선':'#B89B2F','4호선':'#00A5DE','7호선':'#747F00'};

function distanceMeters(a,b){
  const lat=(a[1]+b[1])*Math.PI/360;
  return Math.hypot((a[0]-b[0])*111320*Math.cos(lat),(a[1]-b[1])*111320);
}
function distancePointToSegment(p,a,b){
  const lat=(p[1]+a[1]+b[1])*Math.PI/540;
  const sx=111320*Math.cos(lat), sy=111320;
  const ax=(a[0]-p[0])*sx, ay=(a[1]-p[1])*sy;
  const bx=(b[0]-p[0])*sx, by=(b[1]-p[1])*sy;
  const dx=bx-ax, dy=by-ay;
  const t=Math.max(0,Math.min(1,(-ax*dx-ay*dy)/((dx*dx+dy*dy)||1)));
  return Math.hypot(ax+t*dx,ay+t*dy);
}
function distancePointToLine(point,lineCoords){
  let best=Infinity;
  for(let i=1;i<lineCoords.length;i++)best=Math.min(best,distancePointToSegment(point,lineCoords[i-1],lineCoords[i]));
  return best;
}
function convert(items){return metroMarkerGeojson(items,{canonicalStations:fixedMetroStations(),normalizeName:normalizeStationQueryName,
  normalizeLine:normRoute,placements:metroLineMarkerPlacements,colors,radiusPredicate:()=>true,
  isDistrict:()=>true});}

test('역을 지도 지리 좌표로 저장하며 팬/줌에 따른 픽셀 위치를 별도 저장하지 않는다',()=>{
  const data=convert([{kind:'subway',name:'노량진',lng:126.92,lat:37.5,lines:['1호선','9호선']}]);
  const detail=data.features.filter(f=>f.properties.stationKey==='노량진'&&f.properties.role==='detail');
  assert.equal(detail.length,2);
  for(const f of detail){
    const expected=stationsGeojson.features.find(x=>x.properties.name==='노량진역'&&`${x.properties.line}호선`===f.properties.line);
    const lineCode=String(f.properties.line).replace(/호선$/,'').replace('신림선','신림');
    const lineGeom=railGeojson.features.find(x=>x.properties.line===lineCode)?.geometry?.coordinates || [];
    assert.ok(distancePointToLine(f.geometry.coordinates,lineGeom)<1.0,'역 아이콘은 노선 위 지리 좌표에 놓인다');
    assert.ok(distanceMeters(f.geometry.coordinates,expected.geometry.coordinates)<=40,'역 위치는 실제 역사 중심에서 과도하게 멀어지지 않는다');
    assert.ok(Array.isArray(f.properties.offset),'아이콘 픽셀 오프셋 속성은 남아도 지도 레이어는 좌표 기준으로 사용');
  }
  assert.notDeepEqual(detail[0].geometry.coordinates,detail[1].geometry.coordinates,'같은 기준점을 공유하는 환승역은 각 노선 위에서 약간 분리된다');
  const summary=data.features.filter(f=>f.properties.stationKey==='노량진'&&f.properties.role==='summary');
  assert.equal(summary.length,2,'축소 상태에서도 환승역은 호선별 원 두 개를 붙여 표시한다');
  assert.deepEqual(summary.map(f=>f.properties.badge).sort(),['1','9']);
  assert.ok(summary.every(f=>f.properties.iconLines.length===1),'각 원 안에는 한 호선만 표시한다');
  assert.equal(new Set(summary.map(f=>f.properties.iconOffset.join(','))).size,2);
  assert.deepEqual(summary.map(f=>f.properties.iconOffset[0]).sort((a,b)=>a-b),[-34,34]);
  assert.equal(summary.filter(f=>f.properties.labelOn).length,1,'원거리에서는 역명을 한 번만 표시한다');
  assert.equal(detail.filter(f=>f.properties.labelOn).length,1,'가까이 확대해도 동일 역명은 한 번만 표시한다');
  assert.deepEqual(detail.map(f=>f.properties.label).sort(),['노량진역','노량진역']);
  assert.deepEqual(detail.map(f=>f.properties.badge).sort(),['1','9'],'호선별 숫자만 표시한다');
});

test('동작역처럼 승강장 좌표가 다른 환승역은 확대했을 때 별도 좌표로 표시',()=>{
  const data=convert([{kind:'subway',name:'동작',lng:126.978153,lat:37.502878,lines:['4호선','9호선']}]);
  const detail=data.features.filter(f=>f.properties.stationKey==='동작'&&f.properties.role==='detail');
  assert.equal(detail.length,2);
  assert.notDeepEqual(detail[0].geometry.coordinates,detail[1].geometry.coordinates);
  assert.equal(data.features.filter(f=>f.properties.stationKey==='동작'&&f.properties.role==='summary').length,2);
  assert.equal(visibleMetroLayerRole(12.0),'hidden');
  assert.equal(visibleMetroLayerRole(14.0),'summary');
  assert.equal(visibleMetroLayerRole(15.55),'detail');
  assert.equal(visibleMetroLayerRole(15.5),'summary');
  assert.equal(visibleMetroLayerRole(10.1),'hidden');
  assert.equal(visibleMetroLayerRole(10.8),'hidden');
});

test('출입구 번호 3-1, 12는 그대로 보존하며 번호가 없으면 임의 생성하지 않는다',()=>{
  assert.equal(entranceNumber('3-1번 출구'),'3-1');
  const data=parsePublicExitArcGIS({features:[
    {geometry:{x:126.954,y:37.512},attributes:{entrc_no:'12',stn_nm:'노들'}},
    {geometry:{x:126.955,y:37.512},attributes:{entrc_nm:'출입구',stn_nm:'노들'}}
  ]});
  assert.equal(data.features[0].properties.number,'12');
  assert.equal(data.features[1].properties.number,'');
});

test('메트로 지도 표시·메인 클릭 경로·버전 메타데이터가 동일하다',()=>{
  const root=new URL('../',import.meta.url);
  const code=readFileSync(new URL('src/transport-map.js',root),'utf8');
  const main=readFileSync(new URL('src/main.js',root),'utf8');
  const html=readFileSync(new URL('index.html',root),'utf8');
  const pkg=JSON.parse(readFileSync(new URL('package.json',root),'utf8'));
  const info=JSON.parse(readFileSync(new URL('src/build-info.json',root),'utf8'));
  assert.match(code,/map.addSource\(stationSource,\{type:'geojson'/);
  assert.match(code,/icon-offset':\['get','iconOffset'\]/);
  assert.doesNotMatch(code,/new maplibregl.Marker\(\{element:markerEl/);
  assert.match(main,/dj-metro-detail-icon/);
  assert.doesNotMatch(html,/>업데이트<\/button>/);
  assert.equal(pkg.version,APP_VERSION);
  assert.equal(info.version,pkg.version);
});
