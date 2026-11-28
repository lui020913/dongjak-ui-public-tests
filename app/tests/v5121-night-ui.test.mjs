import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildingFootprintPaint,buildingExtrusionAppearance} from '../src/map-appearance.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('다크 테마 건물 평면·3D는 같은 팔레트에서 저명도로 지정',()=>{
  assert.deepEqual(buildingFootprintPaint('dark'),{'fill-color':'#444d56','fill-opacity':0.74,'fill-antialias':false});
  assert.deepEqual(buildingExtrusionAppearance('dark',30),{color:'#525d66',opacity:0.89});
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

