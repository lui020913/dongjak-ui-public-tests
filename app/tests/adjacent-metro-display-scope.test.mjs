import test from 'node:test';
import assert from 'node:assert/strict';
import {fixedMetroStations} from '../src/fixed-rail-lines.js';
import {metroMarkerGeojson,makeMetroDisplayScope} from '../src/metro-marker-geodata.js';
const canonical=fixedMetroStations();
const normalizeName=x=>String(x).replace(/역$/,'');
const normalizeLine=x=>x;
const colors={'1호선':'#0052a4','2호선':'#00a84d','4호선':'#00a5de','7호선':'#747f00','9호선':'#b89b2f','신림선':'#6789ca','5호선':'#996cac'};
test('outside scope includes Daebang and curated neighbors, not all fixed or discovered stations',()=>{
 const stationScope=makeMetroDisplayScope(canonical,{normalizeName,normalizeLine,isDistrict:()=>false});
 const extra=[{kind:'subway',name:'여의도',lines:['5호선','9호선'],lng:126.92436,lat:37.52175},{kind:'subway',name:'대방',lines:['5호선'],lng:126.926382,lat:37.513342}];
 const result=metroMarkerGeojson(extra,{canonicalStations:canonical,normalizeName,normalizeLine,colors,stationScope,placements:(name,lines,lng,lat)=>lines.map(line=>({line,lng,lat}))});
 const names=new Set(result.features.map(f=>f.properties.stationKey));
 for(const name of ['대방','신길','신림','이촌','구반포'])assert.ok(names.has(name),name);
 for(const name of ['여의도','영등포','관악산','서울대벤처타운'])assert.ok(!names.has(name),name);
 for(const role of ['summary','detail'])assert.deepEqual(new Set(result.features.filter(f=>f.properties.stationKey==='대방'&&f.properties.role===role).map(f=>f.properties.line)),new Set(['1호선','신림선']));
});
