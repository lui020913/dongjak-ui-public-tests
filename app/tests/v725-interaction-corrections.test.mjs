import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('v7.0.25 rail uses real search dropdown height and animates position',()=>{
  const js=source('src/v713-desktop-rail.js'),css=source('src/v725-layout-state.css');
  assert.match(js,/searchOpen==='true'/);
  assert.match(js,/dropdown\.getBoundingClientRect\(\)\.bottom/);
  assert.match(js,/--dj-v725-search-rail-push/);
  assert.match(css,/transition:top \.32s/);
});
test('v7.0.25 desktop theme button is legible text; right map actions are upper right',()=>{
  const css=source('src/v725-layout-state.css'),js=source('src/ui-environment.js');
  assert.match(css,/#app #theme-toggle\{[\s\S]*?font-size:12px!important/);
  assert.match(css,/#app #theme-toggle::after\{display:none!important/);
  assert.match(js,/themeState\.value==='dark'\?'라이트 모드':'다크 모드'/);
  assert.match(css,/top:12px!important;right:12px!important/);
});
test('v7.0.25 night flag switches off BEFORE restoring light theme',()=>{
  const js=source('src/night-visibility-map.js');
  const segment=js.slice(js.indexOf('v7.0.25: set the analysis flag FIRST'));
  assert.ok(segment.indexOf("app.dataset.sangdoNight=enabled?'on':'off'")>=0);
  assert.ok(segment.indexOf("app.dataset.sangdoNight=enabled?'on':'off'")<segment.indexOf('applyTemporaryTheme(themeBeforeNight)'));
  assert.match(segment,/theme\?\.refresh\?\.\(\)/);
});
test('v7.0.25 news fetches media and official on initial map load, caches in memory',()=>{
  const news=source('src/dongjak-news.js'),main=source('src/main.js');
  assert.match(news,/Promise\.allSettled\(\['media','official'\]/);
  assert.match(news,/latest\.set\(type,\{at:Date\.now\(\)/);
  assert.match(main,/dongjakNews\.prefetch\(\)/);
});
test('v7.0.25 neighbor stations have keyboard-select and map movement, no invented station coords',()=>{
  const js=source('src/transport-map.js');
  assert.match(js,/lineStationKey\(item\.name\)===lineStationKey\(name\)/);
  assert.match(js,/neighbor\.setAttribute\('role','button'\)/);
  assert.match(js,/neighbor\.setAttribute\('tabindex','0'\)/);
  assert.match(js,/neighbor\.addEventListener\('keydown',event=>\{if\(event\.key==='Enter'\|\|event\.key===' '\)/);
  assert.match(js,/if\(!canNavigateToMetroNeighbor\(destination,isDongjak,isNearBoundary\)\)/);
  assert.match(js,/notice=el\('p','metro-neighbor-status'\)/);
  assert.match(js,/map\.easeTo\?\.\(\{center:\[destination\.lng,destination\.lat\]/);
  assert.match(js,/void open\(\{\.\.\.destination,selectedLine:line\}\)/);
});
test('v7.0.25 desktop releases always display sources beside update notes',()=>{
  const css=source('src/v725-layout-state.css'),js=source('src/version-history-v7.js');
  assert.match(css,/\.v707-history-switch\.dj-mobile-history-switch\{display:none!important/);
  assert.match(css,/\.v707-history-timeline,#app \.v707-history-sources\{display:block!important/);
  assert.match(js,/controls\.classList\.add\('dj-mobile-history-switch'\)/);
});
test('v7.0.25 admin panel sits below left content and mobile route scrolls above five-tab nav',()=>{
  const main=source('src/main.js'),css=source('src/v725-layout-state.css');
  assert.match(main,/function positionAdminBelowLeftPanel/);
  assert.match(main,/--dj-v725-admin-top/);
  assert.match(css,/#app #admin-dong-picker:not\(\[hidden\]\)/);
  assert.match(css,/#app\[data-tab="route"\] #route-panel:not\(\[hidden\]\)/);
});
test('v7.0.25 generic railway geometry popup does not obscure station/bus information',()=>{
  const js=source('src/transport-map.js');
  assert.doesNotMatch(js,/map\.on\('click','transport-schematic-subway',/);
  assert.match(js,/do not open a generic MOIS rail provenance popup/);
});
