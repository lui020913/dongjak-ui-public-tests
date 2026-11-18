import test from 'node:test';
import assert from 'node:assert/strict';
import {parseSdotResponse,summarizeDongjakSdot,timestampMillis} from '../server/sdot-environment.mjs';
import {onRequestGet} from '../functions/api/sdot-environment.js';
import {readFileSync} from 'node:fs';

test('official sDoTEnv response and API errors',()=>{
 assert.equal(parseSdotResponse({sDoTEnv:{RESULT:{CODE:'INFO-000'},list_total_count:1,row:[{SERIAL:'S1'}]}}).rows.length,1);
 assert.throws(()=>parseSdotResponse({RESULT:{CODE:'ERROR-1'}}),/SDOT_API/);
});
test('prefer corrected DATA_NO 2, latest time, Dongjak only, and no bogus averages',()=>{
 const now=new Date('2026-11-12T12:00:00Z');
 const base={SERIAL:'D1',AUTONOMOUS_DISTRICT:'동작구',SENSING_TIME:'2026-11-12 20:00:00'};
 const data=summarizeDongjakSdot([
  {...base,DATA_NO:1,AVG_TEMP:'20',AVG_HUMI:'50'},
  {...base,DATA_NO:2,AVG_TEMP:'21',AVG_HUMI:'55'},
  {...base,SENSING_TIME:'2026-11-12 19:00:00',DATA_NO:2,AVG_TEMP:'18'},
  {...base,SERIAL:'O1',AUTONOMOUS_DISTRICT:'종로구',AVG_TEMP:'18'},
  {...base,SERIAL:'D2',AVG_TEMP:'999',AVG_HUMI:'80'},
 ],{now});
 assert.equal(data.observations.length,2);
 assert.equal(data.observations[0].temperature_c,21);
 assert.equal(data.observations[0].humidity_pct,55);
 assert.equal(data.observations[1].temperature_c,null);
 assert.equal(data.summary.recent_mean_temp_c,21);
 assert.equal(data.summary.recent_mean_humidity_pct,67.5);
 assert.equal(data.summary.stale,false);
});
test('timestamps pin Asia/Seoul; stale readings must not be presented as current',()=>{
 assert.equal(timestampMillis('2026-11-12 20:00:00'),Date.parse('2026-11-12T11:00:00Z'));
 assert.equal(timestampMillis('2026-11-12_20:00:00'),Date.parse('2026-11-12T11:00:00Z'));
 const data=summarizeDongjakSdot([{SERIAL:'D1',AUTONOMOUS_DISTRICT:'동작구',SENSING_TIME:'2026-11-11 20:00:00',AVG_TEMP:8}],{now:new Date('2026-11-12T12:00:00Z')});
 assert.equal(data.summary.stale,true);
 assert.equal(data.summary.recent_mean_temp_c,null);
});
test('server endpoint never exposes key and signals not_configured',async()=>{
 const res=await onRequestGet({request:new Request('https://example.com/api/sdot-environment'),env:{}});
 assert.equal(res.status,503);const text=await res.text();assert.doesNotMatch(text,/testSECRETKEY/);
});
test('UI has S-DoT toggle and verified-only location file',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const point=JSON.parse(readFileSync(new URL('../public/data/safety/sdot/dongjak_sdot_locations.geojson',import.meta.url),'utf8'));
 assert.match(html,/data-dj-import="sdot-environment"/);
 assert.deepEqual(point.features,[]);
 const js=readFileSync(new URL('../src/dongjak-verified-data-layers.js',import.meta.url),'utf8');
 assert.match(js,/filteredDistrictPoints\(\{type:'FeatureCollection',features\},boundary\)/);
});
