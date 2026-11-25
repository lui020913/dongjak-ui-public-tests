import test from 'node:test';
import assert from 'node:assert/strict';
import {routeVehicleGroups,vehicleLabel,stopHours} from '../src/bus-route-detail-model.mjs';
test('places vehicles only before a uniquely identified next stop',()=>{
  const stops=[{seq:1,stationId:'a'},{seq:2,stationId:'b'},{seq:3,stationId:'c'},{seq:4,stationId:'c'}];
  const valid={id:'1',nextStopId:'b'},ambiguous={id:'2',nextStopId:'c'},missing={id:'3'},first={id:'4',nextStopId:'a'};
  const {groups,unplaced}=routeVehicleGroups(stops,[valid,ambiguous,missing,first]);
  assert.deepEqual(groups.get(2),[valid]);assert.deepEqual(unplaced,[ambiguous,missing,first]);
});
test('does not invent occupancy, accessible vehicle type, or schedule',()=>{
  assert.equal(vehicleLabel({vehicleNumber:'4520',congestion:'3',busType:'1'}),'4520 · 여유 · 저상');
  assert.equal(vehicleLabel({vehicleNumber:'4513',congestion:'0'}),'4513');
  assert.equal(stopHours({firstTime:'06:40'}),'06:40 – 미제공');
  assert.equal(stopHours({}),'첫·막차 정보 미제공');
});

import {readFileSync} from 'node:fs';
test('bus detail owns a sibling surface and closes the old stop sheet before opening',()=>{
 const ui=readFileSync(new URL('../src/bus-route-detail.js',import.meta.url),'utf8');
 const css=readFileSync(new URL('../src/bus-route-detail.css',import.meta.url),'utf8');
 const map=readFileSync(new URL('../src/transport-map.js',import.meta.url),'utf8');
 assert.match(ui,/host\.append\(root\)/);assert.doesNotMatch(ui,/panel\.append\(root\)/);
 assert.match(map,/close\(false\);\s*busDetail\.open\(choice\)/);
 assert.doesNotMatch(css,/#transport-sheet\.dj-bus-detail-open/);
 assert.match(css,/overflow-y:auto;overflow-x:hidden/);
 assert.match(map,/reopenRoute\.addEventListener/);
 assert.match(ui,/signature===lastSignature/);
});

test('route detail fades before hiding, removes fake handle, and uses available safe viewport',()=>{
 const ui=readFileSync(new URL('../src/bus-route-detail.js',import.meta.url),'utf8');
 const css=readFileSync(new URL('../src/bus-route-detail.css',import.meta.url),'utf8');
 const map=readFileSync(new URL('../src/transport-map.js',import.meta.url),'utf8');
 assert.ok(ui.includes("event.animationName==='dj-bus-detail-fade-out'"));
 assert.ok(ui.includes("root.hidden=true;cancelClosing();onHidden()"));
 assert.ok(ui.includes("root.dataset.closing='true';root.inert=true"));
 assert.ok(ui.includes("cancelClosing();\n    selection=next"));
 assert.ok(ui.includes("prefers-reduced-motion: reduce"));
 assert.ok(css.includes(".dj-bus-detail::before{content:none;display:none;}"));
 assert.ok(css.includes("@keyframes dj-bus-detail-fade-out{from{opacity:1;}to{opacity:0;}}"));
 assert.ok(css.includes("inset:max(12px,calc(env(safe-area-inset-top,0px) + 8px))"));
 assert.ok(css.includes("height:auto;min-height:0;max-height:none;"));
 assert.ok(!css.includes("77dvh"));
 assert.ok(map.includes("onHidden:syncRoutePresentation"));
});

test('official section order places vehicles with missing or repeated next-stop IDs without GPS guessing',()=>{
 const stops=[{seq:1,stationId:'101'},{seq:2,stationId:'102'},{seq:3,stationId:'103'},{seq:4,stationId:'102'}];
 const missing={id:'a',sectionOrder:1}, repeated={id:'b',nextStopId:'102',sectionOrder:3}, zero={id:'c',nextStopId:'0',sectionOrder:2}, conflict={id:'d',nextStopId:'102',sectionOrder:2}, terminal={id:'e',sectionOrder:4};
 const {groups,unplaced}=routeVehicleGroups(stops,[missing,repeated,zero,conflict,terminal]);
 assert.deepEqual(groups.get(2),[missing]);assert.deepEqual(groups.get(4),[repeated]);assert.deepEqual(groups.get(3),[zero]);assert.deepEqual(unplaced,[conflict,terminal]);
});
