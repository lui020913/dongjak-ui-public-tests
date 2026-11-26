import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BASE_LAYER_DEFAULTS,BASE_LAYER_IDS,normalizeBaseLayerSettings,applyBaseLayerVisibility} from '../src/base-layer-controls.js';

test('기본 레이어는 모든 항목 표시, 누락·오염된 저장 설정은 기본값으로 복구',()=>{
  assert.deepEqual(normalizeBaseLayerSettings(null),BASE_LAYER_DEFAULTS);
  assert.deepEqual(normalizeBaseLayerSettings({metro:false,bus:'0',boundary:true}),
    {...BASE_LAYER_DEFAULTS,metro:false});
});
test('철도 안내선, 버스정류장, 경계선만 토글하며 건물 데이터 소스는 건드리지 않음',()=>{
  const ids=Object.values(BASE_LAYER_IDS).flat();
  assert.ok(BASE_LAYER_IDS.metro.includes('dj-metro-summary-icon'));
  assert.ok(BASE_LAYER_IDS.metro.includes('dj-metro-summary-name'));
  const existing=new Set(ids);
  const states=new Map();let changed=0;
  const map={getLayer:id=>existing.has(id)?{id}:null,
    getLayoutProperty:id=>states.get(id)||'visible',
    setLayoutProperty:(id,key,value)=>{assert.equal(key,'visibility');states.set(id,value);changed++;}};
  applyBaseLayerVisibility(map,{metro:false,bus:false,boundary:true});
  for(const id of BASE_LAYER_IDS.metro)assert.equal(states.get(id),'none');
  for(const id of BASE_LAYER_IDS.bus)assert.equal(states.get(id),'none');
  for(const id of BASE_LAYER_IDS.boundary)assert.equal(states.get(id),undefined);
  const before=changed;
  applyBaseLayerVisibility(map,{metro:false,bus:false,boundary:true});
  assert.equal(changed,before,'같은 상태 재적용 시 렌더링 변경 반복 없음');
  applyBaseLayerVisibility(map,BASE_LAYER_DEFAULTS);
  for(const id of [...BASE_LAYER_IDS.metro,...BASE_LAYER_IDS.bus])assert.equal(states.get(id),'visible');
});
test('접근성 버튼과 별개인 기본 지도 옵션, 확대 3D 자동 표시 로직 보존',()=>{
  const root=new URL('../',import.meta.url);
  const html=readFileSync(new URL('index.html',root),'utf8');
  const main=readFileSync(new URL('src/main.js',root),'utf8');
  const css=readFileSync(new URL('src/style.css',root),'utf8');
  assert.match(html,/id="base-layer-controls"/);
  assert.match(html,/data-base-layer="metro"/);
  assert.match(html,/data-base-layer="bus"/);
  assert.match(html,/data-base-layer="buildings"/);
  assert.match(html,/data-base-layer="boundary"/);
  assert.match(html,/id="toggle-station-accessibility"/);
  assert.match(main,/function visibleBuilding2D\(\)\{[\s\S]*?return mapReady && Boolean\(boundaryGeometry\)/);
  assert.match(main,/return app\.dataset\.djTransitExterior!=='true' && baseBuildingsVisible && !movementIsSlow && mapReady/);
  assert.match(main,/baseLayerControls\?\.apply/);
  assert.match(css,/#app\[data-base-metro="off"\] \.metro-station-marker/);
});
