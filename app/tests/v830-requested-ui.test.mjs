import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSelectedLocationPin} from '../src/selected-location-pin.js';
import {selectedTransportPinElement} from '../src/transport-selection-marker.js';
import {normalizeMetroTitle} from '../src/v830-transit-title.js';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const css=source('src/v830-requested-detail-ui.css');
const fakeDoc={createElement:()=>({className:'',innerHTML:'',setAttribute(k,v){this[k]=v;}})};
test('facility, bus and subway use identical position pin geometry',()=>{
 const facility=createSelectedLocationPin(fakeDoc);
 for(const kind of ['bus','subway']){
  const selected=selectedTransportPinElement({kind,name:'선택 장소'},fakeDoc);
  assert.ok(selected);
  assert.match(selected.className,/dj807-facility-pin/);
  assert.equal(selected.innerHTML,facility.innerHTML);
  assert.match(selected['aria-label'],kind==='bus'?/버스정류장/:/지하철역/);
 }
});
test('mobile POI details float above bottom dock, use scrolling and a single close glyph',()=>{
 assert.match(css,/position:fixed!important;display:block!important/);
 assert.match(css,/bottom:var\(--dj829-panel-bottom,100px\)!important/);
 assert.match(css,/max-height:min\(53dvh/);
 assert.match(css,/\.maplibregl-popup-close-button::before\{[\s\S]*?content:none!important/);
 assert.match(css,/\.maplibregl-popup-close-button::after\{[\s\S]*?rotate\(45deg\)/);
 assert.match(css,/\:has\(> \.dj817-x-svg\)::after/);
 assert.doesNotMatch(source('src/place-details.js'),/root\.append\(source\)|source\.textContent=`주소 조회 출처/);
 assert.doesNotMatch(source('src/place-details.js'),/네이버지도에서 시설 주소·연락처 검색/);
});
test('metro neighbor outer background removed while route buttons remain',()=>{
 assert.match(css,/\.metro-neighbor-row\{[\s\S]*?background:transparent!important/);
 assert.match(source('src/transport-map.js'),/metro-rail-previous/);
 assert.match(source('src/transport-map.js'),/metro-rail-current/);
 assert.match(source('src/transport-map.js'),/metro-rail-next/);
});
test('metro station name and badge buttons are normalized without changing selection',()=>{
 const ownerDocument={createElement(tag){return {tag,className:'',textContent:'',children:[],append(...nodes){this.children.push(...nodes)}}}};
 const badge={nodeType:1,className:'dj-metro-line-selector',matches:selector=>selector==='.dj-metro-line-selector'};
 const title={ownerDocument,classList:{contains:c=>c==='subway-title'},childNodes:[{nodeType:3,textContent:'보라매역'},badge],
  get children(){return this.childNodes.filter(n=>n.nodeType===1);},
  querySelector:s=>title.childNodes.find(n=>n.className==='dj-metro-station-name')||null,
  replaceChildren(...els){this.childNodes=els;}};
 assert.equal(normalizeMetroTitle(title),true);
 assert.equal(title.childNodes[0].textContent,'보라매역');
 assert.equal(title.childNodes[1].children[0],badge);
 assert.equal(normalizeMetroTitle(title),false);
 assert.match(source('index.html'),/\/src\/v830-requested-detail-ui.css/);
 assert.match(source('index.html'),/\/src\/v830-transit-title.js/);
});
