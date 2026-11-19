import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {NIGHT_VISUAL_PALETTE} from '../src/night-visibility-map.js';

const read=f=>readFileSync(new URL(`../${f}`,import.meta.url),'utf8');
test('야간시야 고대비 팔레트는 도달·차폐·반경 밖을 구분하고 기본 지도와 분리한다',()=>{
  const p=NIGHT_VISUAL_PALETTE;
  assert.ok(p.dimOpacity>0.40 && p.dimOpacity<0.65);
  assert.ok(p.reachOpacity>0.36 && p.reachOpacity<0.54);
  assert.ok(p.uncertainReachOpacity<p.reachOpacity/3);
  assert.equal(new Set([p.clear,p.blocked,p.outside,p.uncertain,p.reachSecurity,p.reachStreet]).size,6);
  const js=read('src/night-visibility-map.js');
  assert.match(js,/dj-night-reach-halo/);
  assert.match(js,/dj-night-reach-outline/);
  assert.match(js,/dj-night-occ-casing-/);
  assert.match(js,/dj-night-dark-alley-casing/);
  assert.match(js,/dj-night-dark-path-casing/);
  assert.match(js,/occCategory\(id\)/);
  assert.doesNotMatch(js,/line-dasharray/);
  assert.doesNotMatch(js,/setPaintProperty\(.*road/);
});
test('거리·건물 차폐 모두 별도 영역 범례와 도로 범례를 제공한다',()=>{
  const html=read('index.html');
  const css=read('src/night-visibility-panel.css');
  assert.match(html,/night-coverage-legend/);
  assert.match(html,/영향권 밖 또는 미확인/);
  assert.match(css,/night-coverage\.street::before\{background:#ffd376/);
  assert.match(css,/night-coverage\.security::before\{background:#47e7cf/);
  assert.match(css,/night-occlusion-legend \.clear::before\{background:#79DEC1/);
});
