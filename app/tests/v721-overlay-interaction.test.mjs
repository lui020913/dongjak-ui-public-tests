import {APP_VERSION} from '../src/app-version.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');

test('v7.0.29 help button is not dependent on the optional fullscreen button',()=>{
 const js=read('src/mobile-map-controls.js');
 assert.match(js,/if\(!guide\|\|!show\)return/);
 assert.doesNotMatch(js,/if\(!guide\|\|!show\|\|!button\)return/);
 assert.match(js,/show\.addEventListener\('click',openGuide\)/);
 assert.match(js,/guide\.hidden=false;positionGuide\(\)/);
});
test('desktop map actions move to the left of a visible transit drawer',()=>{
 const css=read('src/mobile-ui-baseline.css');
 assert.match(css,/#app:has\(#transport-sheet:not\(\[hidden\]\)\)\[data-tab="map"\] \.map-actions/);
 assert.match(css,/right:calc\(min\(460px,calc\(100vw - 165px\)\) \+ 30px\)!important/);
 assert.match(css,/z-index:2750!important/);
});
test('attribution credit remains available in map options without extra compact info button',()=>{
 const main=read('src/main.js'),html=read('index.html');
 assert.match(main,/attributionControl:false/);
 assert.doesNotMatch(main,/new maplibregl\.AttributionControl/);
 assert.match(html,/지도 데이터 출처/);
 assert.match(html,/www\.openstreetmap\.org\/copyright/);
});
test('mobile search is opaque and bottom panels have usable scroll height',()=>{
 const css=read('src/mobile-ui-baseline.css');
 assert.match(css,/background:#fff!important/);
 assert.match(css,/backdrop-filter:none!important/);
 assert.match(css,/max-height:min\(51dvh/);
 assert.match(css,/#mine-panel\.page-panel:not\(\[hidden\]\)/);
 assert.match(css,/border-radius:24px!important/);
});
test('new stylesheet last, release metadata synchronized',()=>{
 const main=read('src/main.js'),pkg=JSON.parse(read('package.json'));
 assert.ok(main.indexOf('mobile-ui-baseline.css')>main.indexOf('v614-transport-compact.css') && main.indexOf('mobile-ui-baseline.css')<main.indexOf('v815-map-product.css'));
 assert.equal(pkg.version,APP_VERSION);
 assert.match(read('src/version-history.js'),/version:'v7\.0\.29'/);
});
