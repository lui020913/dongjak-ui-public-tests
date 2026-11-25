import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isVegetationLayer} from '../src/map-appearance.js';
import {makeNeighborDistrictLabels} from '../src/map-polish.js';

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const css=read('src/v807-ui-refine.css');
const js=read('src/v807-ui-refine.js');
const html=read('index.html');

test('vegetation coloring excludes generic mixed-class landcover surfaces, preserving real parks',()=>{
  assert.equal(isVegetationLayer({type:'fill',id:'landcover', 'source-layer':'landcover'}),false);
  assert.equal(isVegetationLayer({type:'fill',id:'landcover_residential','source-layer':'landcover'}),false);
  assert.equal(isVegetationLayer({type:'fill',id:'park', 'source-layer':'landuse'}),true);
  assert.equal(isVegetationLayer({type:'fill',id:'forest','source-layer':'landcover'}),true);
  assert.equal(isVegetationLayer({type:'fill',id:'park-outline','source-layer':'landcover'}),false);
  assert.match(read('src/map-appearance.js'),/setPaintProperty\(id,'fill-opacity',\['interpolate'/);
});

test('neighboring borough labels have a reactive dark ink and dark outline',()=>{
  const src=read('src/map-polish.js');
  assert.match(src,/neighbor-district-names/);
  assert.match(src,/data-theme/);
  assert.match(src,/#eff8f5/);
  assert.match(src,/#102329/);
});

test('facility popup has an ephemeral pin at the exact selected facility coordinate',()=>{
  const src=read('src/place-details.js');
  assert.match(src,/createSelectedLocationPin\(document\)/);
  const shared=read('src/selected-location-pin.js');
  assert.match(shared,/className='dj807-facility-pin'/);
  assert.match(src,/setLngLat\(\[p.lng,p.lat\]\)\.addTo\(map\)/);
  assert.match(src,/const marker=fromResultMap\?null:new maplibregl\.Marker/);
  assert.match(src,/popup\.on\('close',\(\)=>\{controllerAI\.abort\(\);marker\?\.remove\(\);\}\)/);
  assert.match(css,/\.dj807-facility-pin/);
  assert.match(css,/dj-place-detail-popup/);
});

test('nearby map detail keeps result pins and back restores the result map',()=>{
  const search=read('src/map-quick-search.js');
  const detail=read('src/place-details.js');
  const pinHandler=search.match(/pin\.addEventListener\('click',event=>\{[\s\S]*?\n      \}\);/)?.[0];
  assert.ok(pinHandler,'result pin handler');
  assert.doesNotMatch(pinHandler,/clearMapResults\(|makeResultButton\(/);
  assert.match(pinHandler,/fromResultMap:true,onBack/);
  assert.match(pinHandler,/mapResultsBar\.hidden=false;map\.easeTo\(\{\.\.\.camera,duration:350\}\)/);
  assert.match(detail,/if\(fromResultMap&&typeof onBack==='function'\)/);
  assert.match(detail,/popup\?\.once\('close',onBack\);closeButton\.click\(\)/);
});

test('guide describes mouse and touch controls on distinct rows',()=>{
  assert.match(html,/<span class="dj807-guide-platform"><b>PC<\/b>/);
  assert.match(html,/<span class="dj807-guide-platform"><b>모바일<\/b>/);
  const guide=html.match(/<section id="map-gesture-guide"[\s\S]*?<\/dl>/)?.[0];
  assert.ok(guide);
  assert.equal((guide.match(/class="dj807-guide-platform"/g)||[]).length,8);
  for(const row of ['지도 이동','확대·축소','회전','기울기(3D)']){
    const pair=guide.split('<dt>'+row+'</dt><dd>')[1]?.split('</dd>')[0];
    assert.ok(pair,row);
    assert.match(pair,/<b>PC<\/b>/);
    assert.match(pair,/<b>모바일<\/b>/);
  }
  for(const [label,desc] of [['북쪽 정렬','나침반을 눌러 북쪽으로 맞춥니다.'],['전체 보기','동작구 전체 지도를 표시합니다.'],['현재 위치','내 위치로 지도 중심을 이동합니다.']]){
    assert.ok(guide.includes('>'+label+'</dt><dd>'+desc+'</dd>'),label);
  }
  assert.equal((guide.match(/class="dj-guide-action-label"/g)||[]).length,3);
});

test('desktop bus arrivals use a readable 2-column grid',()=>{
  assert.match(css,/#transport-sheet\[data-kind="bus"\] #transport-arrivals:has\(\.transport-arrival-row\)/);
  assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css,/\.transport-arrival-time/);
});

test('desktop road width panel is content-sized, not stretched to navigation height',()=>{
  assert.match(css,/#road-width-legend:not\(\[hidden\]\)/);
  assert.match(css,/height:max-content!important/);
  assert.match(css,/justify-content:flex-start!important/);
});

test('dark theme empty states and real text use explicit contrasting surfaces',()=>{
  assert.match(css,/#app#app\[data-theme="dark"\]/);
  assert.match(css,/#mine-panel \.empty-hint/);
  assert.match(css,/--dj807-card:#29464b/);
  assert.match(css,/--dj807-text:#edf8f4/);
});

test('mobile nav maps glyphs to consistent 24px vector symbols without editing desktop',()=>{
  for(const key of ['map','route','news']) assert.match(js,new RegExp(`${key}:'<svg`));
  assert.match(js,/if\(mobile\?\.matches && !replaced\.has\(icon\)\)/);
  assert.match(css,/stroke-width:2\.4!important/);
});

test('mobile rotating search uses only native input placeholder, without a duplicate overlay',()=>{
  const src=read('src/v807-ui-refine.js');
  assert.match(src,/querySelectorAll\('\.dj807-search-copy'\)/);
  assert.match(src,/\.forEach\(node=>node\.remove\(\)\)/);
  assert.doesNotMatch(src,/createElement\('span'\).*dj807-search-copy/);
  assert.match(css,/\.dj807-search-copy/);
  assert.match(css,/display:none!important/);
  assert.match(read('src/v829-mobile-layout-system.css'),/opacity:1!important;visibility:visible!important/);
});

test('metro line switch suppresses a repeat opening animation without disabling normal sheet motion',()=>{
  assert.match(js,/\.dj-metro-line-selector/);
  assert.match(js,/dataset\.dj807Switching='true'/);
  assert.match(read('src/v806-unified-ui.js'),/id==='transport-sheet'&&element\(id\)\?\.dataset\.dj807Switching==='true'/);
  assert.match(css,/#transport-sheet\[data-dj807-switching="true"\]/);
});

test('new UI files are integrated as last CSS and JS without removing map bootstrap',()=>{
  assert.match(html, /src="\/src\/v807-ui-refine.js"/);
  assert.match(html, /href="\/src\/v807-ui-refine.css"/);
  assert.ok(html.indexOf('/src/v807-ui-refine.css')>html.indexOf('/src/v806-unified-ui.css'));
  assert.ok(html.indexOf('/src/v807-ui-refine.js')>html.indexOf('/src/v806-unified-ui.js'));
  assert.match(html,/src="\/src\/main.js"/);
});

test('facility popup expands to 620px on PC and preserves tablet/mobile widths',()=>{
  const src=read('src/map-popup-viewport.js');
  assert.match(src,/Math\.min\(onPhone\?340:\(onDesktop\?620:485\),safeWidth\)/);
  assert.match(src,/Math\.max\(175,Math\.floor\(viewportForPopup\.right-viewportForPopup\.left/);
});
