import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {IMPORTANT_PLACES} from '../src/important-place-click.js';
import {featuredPlaceCollection,featuredPlaceStyle,installFeaturedPlaceLabels} from '../src/featured-place-labels.js';

const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');

test('five named key locations are complete and backed by existing coordinates, not an API',()=>{
  const features=featuredPlaceCollection().features;
  assert.deepEqual(features.map(f=>f.properties.name),['중앙대학교','숭실대학교','총신대학교','동작구청','국립서울현충원']);
  for(const [i,f] of features.entries()){
    if(f.properties.name==='숭실대학교'){assert.ok(f.geometry.coordinates[0]>IMPORTANT_PLACES[i].lng);assert.equal(f.geometry.coordinates[1],IMPORTANT_PLACES[i].lat);}
    else assert.deepEqual(f.geometry.coordinates,[IMPORTANT_PLACES[i].lng,IMPORTANT_PLACES[i].lat]);
    assert.equal(f.properties.address,IMPORTANT_PLACES[i].address);
  }
});

test('map-native place labels stay visible during moves, and support location clicks and themes',()=>{
  const sources=new Map(),layers=new Map(),listeners=[];
  const map={
    addSource:(id,source)=>sources.set(id,source),getSource:id=>sources.get(id),
    getLayer:id=>layers.get(id),addLayer:layer=>layers.set(layer.id,layer),
    getStyle:()=>({layers:[...layers.values()]}),
    setPaintProperty:(id,key,val)=>{layers.get(id).paint[key]=val;},
    moveLayer:(id,before)=>{const row=layers.get(id);layers.delete(id);if(!before){layers.set(id,row);return;}
      const copy=[...layers.entries()];layers.clear();for(const [k,v] of copy){if(k===before)layers.set(id,row);layers.set(k,v);}},
    on:(event,layerOrFn,callback)=>listeners.push([event,layerOrFn,callback]),
    off:()=>{}
  };
  const app={dataset:{theme:'dark'}};
  const cleanup=installFeaturedPlaceLabels({map,maplibregl:{},app});
  assert.equal(sources.get('dongjak-featured-places').data.features.length,5);
  const labels=layers.get('dongjak-featured-place-names');
  assert.equal(labels.type,'symbol');
  assert.equal(labels.layout['text-allow-overlap'],true);
  assert.equal(labels.layout['text-pitch-alignment'],'viewport');
  assert.equal(labels.paint['text-color'],featuredPlaceStyle('dark').text);
  assert.ok(listeners.some(row=>row[0]==='click'&&row[1]==='dongjak-featured-place-names'));
  app.dataset.theme='light';
  listeners.find(row=>row[0]==='idle')[1]();
  assert.equal(labels.paint['text-color'],featuredPlaceStyle('light').text);
  cleanup();
});

test('native named facilities replace duplicated floating logo markers',()=>{
  const main=read('src/main.js');
  assert.match(main,/installFeaturedPlaceLabels\(\{map,maplibregl,app\}\)/);
  assert.match(read('src/education-layer.js'),/usesNativePlaceLabel/);
  assert.match(read('src/landmark-layer.js'),/usesNativePlaceLabel/);
  assert.match(read('src/important-place-click.js'),/dongjak-featured-place-names/);
  const code=read('src/featured-place-labels.js');
  assert.doesNotMatch(code,/overpass-api|fetch\(/);
});

test('close-up bus labels show known names from the transport GeoJSON, with OSM vector fallback',()=>{
  const map=read('src/transport-map.js');
  const ui=read('src/ui-environment.js');
  assert.match(map,/id:'transport-bus-names-close'.*minzoom:18\.4/);
  assert.match(map,/'text-allow-overlap':true/);
  assert.match(ui,/\['get','subclass'\]/);
  assert.match(ui,/\['get','name:nonlatin'\]/);
  assert.match(ui,/\['get','name'\]/);
  assert.match(read('src/base-layer-controls.js'),/transport-bus-names-close/);
});
