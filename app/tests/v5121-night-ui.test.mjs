import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildingFootprintPaint,buildingExtrusionAppearance} from '../src/map-appearance.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('다크 테마 건물 평면·3D는 같은 팔레트에서 저명도로 지정',()=>{
  assert.deepEqual(buildingFootprintPaint('dark'),{'fill-color':'#444d56','fill-opacity':0.74,'fill-antialias':false});
  assert.deepEqual(buildingExtrusionAppearance('dark',30),{color:'#525d66',opacity:0.82});
  assert.equal(buildingFootprintPaint('light')['fill-opacity'],1);
  assert.match(read('src/ui-environment.js'),/buildingFootprintPaint\(themeState\.value,map\.getPitch/);
  assert.match(read('src/main.js'),/buildingExtrusionAppearance\(visualTheme\.currentTheme\(\),map\.getPitch\(\)\)/);
});

test('야간 시야 시작 시 기본 접힘, 상세 접근 버튼과 종료 버튼은 패널에 유지',()=>{
  const js=read('src/night-visibility-map.js');
  const html=read('index.html');
  assert.match(js,/const showFloating=\(\)=>\{[\s\S]*?setFloatingCollapsed\(true\)/);
  assert.match(js,/quickOff\.hidden=false/);
  assert.match(html,/id="night-visibility-float-collapse"[^>]*aria-expanded="false"/);
  assert.match(html,/id="night-visibility-float-stop"/);
  assert.match(html,/id="night-visibility-float-summary"/);
});

test('분석 한계는 접이식 details로 이동하고 원래 결과 ID는 유지',()=>{
  const html=read('index.html');
  assert.match(html,/<details class="night-visibility-explanation">/);
  assert.match(html,/분석 기준과 주의사항 자세히/);
  assert.match(html,/id="night-occlusion-details"/);
  assert.match(html,/id="night-visibility-stats"/);
  assert.match(html,/id="night-visibility-top"/);
});

test('모바일 바텀시트가 하단 내비게이션 위에 배치되고 접힘 높이를 제한',()=>{
  const css=read('src/night-visibility-panel.css');
  assert.match(css,/\[data-collapsed="true"\]/);
  assert.match(css,/bottom:calc\(var\(--dj-mobile-nav-h,66px\) \+ 8px\)/);
  assert.match(css,/max-height:min\(56dvh/);
  assert.match(read('src/night-visibility-map.js'),/touchstart/);
  assert.match(read('src/night-visibility-map.js'),/touchend/);
});
