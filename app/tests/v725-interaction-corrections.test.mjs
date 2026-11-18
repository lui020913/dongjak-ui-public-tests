import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('the app uses one mobile-first shell instead of a desktop safety rail',()=>{
  const main=source('src/main.js'),html=source('index.html'),css=source('src/mobile-first-layout.css');
  assert.equal(main.includes('v725-layout-state.css'),false);
  assert.equal(main.includes('v726-desktop-polish.css'),false);
  assert.equal(main.includes('v729-pc-consistency.css'),false);
  assert.equal(main.includes('positionAdminBelowLeftPanel'),false);
  assert.equal(main.includes('installDesktopSafetyRail('),false);
  assert.equal(html.includes('v729-r1-responsive-ui.css'),false);
  assert.equal(html.includes('v729-r2-new-ui.css'),false);
  assert.ok(css.includes('#bottom-nav:not([hidden])'));
  assert.ok(css.includes('grid-template-columns: repeat(5,minmax(0,1fr))'));
  assert.ok(css.includes('.map-actions'));
});

test('the search, theme and version controls share one floating header',()=>{
  const css=source('src/mobile-first-layout.css'),environment=source('src/ui-environment.js'),html=source('index.html');
  assert.ok(css.includes('.topbar'));
  assert.ok(css.includes('#theme-toggle'));
  assert.ok(css.includes('#version-history-trigger'));
  assert.ok(environment.includes("themeState.value==='dark'?'라이트 모드':'다크 모드'"));
  assert.ok(html.includes('id="version-history-trigger"'));
});

test('night flag switches off BEFORE restoring light theme',()=>{
  const js=source('src/night-visibility-map.js');
  const segment=js.slice(js.indexOf('v7.0.25: set the analysis flag FIRST'));
  assert.ok(segment.indexOf("app.dataset.sangdoNight=enabled?'on':'off'")>=0);
  assert.ok(segment.indexOf("app.dataset.sangdoNight=enabled?'on':'off'")<segment.indexOf('applyTemporaryTheme(themeBeforeNight)'));
  assert.match(segment,/theme\?\.refresh\?\.\(\)/);
});

test('news fetches media and official on initial map load, caches in memory',()=>{
  const news=source('src/dongjak-news.js'),main=source('src/main.js');
  assert.match(news,/Promise\.allSettled\(\['media','official'\]/);
  assert.match(news,/latest\.set\(type,\{at:Date\.now\(\)/);
  assert.match(main,/dongjakNews\.prefetch\(\)/);
});

test('neighbor stations have keyboard-select and map movement, no invented station coords',()=>{
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

test('version history remains available from the shared header without a separate PC shortcut',()=>{
  const html=source('index.html'),css=source('src/mobile-first-layout.css');
  assert.ok(html.includes('id="version-history-trigger"'));
  assert.ok(css.includes('#version-history-trigger'));
  assert.equal(html.includes('v729-r2-new-ui.js'),false);
});

test('administrative picker and route panel use the shared bottom-sheet position',()=>{
  const main=source('src/main.js'),css=source('src/mobile-first-layout.css');
  assert.equal(main.includes('positionAdminBelowLeftPanel'),false);
  assert.equal(main.includes('--dj-v725-admin-top'),false);
  assert.ok(css.includes('#admin-dong-picker:not([hidden])'));
  assert.ok(css.includes('#route-panel,#participation-panel,#news-panel,#mine-panel'));
});

test('generic railway geometry popup does not obscure station/bus information',()=>{
  const js=source('src/transport-map.js');
  assert.doesNotMatch(js,/map\.on\('click','transport-schematic-subway',/);
  assert.match(js,/do not open a generic MOIS rail provenance popup/);
});
