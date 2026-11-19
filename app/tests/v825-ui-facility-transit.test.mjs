import {historicalSnapshotTest} from './support/historical-snapshot-audit.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {
 selectedTransportPinElement,transportPinCoordinates,createSelectedTransportPin,mobileTransportFocusOffset
} from '../src/transport-selection-marker.js';
import {stripApprovedV825TransportUI} from './support/approved-v825-transport-ui.mjs';
import {APPROVED_V818_TRANSPORT_FOCUS_SHA256} from './support/approved-walk-integration.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const css=read('src/v825-typography-facility-transport.css');
const transport=read('src/transport-map.js');

historicalSnapshotTest('v825: only approved transport pin/camera edits change protected renderer',()=>{
 assert.equal(createHash('sha256').update(stripApprovedV825TransportUI(transport)).digest('hex'),
   APPROVED_V818_TRANSPORT_FOCUS_SHA256);
});
test('v825: actual selected coordinate validated, outside/faulty points rejected',()=>{
 assert.deepEqual(transportPinCoordinates({lng:126.9325,lat:37.5123}),[126.9325,37.5123]);
 for(const bad of [{lng:10,lat:45},{lng:126.9},{lng:'bad',lat:37.5},{lng:null,lat:37.5}]){
   // Null is rejected by the above-coordinate guard, not silently converted into a map point.
   assert.equal(transportPinCoordinates(bad),null);
 }
});
test('v825: bus and subway pins choose correct location pictogram and accessible label',()=>{
 const doc={createElement:(tag)=>({tag,children:[],setAttribute(k,v){this[k]=v;},append(v){this.children.push(v);}})};
 const bus=selectedTransportPinElement({kind:'bus',name:'노량진초등학교앞'},doc);
 assert.match(bus.className,/pin--bus/);assert.match(bus['aria-label'],/버스정류장/);
 const metro=selectedTransportPinElement({kind:'subway',name:'대방'},doc);
 assert.match(metro.className,/pin--subway/);assert.match(metro['aria-label'],/지하철역/);
});
test('v825: old marker removed, new marker uses clicked coordinate, cleanup works',()=>{
 let removed=0,created=0,markerInfo=null;
 const doc={createElement:()=>({setAttribute(){},append(){}})};
 class FakeMarker{constructor(options){markerInfo={options};created++;}setLngLat(coords){markerInfo.coords=coords;return this;}addTo(map){markerInfo.map=map;return this;}remove(){removed++;}}
 const map={};
 const pin=createSelectedTransportPin({map,maplibregl:{Marker:FakeMarker},place:{kind:'bus',lng:126.9,lat:37.5},
    previous:{remove(){removed++;}},documentRef:doc});
 assert.ok(pin);assert.deepEqual(markerInfo.coords,[126.9,37.5]);assert.equal(markerInfo.map,map);assert.equal(created,1);
 assert.equal(removed,1);pin.remove();assert.equal(removed,2);
});
test('v825: when mobile sheet starts, camera places stop above it',()=>{
 for(const [h,top] of [[800,405],[640,290],[950,510]]){
   const offset=mobileTransportFocusOffset({viewportHeight:h,panelTop:top,containerTop:0});
   assert.ok(h/2+offset<top-35,`marker should remain above sheet: ${h} ${top} ${offset}`);
   assert.ok(h/2+offset>95,`marker should not disappear into header: ${h} ${top}`);
 }
});
test('v825: PC facility body fills popup and info rows use width and scroll',()=>{
 assert.match(css,/\.dj-place-detail-popup \.dj-place-detail\{[\s\S]*?width:100%!important/);
 assert.match(css,/\.dj-place-detail-popup \.dj-place-row\{[\s\S]*?grid-template-columns:91px minmax\(0,1fr\)/);
 assert.match(css,/\.dj-place-detail-popup \.maplibregl-popup-content\{[\s\S]*?overflow-y:auto/);
 assert.match(read('src/map-popup-viewport.js'),/Math\.min\(onPhone\?340:\(onDesktop\?620:485\),safeWidth\)/);
});
test('v825: four bus routes per desktop row, small mobiles are legible',()=>{
 assert.match(css,/@media\(min-width:1080px\)/);
 assert.match(css,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)!important/);
 assert.match(css,/@media\(max-width:699px\)/);
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/);
});
test('v825: all common closers use a geometric centered X',()=>{
 for(const id of ['transport-close','map-safety-close','route-search-close','admin-dong-close',
  'overview-sheet-close','road-width-legend-close','map-quick-search-close'])assert.ok(css.includes('#'+id));
 assert.match(css,/background:linear-gradient\(currentColor,currentColor\)/);
 assert.match(css,/translate\(-50%,-50%\) rotate\(45deg\)/);
 assert.match(css,/\.maplibregl-popup-close-button::after/);
});
test('v825: dark and light subway headings have independently tinted up/down surfaces',()=>{
 for(const name of ['.metro-arrival-direction-group.up','.metro-arrival-direction-group.down',
 '.metro-direction-heading.up','.metro-direction-heading.down'])assert.ok(css.includes(name));
 assert.ok(css.includes('#dcedfa')&&css.includes('#ffebc8'));
 assert.ok(css.includes('#254b61')&&css.includes('#5a4428'));
});
test('v825: version, final stylesheet order and setting-scaled type hierarchy',()=>{
 const current=JSON.parse(read('package.json')).version;
 const releases=JSON.parse(read('src/app-release-log.json')).releases;
 assert.equal(current,releases[0].version);
 assert.ok(releases.some(entry=>entry.sourceVersion==='v8.25.0' && entry.version==='8.0.6')); // migrated label, original still traceable
 const html=read('index.html');
 assert.ok(html.indexOf('/src/v825-typography-facility-transport.css')>html.indexOf('/src/local-font.css'));
 for(const variable of ['--dj825-size-xs','--dj825-size-body','--dj825-size-control',
   '--dj825-size-section','--dj825-size-title','--dj803-text-delta'])assert.ok(css.includes(variable));
});
