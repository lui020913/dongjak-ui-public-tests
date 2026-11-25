import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {popupViewportOffset} from '../src/map-popup-viewport.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('single motion owner disables earlier controllers and uses direct X lifecycle',()=>{
  const coordinator=read('src/v806-unified-ui.js');
  assert.match(coordinator,/app\.dataset\.dj806Motion='on'/);
  assert.match(coordinator,/createWindowLifecycle/);
  assert.match(coordinator,/on\(doc,'click',nativeDismiss,true\)/);
  assert.doesNotMatch(coordinator,/dispatchLocalClick\(button,win\)/);
  for(const file of ['src/v800-ui-architecture.js','src/v802-panel-motion.js','src/v804-ui-fixes.js','src/v805-responsive-readability.js'])
    assert.match(read(file),/app\.dataset\.dj806Motion==='on'/);
});
test('road-width selection is exclusive with road overlays, not the safety drawer',()=>{
  const road=read('src/road-width-layer.js');
  assert.match(road,/claimRoadLayer\('width'/);
  assert.doesNotMatch(road,/app\.classList\.contains\('map-safety-open'\)/);
  const css=read('src/v806-unified-ui.css');
  assert.match(css,/--dj806-rail-height/);
  assert.match(read('src/v806-unified-ui.js'),/--dj806-rail-height/);
});
test('desktop settings has no inner scrolling where entire panel fits',()=>{
  const css=read('src/v806-unified-ui.css');
  assert.match(css,/\.dj-map-settings-content\{\s*overflow:visible!important/);
  assert.match(css,/max-height:720px/);
});
test('v823: latest stylesheet replaces the obsolete NanumSquare preference with online Pretendard',()=>{
  const html=read('index.html');
  assert.match(html,/pretendardvariable-dynamic-subset.min.css/);
  assert.doesNotMatch(html,/hangeul\.pstatic\.net\/hangeul_static\/css\/nanum-square-neo\.css/);
  const css=read('src/local-font.css');
  assert.match(css,/--dj-ui-font: "Pretendard Variable"/);
  assert.match(css,/#app#app/);
});
test('original district data stays intact while Sangdo1 view is separately retained',()=>{
  const source=read('src/dongjak-verified-data-layers.js');
  assert.match(source,/SANGDO1_ANALYSIS/);
  assert.match(source,/getSangdo1Boundary/);
  const road=JSON.parse(read('public/data/sangdo1-analysis-view/roadwidth.geojson'));
  const slope=JSON.parse(read('public/data/sangdo1-analysis-view/slope.geojson'));
  const fullRoad=JSON.parse(read('public/data/dongjak_roadwidth_estimated_202610.geojson'));
  const fullSlope=JSON.parse(read('public/data/safety/slope/dongjak_walk_links_slope_visual.geojson'));
  assert.ok(road.features.length>0&&road.features.length<fullRoad.features.length);
  assert.ok(slope.features.length>0&&slope.features.length<fullSlope.features.length);
  assert.equal(road.metadata.display_area,'상도1동');
});
test('facility viewport reserves map actions and uses desktop bottom instead of sidebar top',()=>{
  const js=read('src/map-popup-viewport.js');
  assert.match(js,/const navTop=onPhone&&nav/);
  assert.match(js,/safeWidth/);
  assert.deepEqual(popupViewportOffset({left:850,right:1190,top:300,bottom:660},
    {left:200,right:1000,top:20,bottom:900},12),{x:-202,y:0});
});
test('bus station title/ARS and mobile pedestrian route title are centered and aligned',()=>{
  const css=read('src/v806-unified-ui.css');
  assert.match(css,/#transport-sheet\[data-kind="bus"\] :is\(#transport-kind,#transport-title,#transport-description\)/);
  assert.match(css,/#route-panel \.page-heading/);
  assert.match(read('src/transport-map.js'),/16\.4,0\.262,18\.2,0\.331/);
});
