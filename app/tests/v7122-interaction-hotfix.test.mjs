import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {searchLocalPlaces,normalizePlaceSearchResults} from '../src/route-search.js';
import {nightActivationBlocked} from '../src/night-visibility-map.js';
import {installAdaptiveMapPerformance} from '../src/v7122-map-performance.js';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('일반 장소와 주소를 검색할 수 있고 특정 역만 검색하는 것이 아니다',()=>{
  assert.ok(searchLocalPlaces('중앙대').some(p=>p.name==='중앙대학교'&&p.category));
  assert.ok(searchLocalPlaces('구청').some(p=>p.name==='동작구청'));
  const cafe=normalizePlaceSearchResults({features:[{geometry:{type:'Point',coordinates:[126.955,37.505]},properties:{name:'테스트 카페',osm_key:'amenity',osm_value:'cafe'}}]});
  assert.equal(cafe[0].category,'장소');
});
test('길찾기·위치 선택 동안 야간시야 활성화를 막고 일반 지도에서는 허용',()=>{
  const classes=new Set(['route-picking']);
  const app={classList:{contains:k=>classes.has(k)}};
  assert.equal(nightActivationBlocked(app,{getElementById:()=>null}),true);
  classes.clear();
  assert.equal(nightActivationBlocked(app,{getElementById:()=>null}),false);
  classes.add('route-guiding');
  assert.equal(nightActivationBlocked(app,{getElementById:()=>null}),true);
});
test('PC 드래그 프레임 저하 시 3D만 임시 정지하고 이동 종료 후 복구',()=>{
  const events=new Map(),states=new Map([['dongjak-buildings-3d-12','visible'],['ordinary-road','visible']]);
  const map={on:(name,fn)=>events.set(name,fn),off:()=>{},getPitch:()=>33,getZoom:()=>16,
    getStyle:()=>({layers:[...states.keys()].map(id=>({id}))}),getLayer:id=>states.has(id),
    getLayoutProperty:(id)=>states.get(id),setLayoutProperty:(id,p,v)=>{assert.equal(p,'visibility');states.set(id,v);}};
  let stamp=0;const app={dataset:{}};
  installAdaptiveMapPerformance({map,app,matchMedia:()=>({matches:true}),now:()=>stamp});
  events.get('dragstart')();
  for(let n=0;n<5;n++){stamp+=34;events.get('render')();}
  assert.equal(states.get('dongjak-buildings-3d-12'),'none');
  assert.equal(states.get('ordinary-road'),'visible');
  events.get('moveend')();
  assert.equal(states.get('dongjak-buildings-3d-12'),'visible');
});
test('모바일 커뮤니티 연필은 SVG로 통일, 전환효과는 움직임 줄이기를 존중',()=>{
  assert.match(read('index.html'),/data-tab="participate"[^\n]*<svg viewBox="0 0 24 24"/);
  assert.match(read('src/v889-mobile-visual-polish.css'),/prefers-reduced-motion:reduce/);
  assert.match(read('src/v910-request-completion.css'),/prefers-reduced-motion:reduce/);
  assert.match(read('vite.config.js'),/dongjak-local-place-ai/);
});
