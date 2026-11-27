import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildStationAccess} from '../src/metro-station-access.mjs';
const snapshot=JSON.parse(readFileSync(new URL('../public/data/transport/seoul-station-access-v1.json',import.meta.url),'utf8'));
test('versioned Seoul entrance snapshot is populated by numbered georeferenced public records',()=>{
 assert.equal(snapshot.schema,1);
 assert.equal(snapshot.counts.exit,snapshot.elements.length);
 assert.ok(snapshot.elements.length>=500);
 const [w,s,e,n]=snapshot.bbox;
 assert.ok(snapshot.elements.every(x=>x.type==='node'&&Number.isFinite(x.lon)&&Number.isFinite(x.lat)&&x.lon>=w&&x.lon<=e&&x.lat>=s&&x.lat<=n&&/^\\d{1,2}(?:-\\d{1,2})?$/.test(x.tags.ref)));
 for(const name of ['노들','남성','사당','장승배기','상도']){
  const rows=snapshot.elements.filter(x=>String(x.tags.station||'').replace(/\\s|역$/g,'')===name);
  assert.ok(rows.length>0,'Missing entrances: '+name);
  const station={name,lng:rows.reduce((a,x)=>a+x.lon,0)/rows.length,lat:rows.reduce((a,x)=>a+x.lat,0)/rows.length,lines:[]};
  const rendered=buildStationAccess(rows,[station],{},new Map()).features.filter(f=>f.properties.kind==='exit');
  assert.ok(rendered.length>0,'Missing rendered exits: '+name);
 }
});
