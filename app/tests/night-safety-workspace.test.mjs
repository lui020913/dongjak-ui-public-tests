import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
test('보행안전 메뉴가 지도 옵션 외부의 독립 제어판이며 ID가 중복되지 않는다',()=>{
  const html=read('index.html');
  const panelStart=html.indexOf('id="map-safety-controls"');
  const mapStart=html.indexOf('id="map-advanced-controls"');
  assert.ok(panelStart>0 && mapStart>panelStart);
  const section=html.slice(panelStart,mapStart);
  for(const id of ['night-visibility-toggle','night-visibility-controls','ped-access-toggle',
    'ped-report-open','ped-nearby-open','toggle-safety-facilities','toggle-crosswalks',
    'toggle-essentials','toggle-public-facilities','toggle-station-accessibility']){
    assert.match(section,new RegExp('id="'+id+'"'));
    assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1);
  }
  assert.ok(html.indexOf('id="base-layer-controls"')>mapStart);
  assert.match(html,/id="map-safety-toggle"[^>]+aria-expanded="false"/);
});
test('야간 시야의 테마 임시 전환과 원래 테마 복원이 연결되어 있다',()=>{
  const night=read('src/night-visibility-map.js'),theme=read('src/ui-environment.js'),main=read('src/main.js');
  assert.match(night,/themeBeforeNight=theme\?\.currentTheme\?\.\(\)/);
  assert.match(night,/applyTemporaryTheme\('dark'\)/);
  assert.match(night,/applyTemporaryTheme\(themeBeforeNight\)/);
  assert.match(theme,/if\(!suppressPreferenceSave\)safeStorageSet/);
  assert.match(main,/installNightVisibility\(\{map,maplibregl,app,toast,theme:visualTheme,\s*onActivate:/);
});
test('PC 모바일 별도 배치, 안전 메뉴 숨김/접근성 스타일이 존재한다',()=>{
  const css=read('src/safety-workspace.css');
  assert.match(css,/#app\.map-safety-open \.map-safety-controls\{display:flex!important;\}/);
  assert.match(css,/@media\(max-width:700px\)/);
  assert.match(css,/@media\(min-width:1080px\)/);
  assert.match(css,/\[data-tab\]:not\(\[data-tab="map"\]\)/);
});
