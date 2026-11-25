import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DongjakWalkSlopeRouter} from '../src/lib/dongjakWalkSlopeRouter.mjs';
import {filteredDistrictPoints,insideBoundary,EXTRA_LAYER_DEFS} from '../src/dongjak-verified-data-layers.js';

const load=p=>JSON.parse(readFileSync(new URL('../public/'+p,import.meta.url),'utf8'));
const graph=load('data/safety/walk/dongjak_walk_graph.json');
const slopes=load('data/safety/slope/dongjak_walk_slope_by_link.json');

test('the supplied Dongjak pedestrian graph and estimated-grade data use the same link set',()=>{
  assert.equal(graph.edges.length,10232);
  assert.equal(graph.nodes.length,8231);
  assert.equal(Object.keys(slopes.links||slopes).length,graph.edges.length);
  for(const edge of graph.edges){
    assert.match(edge[4],/^1[01]{3}$/);
    assert.ok(Object.hasOwn(slopes.links||slopes,String(edge[0])));
  }
});

test('real local pedestrian shortest and gentle routes follow link polyline coordinates',()=>{
  const router=new DongjakWalkSlopeRouter(graph,slopes);
  const from=[126.960,37.510],to=[126.962,37.512];
  const shortest=router.route(from,to,{mode:'shortest',maxSnapMeters:85});
  const gentle=router.route(from,to,{mode:'gentle',maxSnapMeters:85});
  for(const r of [shortest,gentle]){
    assert.ok(r.geojson.geometry.coordinates.length>2);
    assert.ok(r.distanceMeters>=200);
    assert.ok(r.distanceMeters<=10000);
    assert.ok(r.estimatedMinutes>0);
    assert.ok(Number.isFinite(r.estimatedTerrainAscentM));
    assert.ok(r.startSnapMeters<=85&&r.endSnapMeters<=85);
  }
  assert.ok(gentle.estimatedTerrainAscentM<=shortest.estimatedTerrainAscentM);
  assert.notDeepEqual(gentle.geojson.geometry.coordinates,shortest.geojson.geometry.coordinates);
});

test('accidents/CCTV/survey/metro GeoJSON files have expected counts and coordinates',()=>{
  const files={
    'data/safety/accidents/dongjak_accident_points_all.geojson':119,
    'data/safety/cctv/dongjak_cctv_security.geojson':602,
    'data/safety/cctv/dongjak_cctv_parking.geojson':95,
    'data/sangdo1-crosswalks-team-review.geojson':41,
    'data/safety/metro/dongjak_elevators_verified.geojson':21,
    'data/safety/slope/dongjak_walk_links_with_slope.geojson':10232
  };
  for(const [file,count] of Object.entries(files)){
    const f=load(file);assert.equal(f.type,'FeatureCollection');assert.equal(f.features.length,count);
    assert.ok(f.features.every(item=>['Point','LineString'].includes(item.geometry?.type)));
  }
});

test('CCTV-like point filtering never shows points outside the district polygon',()=>{
  const boundary={type:'Polygon',coordinates:[[[126.9,37.47],[126.98,37.47],[126.98,37.54],[126.9,37.54],[126.9,37.47]]]};
  assert.ok(insideBoundary([126.95,37.50],boundary));
  assert.ok(!insideBoundary([127.15,37.50],boundary));
  assert.throws(()=>filteredDistrictPoints({type:'FeatureCollection',features:[]},null));
  const result=filteredDistrictPoints({type:'FeatureCollection',features:[
    {type:'Feature',geometry:{type:'Point',coordinates:[126.95,37.50]},properties:{}},
    {type:'Feature',geometry:{type:'Point',coordinates:[127.15,37.50]},properties:{}},
    {type:'Feature',geometry:{type:'Point',coordinates:[NaN,37.50]},properties:{}}
  ]},boundary);
  assert.equal(result.features.length,1);
  assert.equal(Object.keys(EXTRA_LAYER_DEFS).length,9);
  assert.equal(EXTRA_LAYER_DEFS['road-incidents'],undefined);
  assert.equal(EXTRA_LAYER_DEFS['sdot-environment'],undefined);
});

test('main app connects the local worker router and only loads optional layers on demand',()=>{
  const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
  const markup=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.match(main,/fetchPreferredPedestrianPair\(routeStart,routeEnd\)/);
  assert.match(main,/currentPreferredModeResult\(/);
  assert.match(markup,/id="route-data-note"/);
  for(const name of Object.keys(EXTRA_LAYER_DEFS))assert.ok(markup.includes(`data-dj-import="${name}"`));
});
