import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {NAMSEONG_DISPLAY_CENTER,alignNamseongDisplayRail} from '../src/namseong-display-alignment.mjs';
import {fixedRailCollection} from '../src/fixed-rail-lines.js';
import {VERIFIED_STATIONS} from '../src/fixed-rail-data.js';
test('Namseong display center comes from all four mapped exit coordinates',()=>{
 const d=JSON.parse(readFileSync(new URL('../public/data/transport/dongjak-station-access-v1.json',import.meta.url),'utf8'));
 const exits=d.elements.filter(e=>e.tags?.station==='남성역(7호선)');
 assert.equal(exits.length,4);
 const avg=['lon','lat'].map(k=>exits.reduce((a,e)=>a+e[k],0)/4);
 assert.ok(avg.every((v,i)=>Math.abs(v-NAMSEONG_DISPLAY_CENTER[i])<1e-9));
});
test('only nearby line 7 display geometry is adjusted, raw routing and other lines unchanged',()=>{
 const raw=fixedRailCollection(),before=JSON.stringify(raw);
 const out=alignNamseongDisplayRail(raw);
 assert.equal(JSON.stringify(raw),before);
 assert.notDeepEqual(VERIFIED_STATIONS.남성,NAMSEONG_DISPLAY_CENTER);
 assert.ok(out.features.filter(f=>f.properties.line==='7호선').some(f=>f.geometry.coordinates.some(p=>p.every((v,i)=>Math.abs(v-NAMSEONG_DISPLAY_CENTER[i])<1e-9))));
 for(let i=0;i<raw.features.length;i++)if(raw.features[i].properties.line!=='7호선')assert.equal(out.features[i],raw.features[i]);
 assert.ok(out.features.some(f=>f.properties.displayAlignment==='entrance-midpoint-approximation'));
});
