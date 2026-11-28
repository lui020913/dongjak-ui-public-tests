import test from 'node:test';
import assert from 'node:assert/strict';
import {slimMapTextHalos,installMapTextHaloMaintenance} from '../src/map-label-halo.js';
import {buildingExtrusionAppearance} from '../src/map-appearance.js';
import {busFilterInsideDistrict,BASEMAP_BUS_FILTER} from '../src/bus-stop-dedup.js';
import {installBasemapBusStopFallback} from '../src/transport-map.js';
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

test('old night preference cannot alter ordinary building appearance',()=>{
  assert.deepEqual(buildingExtrusionAppearance('dark',52),buildingExtrusionAppearance('light',52));
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

test('idle halo maintenance skips unchanged camera idles and handles later styles',()=>{
 const handlers=new Map(),layers=[{id:'base',type:'symbol',layout:{'text-field':'name'}}],values=new Map([['base',2]]);let scans=0,moving=false;
 const map={on:(k,f)=>handlers.set(k,f),off:k=>handlers.delete(k),isMoving:()=>moving,getStyle:()=>{scans++;return {layers};},getLayer:id=>layers.find(l=>l.id===id),getPaintProperty:id=>values.get(id),setPaintProperty:(id,k,v)=>values.set(id,v)};
 const dispose=installMapTextHaloMaintenance(map);
 assert.equal(values.get('base'),1.1);assert.equal(scans,1);
 for(let i=0;i<20;i++)handlers.get('idle')();assert.equal(scans,1);
 layers.push({id:'late',type:'symbol',layout:{'text-field':'name'}});values.set('late',2.5);handlers.get('styledata')();handlers.get('styledata')();moving=true;handlers.get('idle')();assert.equal(scans,1);moving=false;handlers.get('idle')();assert.equal(scans,2);assert.equal(values.get('late'),1.1);
 values.set('base',2.2);handlers.get('style.load')();handlers.get('idle')();assert.equal(values.get('base'),1.1);assert.equal(scans,3);dispose();assert.equal(handlers.size,0);
});

test('native transit fallback merges the idle and moveend scans without losing late tiles',()=>{
 const src=readFileSync(new URL('../src/transport-map.js',import.meta.url),'utf8');
 const block=src.split('let fallbackScans=0,nativeBusScanPending=true;')[1].split('function fetchAndShow(){')[0];
 assert.match(block,/sourceDataType==='content'\)nativeBusScanPending=true/);
 assert.match(block,/if\(nativeScan\|\|fallbackScan\)augmentWithBasemapStations\(\)/);
 assert.equal((block.match(/augmentWithBasemapStations\(\)/g)||[]).length,1);
 assert.match(block,/if\(nativeScan\)nativeBusScanPending=false/);
 assert.match(block,/const nativeScan=nativeBusScanPending&&\(map.getZoom\?\.\(\)\?\?0\)>=15.5/);
});
