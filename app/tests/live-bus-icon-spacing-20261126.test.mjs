import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {neutralBusArt,ensureNeutralBusImage,NEUTRAL_BUS_IMAGE} from '../src/live-bus-art.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('both live bus overlays use a registered neutral bus glyph without heading guesses',()=>{
 const art=neutralBusArt();assert.equal(art.data.length,48*48*4);assert.ok(art.data.some(v=>v===255));
 const images=new Map();const map={hasImage:id=>images.has(id),addImage:(id,img)=>images.set(id,img)};
 assert.equal(ensureNeutralBusImage(map),true);assert.ok(images.has(NEUTRAL_BUS_IMAGE));
 const selected=read('src/bus-route-overlay.js'),global=read('src/features/liveTransit/index.js');
 assert.match(selected,/VEHICLE_LAYER\+'-unknown',type:'symbol'/);
 assert.match(global,/busArt\?\{id:LIVE_BUS_LAYER,type:'symbol'/);
});
test('one fixed slot per consecutive stop, regardless of number of vehicles',()=>{
 const js=read('src/bus-route-detail.js'),css=read('src/bus-route-detail.css');
 assert.match(js,/if\(index>0\)\{const slot=make\('div','dj-bus-detail-vehicle-slot'\)/);
 assert.match(js,/for\(const v of group\)strip.append\(vehicleRow\(v\)\)/);
 assert.doesNotMatch(js,/for\(const v of groups.get\(s.seq\)\|\|\[\]\)list.append/);
 assert.match(css,/--stop-height:72px;--vehicle-slot-height:52px/);
 assert.match(css,/height:var\(--vehicle-slot-height\);min-height:var\(--vehicle-slot-height\);max-height:var\(--vehicle-slot-height\)/);
 assert.match(css,/overflow-x:auto;overflow-y:hidden/);
});
