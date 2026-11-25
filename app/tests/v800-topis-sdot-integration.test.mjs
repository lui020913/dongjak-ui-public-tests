import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {EXTRA_LAYER_DEFS} from '../src/dongjak-verified-data-layers.js';
import {SAFETY_ICON_COLORS,SAFETY_GLYPH_PATHS} from '../src/dongjak-safety-symbols.js';
import {summarizeDongjakSdot,timestampMillis} from '../server/sdot-environment.mjs';
import {incidentsToGeoJSON} from '../server/topis-road-incidents.mjs';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
test('TOPIS is an unavailable placeholder; S-DoT public UI is retired',()=>{
 const h=read('index.html');
 for(const key of ['road-incidents','sdot-environment']){
  assert.ok(!h.includes(`data-dj-import="${key}"`));
  assert.equal(EXTRA_LAYER_DEFS[key],undefined);
  assert.ok(SAFETY_GLYPH_PATHS[key]?.length);
  assert.ok(SAFETY_ICON_COLORS[key]);
 }
 for(const id of ['dj-feed-road-status','dj-feed-sdot-status','dj-sdot-summary'])assert.ok(!h.includes(`id="${id}"`));
 assert.match(h,/id="pilot-unavailable-incidents"[^>]*disabled/);
 assert.match(h,/v800-ui-architecture\.js/);
 assert.match(read('src/v800-live-environment.css'),/data-feed-state="archive"/);
});
test('archived user CSV is clearly historical, has no fabricated locations and maintains period accounting',()=>{
 const h=JSON.parse(read('public/data/safety/sdot/dongjak_sdot_archive_20261026_1101.json'));
 assert.equal(h.status,'historical');assert.equal(h.coordinates_verified,false);
 assert.equal(h.sensor_count,33);assert.equal(h.file_dongjak_records,5428);
 assert.equal(h.total_records,5393);assert.equal(h.excluded_out_of_period_or_invalid,35);
 assert.equal(h.daily.length,7);assert.equal(h.daily.reduce((a,x)=>a+x.samples,0),h.total_records);
 assert.equal(h.period.end,'2026-11-01');
 const loc=JSON.parse(read('public/data/safety/sdot/dongjak_sdot_locations.geojson'));
 assert.equal(loc.type,'FeatureCollection');assert.deepEqual(loc.features,[]);
});
test('real dataset format Dongjak-gu & ISO datetime underscore is recognized (KST), corrected values win',()=>{
 const now=new Date('2026-11-12T12:00:00Z');
 const rows=[
 {SERIAL:'ABC',AUTONOMOUS_DISTRICT:'Dongjak-gu',SENSING_TIME:'2026-11-12_20:07:00',DATA_NO:'1',AVG_TEMP:'12.3',AVG_HUMI:'67'},
 {SERIAL:'ABC',AUTONOMOUS_DISTRICT:'Dongjak-gu',SENSING_TIME:'2026-11-12_20:07:00',DATA_NO:'2',AVG_TEMP:'12.6',AVG_HUMI:'68'},
 {SERIAL:'XXX',AUTONOMOUS_DISTRICT:'Mapo-gu',SENSING_TIME:'2026-11-12_20:07:00',AVG_TEMP:'99'}
 ];
 const result=summarizeDongjakSdot(rows,{now});
 assert.equal(result.observations.length,1);
 assert.equal(result.observations[0].temperature_c,12.6);
 assert.equal(result.observations[0].humidity_pct,68);
 assert.equal(result.summary.stale,false);
 assert.equal(timestampMillis('2026-11-12_20:07:00'),Date.parse('2026-11-12T11:07:00Z'));
});
test('road incident is not a pedestrian closure proof; no route engine editing',()=>{
 const f=incidentsToGeoJSON([{id:'MOCK',x:126.948,y:37.503,date:'20261112',time:'201200',description:'차량 통제'}]).features;
 assert.equal(f.length,1);assert.equal(f[0].properties.pedestrian_closure_verified,false);
 const original=read('src/main.js');
 assert.match(original,/installDongjakOfficialDataLayers\(/);
 assert.doesNotMatch(original,/sdot-environment|road-incidents/);
});
