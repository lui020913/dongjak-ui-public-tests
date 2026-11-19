import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {installPedestrianControlPlacement} from '../src/pedestrian-tools.js';
const js=readFileSync(new URL('../src/pedestrian-tools.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/map-patch/dongjak-v595-pedestrian-tools.css',import.meta.url),'utf8');

test('PC 지도 옵션은 실제 왼쪽 메뉴 끝을 기준으로 배치',()=>{
  assert.equal(typeof installPedestrianControlPlacement,'function');
  assert.match(js,/getBoundingClientRect\(\)/);
  assert.match(js,/Math\.ceil\(rect\.bottom\+12\)/);
  assert.match(js,/new ResizeObserver\(schedule\)/);
  assert.match(css,/top:var\(--dj-controls-under-nav, 490px\)!important/);
});
test('PC·태블릿·모바일은 각기 다른 패널 공간을 사용',()=>{
  for(const bp of ['min-width:1080px','min-width:701px','max-width:700px'])assert.ok(css.includes(bp),bp);
  assert.match(css,/left:116px!important;right:auto!important/);
  assert.match(css,/bottom:calc\(76px \+ env\(safe-area-inset-bottom\)\)!important/);
  assert.match(css,/map-controls-open \.map-actions/);
  assert.match(css,/ped-info-open \.map-actions/);
});
test('보행정보 패널을 닫거나 지도 옵션을 열면 겹치는 창을 함께 숨김',()=>{
  assert.match(js,/panel\.hidden=true;seq\+\+;restoreOverview\(\)/);
  assert.match(js,/mapToolsToggle\?\.addEventListener\('click',onToggleMapTools\)/);
  assert.match(js,/classList\.toggle\('ped-info-open',!panel\.hidden\)/);
});
