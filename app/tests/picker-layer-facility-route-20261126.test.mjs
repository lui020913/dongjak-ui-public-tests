import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../src/'+p,import.meta.url),'utf8');
test('active layer chips are hidden for route and community map selection and open overlays',()=>{
 const css=read('pilot-layer-selection.css');
 assert.match(css,/#app#app:is\(\.route-picking,\.route-preview,\.route-guiding,\[data-community-picking="true"\]\) #djNext-active-layers/);
 for(const id of ['route-pick-hint','community-map-hint','route-transit-confirm','detail-sheet','entry-sheet','transport-sheet','map-gesture-guide']){
  assert.ok(css.includes('#'+id+':not([hidden])'));
 }
 assert.match(css,/display:none!important;visibility:hidden!important;pointer-events:none!important/);
});
test('facility endpoint selection delegates validation and dismissal to route owner',()=>{
 const src=read('place-details.js'),main=read('main.js');
 assert.match(src,/dismiss:\(\)=>popup\?\.remove\(\),accepted:false/);
 assert.match(main,/request\.accepted=selectExternalRouteLocation\(request\.which,request\.place,\{dismiss:request\.dismiss\}\)/);
 const fn=main.slice(main.indexOf('function selectExternalRouteLocation('),main.indexOf("window.addEventListener('dongjak:route-select'"));
 assert.ok(fn.indexOf('if(!setRouteLocation')<fn.indexOf("if(typeof dismiss==='function')dismiss()"));
 assert.ok(fn.indexOf("if(typeof dismiss==='function')dismiss()")<fn.indexOf("navigate('route')"));
 assert.ok(fn.indexOf("navigate('route')")<fn.indexOf('dongjak:route-endpoint-registered'));
});

test('route entry is authorized by shared lifecycle after transport dismissal',()=>{
 const m=read('main.js'),ui=read('v806-unified-ui.js');
 const nav=m.slice(m.indexOf('function navigate(tab,'),m.indexOf('// Capture mobile HOME'));
 assert.ok(nav.indexOf('closeTransportPanel(false)')<nav.indexOf("requestOpen('route-panel')"));
 assert.ok(nav.indexOf("requestOpen('route-panel')")<nav.indexOf('app.dataset.tab = tab'));
 assert.ok(ui.includes("['route-panel','dj854-weather-sheet'"));
});
