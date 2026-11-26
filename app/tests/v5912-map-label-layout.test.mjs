import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  bridgeGeometryMidpoint,bridgeAnchorsFromRenderedFeatures,parseBridgeWays,
  installHangangBridgeLabels,HANGANG_BRIDGE_REFERENCES
} from '../src/hangang-bridge-labels.js';
import {markerHiddenAtScreenPoint} from '../src/map-marker-occlusion.js';
import {metroMarkerGeojson} from '../src/metro-marker-geodata.js';
const read=(f)=>readFileSync(new URL(`../${f}`,import.meta.url),'utf8');

test('교량명: 화면과 멀어진 HTML 좌표 오프셋 대신 도로 선형의 길이 중심을 사용',()=>{
  assert.deepEqual(bridgeGeometryMidpoint([[0,0],[0.001,0],[0.004,0]]),[0.002,0]);
  const first=HANGANG_BRIDGE_REFERENCES.find(f=>f.name==='한강대교');
  const features=bridgeAnchorsFromRenderedFeatures([{properties:{name:'한강대교'},geometry:{type:'LineString',coordinates:[
    [first.lng-0.002,first.lat],[first.lng,first.lat],[first.lng+0.002,first.lat]
  ]}}]);
  assert.equal(features.length,1);
  assert.equal(features[0].properties.name,'한강대교');
  assert.ok(Math.abs(features[0].geometry.coordinates[0]-first.lng)<0.000001);
  const parsed=parseBridgeWays([{tags:{name:'반포대교'},geometry:[
    {lon:126.994,lat:37.515},{lon:126.994,lat:37.517}
  ]}]);
  assert.equal(parsed.length,1);
  assert.ok(parsed[0].geometry.coordinates[1]>37.515);
});

test('교량명: 화면의 실 교량 이름 레이어에서 좌표 보정하며 DOM 마커를 만들지 않음',()=>{
  let changed=null;let handler=null;let mounted=false;const sourceChanges={};
  const refs=HANGANG_BRIDGE_REFERENCES;
  const t=refs.find(row=>row.name==='동작대교');
  const map={
    getSource:id=>mounted?({setData:x=>{changed=x;sourceChanges[id]=x;}}):null,
    addSource:()=>{mounted=true;},addLayer:()=>{},
    getStyle:()=>({layers:[{id:'transportation-labels',source:'roads','source-layer':'transportation_name',type:'symbol'}]}),
    queryRenderedFeatures:()=>[],
    querySourceFeatures:()=>[{properties:{name:'동작대교'},geometry:{type:'LineString',coordinates:[[t.lng+0.001,t.lat-0.002],[t.lng+0.001,t.lat+0.002]]}}],
    on:(type,cb)=>{if(type==='moveend')handler=cb;},once:()=>{},off:()=>{}
  };
  const cleanup=installHangangBridgeLabels(map,{fetchImpl:async()=>({ok:false,status:503})});
  handler();
  assert.ok(changed);
  assert.ok(sourceChanges['dj-hangang-bridges-real-lines'].features.some(f=>f.properties.name==='동작대교'&&f.geometry.type==='LineString'));
  assert.doesNotMatch(read('src/hangang-bridge-labels.js'),/installPriorityMarkers|new maplibregl\.Marker/);
  cleanup();
});

test('왼쪽 메뉴 또는 지도 경계에서 부분 노출되는 대학·공공기관 로고 감추기',()=>{
  const nav={left:8,right:95,top:85,bottom:490};
  const screen={width:1200,height:800,nav};
  assert.equal(markerHiddenAtScreenPoint({...screen,x:45,y:180}),true);
  assert.equal(markerHiddenAtScreenPoint({...screen,x:9,y:300}),true);
  assert.equal(markerHiddenAtScreenPoint({...screen,x:500,y:300}),false);
  assert.equal(markerHiddenAtScreenPoint({...screen,x:200,y:180}),false);
  assert.match(read('src/education-layer.js'),/isMarkerOccluded/);
  assert.match(read('src/landmark-layer.js'),/isMarkerOccluded/);
});

test('버스정류장 아이콘은 20배율에서도 28px를 넘지 않고 역명은 호선별 상하 분리',()=>{
  const transport=read('src/transport-map.js');
  assert.match(transport,/16\.4,0\.262,18\.2,0\.331,20,0\.393/);
  // 64px source pictogram * 0.393 at zoom 20 = 25.15px, below the 28px cap.
  assert.ok(64*0.393<=28);
  assert.match(transport,/'text-anchor':\['get','labelAnchor'\]/);
  assert.doesNotMatch(transport,/'text-variable-anchor':\['top','bottom','left','right'\],\s*'text-radial-offset':0\.6/);
  const metro=metroMarkerGeojson([{kind:'subway',name:'노량진',lng:126.943,lat:37.513,lines:['1호선','9호선']}],{
    normalizeName:x=>x,normalizeLine:x=>x,
    placements:()=>[{line:'1호선',lng:126.943,lat:37.513},{line:'9호선',lng:126.9435,lat:37.513}],
    colors:{'1호선':'#0052a4','9호선':'#b89b2f'},radiusPredicate:()=>true
  });
  assert.ok(metro.features.filter(f=>f.properties.role==='summary').every(f=>f.properties.labelOffset[1]<0));
  const detail=metro.features.filter(f=>f.properties.role==='detail');
  assert.equal(detail.length,2);assert.ok(detail.every(f=>f.properties.labelOn));
  assert.deepEqual(detail.map(f=>f.properties.labelAnchor).sort(),['bottom','top']);
  assert.ok(detail.some(f=>f.properties.labelOffset[1]<0)&&detail.some(f=>f.properties.labelOffset[1]>0));
});
