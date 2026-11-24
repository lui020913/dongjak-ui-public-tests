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
