import test from 'node:test';
import assert from 'node:assert/strict';
import {slimMapTextHalos} from '../src/map-label-halo.js';
import {nightOcclusionBuildingPaint,buildingExtrusionAppearance} from '../src/map-appearance.js';
import {busFilterInsideDistrict,BASEMAP_BUS_FILTER} from '../src/bus-stop-dedup.js';
import {installBasemapBusStopFallback} from '../src/transport-map.js';
import {createNightMapRoadLayer} from '../src/night-map-roads-gl.js';
import {readFileSync} from 'node:fs';

const district={type:'Polygon',coordinates:[[[126.91,37.48],[126.98,37.48],[126.98,37.52],[126.91,37.52],[126.91,37.48]]]};

test('map label halo shrinks once, including basemap post-office and bus labels',()=>{
  const values=new Map([['post',2.7],['bus',1.7],['small',0.8]]);
  const layers=[...values.keys()].map(id=>({id,type:'symbol',layout:{'text-field':['get','name']}}));
  const m={getStyle:()=>({layers}),getLayer:id=>layers.find(x=>x.id===id),
    getPaintProperty:id=>values.get(id),setPaintProperty:(id,key,v)=>{assert.equal(key,'text-halo-width');values.set(id,v);}};
  assert.equal(slimMapTextHalos(m),2);
  assert.equal(values.get('post'),1.1);assert.equal(values.get('bus'),1.1);
  assert.equal(values.get('small'),0.8);
  assert.equal(slimMapTextHalos(m),0,'idempotent: no endless styledata/idle reflows');
});

test('night analysis dark building blocks road show-through and restores on exit',()=>{
  const old=buildingExtrusionAppearance('dark',52);
  assert.ok(old.opacity<=0.58,'normal dark building remains translucent');
  const night=nightOcclusionBuildingPaint(old,true);
  assert.equal(night.opacity,0.91);
  assert.equal(night.color,'#192c34');
  assert.deepEqual(nightOcclusionBuildingPaint(old,false),old);
});

test('night analytical 3D road shares building depth rather than drawing through roofs',()=>{
  const native=createNightMapRoadLayer({getPitch:()=>48,getZoom:()=>18},{});
  assert.equal(native.layer.renderingMode,'3d');
});

test('bus tile fallback is explicitly clipped to polygon; missing polygon is fail-closed',()=>{
  assert.deepEqual(busFilterInsideDistrict(BASEMAP_BUS_FILTER,null),['==',1,0]);
  const filtered=busFilterInsideDistrict(BASEMAP_BUS_FILTER,district);
  assert.equal(filtered[0],'all');assert.equal(filtered[2][0],'within');
  assert.deepEqual(filtered[2][1],district);
  const layers=[{id:'poi_transit',type:'symbol',source:'base','source-layer':'poi'}];
  const m={getLayer:id=>layers.find(x=>x.id===id),hasImage:()=>true,getStyle:()=>({layers}),
    addLayer:layer=>layers.push(layer)};
  assert.equal(installBasemapBusStopFallback(m,district),true);
  assert.equal(m.getLayer('dj-basemap-bus-pictogram').filter[2][0],'within');
});


test('native global bus symbols are hidden even if district boundary fetch fails',()=>{
  const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
  assert.match(main,/suppressNativeBusStopGlyphs\(map\)/);
});
