import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildingFootprintPaint,buildingExtrusionAppearance} from '../src/map-appearance.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('건물 평면과 3D는 이전 테마 설정과 무관하게 라이트 팔레트 유지',()=>{
  assert.deepEqual(buildingFootprintPaint('dark'),{'fill-color':'#fafafa','fill-outline-color':'#e2e2e2','fill-opacity':1,'fill-antialias':true});
  assert.deepEqual(buildingExtrusionAppearance('dark',30),{color:'#f1f3f1',opacity:0.22});
  assert.equal(buildingFootprintPaint('light')['fill-opacity'],1);
  assert.match(read('src/ui-environment.js'),/nativeBuildingFootprintPaint\(theme/);
  assert.match(read('src/main.js'),/buildingExtrusionAppearance\(visualTheme\.currentTheme\(\),map\.getPitch\(\)\)/);
});

test('폐기된 야간 시야 패널은 표시하지 않는다',()=>{
  const html=read('index.html');
  assert.doesNotMatch(html,/id="night-visibility-float-collapse"[^>]*aria-expanded="false"/);
  assert.doesNotMatch(html,/id="night-visibility-float-stop"/);
  assert.doesNotMatch(html,/id="night-visibility-float-summary"/);
});

test('폐기된 독립 분석 결과와 설명 창은 공개 UI에 없다',()=>{
  const html=read('index.html');
  assert.doesNotMatch(html,/<details class="night-visibility-explanation">/);
  assert.doesNotMatch(html,/분석 기준과 주의사항 자세히/);
  assert.doesNotMatch(html,/id="night-occlusion-details"/);
  assert.doesNotMatch(html,/id="night-visibility-stats"/);
  assert.doesNotMatch(html,/id="night-visibility-top"/);
});

