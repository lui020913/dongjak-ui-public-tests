import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fixedMetroStations, fixedRailCollection} from '../src/fixed-rail-lines.js';
import {metroMarkerGeojson,visibleMetroLayerRole} from '../src/metro-marker-geodata.js';
import {metroLineMarkerPlacements,indexRenderedMetroRail,normalizeStationQueryName} from '../src/transport-map.js';

const colors={'1호선':'#0052A4','2호선':'#00A84D','4호선':'#00A5DE','7호선':'#747F00','9호선':'#B89B2F','신림선':'#6789CA'};
const stations=fixedMetroStations();
const mk=(paths)=>metroMarkerGeojson(stations,{
  normalizeName:normalizeStationQueryName,normalizeLine:x=>x,
  placements:(name,lines,lng,lat)=>metroLineMarkerPlacements(name,lines,lng,lat,paths),
  colors,radiusPredicate:()=>true,isDistrict:()=>true
});
function distanceToSegment(p,a,b){
  const lat=p[1]*Math.PI/180,dx=111320*Math.cos(lat),dy=111320;
  const vx=(b[0]-a[0])*dx,vy=(b[1]-a[1])*dy;
  const px=(p[0]-a[0])*dx,py=(p[1]-a[1])*dy;
  const t=Math.max(0,Math.min(1,(px*vx+py*vy)/((vx*vx+vy*vy)||1)));
  return Math.hypot(px-t*vx,py-t*vy);
}
function distanceToPaths(point,paths){let dist=Infinity;for(const path of paths||[])for(let j=1;j<path.length;j++)dist=Math.min(dist,distanceToSegment(point,path[j-1],path[j]));return dist;}

test('환승역 원거리에서는 호선별 원 두 개를 붙이고 상세 축척에서는 각 노선 위로 분리한다',()=>{
  const data=mk(indexRenderedMetroRail(fixedRailCollection()));
  for(const [station,expected] of [['노량진',['1호선','9호선']],['동작',['4호선','9호선']],['대림',['2호선','7호선']]]){
    const group=data.features.filter(f=>f.properties.stationKey===station);
    const detail=group.filter(f=>f.properties.role==='detail');
    const summary=group.filter(f=>f.properties.role==='summary');
    assert.deepEqual(detail.map(f=>f.properties.line).sort(),expected.slice().sort());
    assert.deepEqual(summary.map(f=>f.properties.line).sort(),expected.slice().sort());
    assert.equal(summary.length,2,'원거리에서도 한 개의 다색 원이 아니라 호선별 원 두 개를 표시한다');
    assert.ok(summary.every(f=>f.properties.iconLines.length===1),'각 원은 한 호선만 표현한다');
    assert.equal(new Set(summary.map(f=>f.properties.iconOffset.join(','))).size,2,'두 원은 화면에서 나란히 붙도록 서로 다른 오프셋을 가진다');
    assert.deepEqual(summary.map(f=>f.properties.iconOffset[0]).sort((a,b)=>a-b),[-34,34],'아이콘 크기와 같은 지름만큼 벌려 원 두 개가 맞닿도록 한다');
    assert.equal(summary.filter(f=>f.properties.labelOn).length,1,'원거리에서는 역명을 한 번만 표시한다');
    assert.equal(detail.filter(f=>f.properties.labelOn).length,2,'상세 축척에서는 호선별 역명 두 개를 표시한다');
    assert.ok(detail.every(f=>f.properties.label.endsWith('역')));
  }
  assert.equal(visibleMetroLayerRole(13.2),'summary');
  assert.equal(visibleMetroLayerRole(15.55),'detail');
  assert.equal(visibleMetroLayerRole(12),'hidden');
  assert.equal(visibleMetroLayerRole(10.1),'hidden');
  assert.equal(visibleMetroLayerRole(10.8),'hidden');
});

test('역 마커는 현재 표시된 색상 노선의 선형 위에 배치된다',()=>{
  const paths=indexRenderedMetroRail(fixedRailCollection());
  const data=mk(paths);
  for(const f of data.features.filter(f=>f.properties.role==='detail')){
    const route=paths.get(f.properties.line);
    if(!route)continue;
    assert.ok(distanceToPaths(f.geometry.coordinates,route)<1.5,`${f.properties.stationKey} ${f.properties.line} 선형 위`);
  }
});

test('공식 선형이 교체되면 역 마커도 해당 선형의 위치로 보정된다',()=>{
  const base=fixedRailCollection();
  const selected=base.features.find(f=>f.properties.line==='4호선' && f.geometry.coordinates.some(p=>p[0]>126.979 && p[0]<126.982 && p[1]>37.501 && p[1]<37.505));
  assert.ok(selected,'동작역 주변의 4호선 선형이 있어야 한다');
  const shift=0.0002;
  const modified={...base,features:base.features.map(f=>f.properties.line==='4호선'?
    {...f,geometry:{...f.geometry,coordinates:f.geometry.coordinates.map(p=>[p[0]+shift,p[1]])}}:f)};
  const lines=indexRenderedMetroRail(modified);
  const p=metroLineMarkerPlacements('동작',['4호선','9호선'],126.978153,37.502878,lines);
  const fourth=p.find(x=>x.line==='4호선');
  assert.equal(fourth.source,'rendered-rail-geometry');
  assert.ok(distanceToPaths([fourth.lng,fourth.lat],lines.get('4호선'))<1.5);
});

test('출구는 번호만 텍스트로 그리며 번호가 없는 출구는 아이콘을 숨긴다',()=>{
  const text=readFileSync(new URL('../src/station-accessibility.js',import.meta.url),'utf8');
  assert.match(text,/const numberedExitFilter=/);
  assert.match(text,/filter:numberedExitFilter/);
  assert.match(text,/'text-field':\['get','number'\]/);
  assert.doesNotMatch(text,/'text-field':\['case'.*'출'/);
});
