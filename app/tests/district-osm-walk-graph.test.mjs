import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {DongjakWalkSlopeRouter} from '../src/lib/dongjakWalkSlopeRouter.mjs';
import {osmWalkRoute} from '../src/district-osm-walk-client.mjs';
import {chooseShortestPedestrianNetwork} from '../src/pedestrian-network-comparison.mjs';
const bytes=readFileSync(new URL('../public/data/safety/walk/district-osm-walk-graph.json',import.meta.url));
const graph=JSON.parse(bytes);
test('immutable attributed district-wide OSM snapshot retains original node topology',()=>{
 assert.equal(createHash('sha256').update(bytes).digest('hex'),'27c94a46e9b0e99be60078aa787d37e235c0fe13cd6667e723a5d5c2ea27198f');
 assert.equal(graph.license,'ODbL-1.0');assert.equal(graph.nodes.length,12983);assert.equal(graph.edges.length,17107);
 const ids=new Set();
 for(const [id,a,b,m,kind,flags,coords] of graph.edges){
  assert.ok(!ids.has(id));ids.add(id);
  assert.ok(m>0&&a!==b);assert.deepEqual(coords[0],graph.nodes[a]);assert.deepEqual(coords.at(-1),graph.nodes[b]);
 }
 assert.equal(graph.edges.filter(e=>e[4]==='00').length,2994);
});
test('actual mapped pedestrian edges can be routed and are not mislabeled as measured safety data',()=>{
 const router=new DongjakWalkSlopeRouter(graph,{});
 const regions=[[126.92,37.50],[126.947,37.50],[126.975,37.49]];
 for(const center of regions){
  const edge=graph.edges.filter(e=>e[4]==='00'&&e[3]>30).sort((a,b)=>Math.hypot(a[6][0][0]-center[0],a[6][0][1]-center[1])-Math.hypot(b[6][0][0]-center[0],b[6][0][1]-center[1]))[0];
  const a=edge[6][0],b=edge[6].at(-1);
  const route=osmWalkRoute(router.route(a,b,{mode:'shortest',maxSnapMeters:85}));
  assert.equal(route.source,'osm-pedestrian-graph');assert.ok(route.kilometers>0&&route.coords.length>=2);assert.equal(route.slopeAscentM,undefined);
  const from={lng:a[0],lat:a[1]},to={lng:b[0],lat:b[1]};
  assert.equal(chooseShortestPedestrianNetwork(null,route,from,to),route);
 }
});
