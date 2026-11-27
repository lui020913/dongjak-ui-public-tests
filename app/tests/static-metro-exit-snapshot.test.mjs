import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildStationAccess,normalizeExitStation} from '../src/metro-station-access.mjs';
import {pointInStationDistrict} from '../src/station-district-scope.mjs';
const snapshot=JSON.parse(readFileSync(new URL('../public/data/transport/dongjak-station-access-v1.json',import.meta.url),'utf8'));
const ring=JSON.parse(readFileSync(new URL('../public/data/dongjak_sig_reference.geojson',import.meta.url),'utf8')).features[0].geometry.coordinates[0];
test('only numbered exits inside the visible district boundary are packaged',()=>{
 assert.equal(snapshot.schema,1);assert.match(snapshot.scope,/11590/);
 assert.equal(snapshot.counts.exit,snapshot.elements.length);
 assert.ok(snapshot.elements.length>=20&&snapshot.elements.length<150);
 assert.ok(snapshot.elements.every(e=>e.type==='node'&&pointInStationDistrict(e.lon,e.lat,ring)&&/^\d{1,2}(?:-\d{1,2})?$/.test(e.tags.ref)));
 for(const name of ['노들','남성','장승배기','상도','사당','이수']){
  const rows=snapshot.elements.filter(x=>normalizeExitStation(x.tags.station)===name);
  assert.ok(rows.length>0,'Missing entrances: '+name);
  const station={name,lng:rows.reduce((a,x)=>a+x.lon,0)/rows.length,lat:rows.reduce((a,x)=>a+x.lat,0)/rows.length,lines:[]};
  assert.ok(buildStationAccess(rows,[station],{},new Map(),(x,y)=>pointInStationDistrict(x,y,ring)).features.some(f=>f.properties.kind==='exit'));
 }
});
test('boundary inclusion and outside rejection',()=>{assert.ok(pointInStationDistrict(...ring[0],ring));assert.equal(pointInStationDistrict(127,37.55,ring),false);});

test('official exit points render independently of streamed station markers',()=>{const result=buildStationAccess(snapshot.elements,[],{},new Map(),(x,y)=>pointInStationDistrict(x,y,ring));assert.equal(result.features.filter(f=>f.properties.kind==='exit').length,snapshot.elements.length);});
