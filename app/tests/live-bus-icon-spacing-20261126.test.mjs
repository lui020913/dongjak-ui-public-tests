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
test('fixed compact stop spacing and overlapping GPS vehicle markers stay on one vertical line',()=>{
 const js=read('src/bus-route-detail.js'),css=read('src/bus-route-detail.css');
 assert.ok(js.includes('vehicleIntervalProgress(stops[index-1],s,v)'));
 assert.ok(js.includes("slot.append(row)"));
 assert.ok(js.includes("progress??.5"));
 assert.ok(!js.includes('dj-bus-detail-vehicle-strip'));
 assert.ok(css.includes('--stop-height:64px'));
 assert.ok(css.includes('height:0;min-height:0;max-height:0'));
 assert.ok(css.includes('top:calc((var(--vehicle-progress,.5) - .5) * var(--stop-height))'));
 assert.ok(!css.includes('--vehicle-slot-height'));
 assert.ok(!css.includes('dj-bus-detail-vehicle-strip'));
 const overlay=read('src/bus-route-overlay.js');
 assert.ok(overlay.includes('longitude:f.geometry.coordinates[0],latitude:f.geometry.coordinates[1]'));
});
