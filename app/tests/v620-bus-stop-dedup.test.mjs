import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  deduplicateBusStops,samePhysicalBusStop,busTileFallbackFilter,busStopMeters
} from '../src/bus-stop-dedup.js';
import {installBasemapInfrastructureLabels} from '../src/map-infrastructure-labels.js';

const stop=(id,lng,lat,extra={})=>({id,kind:'bus',name:'건영아파트',lng,lat,arsId:'',lines:[],...extra});
const a=stop('official-A',126.952,37.502,{arsId:'20123',source:'seoul-official-bus-stop'});
const b=stop('official-B',126.95228,37.50201,{arsId:'20124',source:'seoul-official-bus-stop'});

test('two directions with different official ARS identifiers remain distinct even if close and named the same',()=>{
  assert.ok(busStopMeters(a,b)<30);
  assert.equal(samePhysicalBusStop(a,b),false);
  assert.equal(deduplicateBusStops([a,b]).length,2);
});

test('OSM and basemap copies of the same stop are removed; authoritative ARS entry remains',()=>{
  const base=stop('basemap/bus/100',126.952012,37.502008,{source:'basemap-poi'});
  const osm=stop('osm-viewport-node-123',126.95201,37.502003,{source:'osm-visible-stop'});
  const officialDup=stop('official-copy',126.9520005,37.5020005,{arsId:'20123',source:'seoul-official-bus-stop'});
  const result=deduplicateBusStops([base,osm,a,officialDup,b]);
  assert.deepEqual(result.map(x=>x.arsId).sort(),['20123','20124']);
});

test('different named stops and independently mapped same-feed platforms are not arbitrarily joined',()=>{
  const other=stop('osm-other',126.95206,37.502,{name:'건영아파트후문',source:'osm-visible-stop'});
  assert.equal(samePhysicalBusStop(other,stop('osm-1',126.952,37.502,{source:'osm-visible-stop'})),false);
  const side1=stop('osm-1',126.952,37.502,{source:'osm-visible-stop'});
  const side2=stop('osm-2',126.95217,37.502,{source:'osm-visible-stop'});
  assert.equal(samePhysicalBusStop(side1,side2),false);
  assert.equal(deduplicateBusStops([side1,side2,other]).length,3);
});

test('unknown-name points are not merged from more than 8m apart',()=>{
  const unknown=stop('base1',126.952,37.502,{name:'정류장명 미등록',source:'basemap-poi'});
  const other=stop('osm2',126.95213,37.502,{name:'정류장명 미등록',source:'osm-visible-stop'});
  assert.equal(samePhysicalBusStop(unknown,other),false);
});

test('tile fallback remains if official stop list empty; otherwise hides only 16m nearby tiles',()=>{
  const center={lng:126.952,lat:37.502};
  const empty=busTileFallbackFilter([],center);
  assert.equal(empty[0],'any');
  const filtered=busTileFallbackFilter([a,b],center);
  assert.equal(filtered[0],'all');
  assert.equal(filtered[2][0],'!');
  assert.equal(filtered[2][1][0],'within');
  const geometry=filtered[2][1][1];
  assert.equal(geometry.type,'MultiPolygon');
  assert.equal(geometry.coordinates.length,2);
  assert.equal(geometry.coordinates[0][0].length,13);
  assert.deepEqual(geometry.coordinates[0][0][0],geometry.coordinates[0][0].at(-1));
});

test('legacy basemap bus labels do not visibly duplicate the unified layer',()=>{
  const src=readFileSync(new URL('../src/ui-environment.js',import.meta.url),'utf8');
  assert.match(src,/dongjak-zoom-busstop-names/);
  assert.match(src,/layout:\{'visibility':'none',/);
  const layers=[];
  const map={getStyle:()=>({layers:[{id:'poi_transit',source:'base',type:'symbol','source-layer':'poi'}]}),
    getSource:()=>({}),getLayer:id=>layers.find(x=>x.id===id),addLayer:l=>layers.push(l)};
  installBasemapInfrastructureLabels(map);
  assert.equal(layers.find(l=>l.id==='dj-basemap-bus-stop-names').layout.visibility,'none');
  assert.match(readFileSync(new URL('../src/transport-map.js',import.meta.url),'utf8'),/updateTileBusFallbackFilter\(\)/);
});
