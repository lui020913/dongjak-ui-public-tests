import assert from 'node:assert/strict';
import {installDongjakMapPatch,normalizeBusStops,normalizeBuildings,NORYANGJIN_REFERENCE} from '../src/map-patch/dongjak-map-patch.js';

const sample = normalizeBusStops([
  {lat:37.513, lng:126.941, name:'노량진역', arsId:'20001', direction:'사육신공원'},
  {lat:37.513, lng:126.941, name:'중복', arsId:'20001'},
  {lat:37.514, lng:126.943, name:'노량진역', arsId:'20002'},
  {lat:'invalid',lng:126.942,name:'오류'},
]);
assert.equal(sample.features.length,2);
assert.equal(sample.features[0].properties.dj_label,'노량진역 · 20001');
assert.equal(normalizeBuildings({type:'FeatureCollection',features:[
  {type:'Feature',geometry:{type:'Polygon',coordinates:[]},properties:{name:'명칭 있음'}},
  {type:'Feature',geometry:{type:'Polygon',coordinates:[]},properties:{height:23}}
]}).features.length,1);
assert.equal(NORYANGJIN_REFERENCE.features.length,2);

class FakeMap{
  constructor(){this.layers=new Map();this.sources=new Map();this.events=[];this.filters=new Map();}
  addLayer(l){this.layers.set(l.id,l)}
  getLayer(id){return this.layers.get(id)}
  removeLayer(id){this.layers.delete(id)}
  addSource(id,s){this.sources.set(id,{...s,setData(d){this.data=d}})}
  getSource(id){return this.sources.get(id)}
  removeSource(id){this.sources.delete(id)}
  getStyle(){return {layers:[{type:'symbol',id:'existing-label',layout:{'text-font':['Noto Sans Regular']} }]}}
  isStyleLoaded(){return true}
  on(...args){this.events.push(args)}
  off(...args){}
  getFilter(id){return this.filters.get(id)||null}
  setFilter(id,filter){this.filters.set(id,filter)}
}
const map=new FakeMap();
const cleanup=installDongjakMapPatch({map,busStops:sample,buildings:normalizeBuildings({type:'FeatureCollection',features:[]}),noryangjinFix:true});
assert.ok(map.getLayer('dj-20261106-bus-stops-labels'));
assert.equal(map.getLayer('dj-20261106-bus-stops-labels').minzoom,16.1);
assert.ok(map.getLayer('dj-20261106-stations-badges'));
assert.ok(map.getSource('dj-20261106-stations'));
cleanup();
assert.equal(map.layers.size,0);
assert.equal(map.sources.size,0);
console.log('PASS: stops normalized, buildings without names removed, station markers, map patch cleanup');
