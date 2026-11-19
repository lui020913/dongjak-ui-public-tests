import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {installBasemapBusStopFallback,suppressNativeBusStopGlyphs} from '../src/transport-map.js';
import {BASE_LAYER_IDS,applyBaseLayerVisibility} from '../src/base-layer-controls.js';
import {onRequestGet,onRequestPost} from '../functions/api/place-insight.js';

test('bus POI fallback exists even when official stop GeoJSON has zero features',()=>{
  const layers=[{id:'poi_transit',type:'symbol',source:'openfreemap','source-layer':'poi'},
    {id:'dj-transport-bus-pictogram',type:'symbol',source:'transport-bus'}];
  const paint=[];
  const map={getLayer:id=>layers.find(x=>x.id===id),hasImage:id=>id==='dj-bus-blue-marker',
    getStyle:()=>({layers}),addLayer(layer,before){const i=layers.findIndex(x=>x.id===before);layers.splice(i<0?layers.length:i,0,layer);},
    getPaintProperty:()=>1,setPaintProperty:(...args)=>paint.push(args)};
  const district={type:'Polygon',coordinates:[[[126.9,37.4],[127,37.4],[127,37.6],[126.9,37.6],[126.9,37.4]]]};
  assert.equal(installBasemapBusStopFallback(map,district),true);
  const fallback=map.getLayer('dj-basemap-bus-pictogram');
  assert.equal(fallback.source,'openfreemap');
  assert.equal(fallback['source-layer'],'poi');
  assert.equal(fallback.layout['icon-image'],'dj-bus-blue-marker');
  assert.equal(fallback.minzoom,16.4);
  assert.equal(fallback.filter[0],'all');
  assert.equal(fallback.filter[2][0],'within');
  assert.equal(layers.indexOf(fallback)<layers.findIndex(x=>x.id==='dj-transport-bus-pictogram'),true);
  assert.equal(suppressNativeBusStopGlyphs(map),1,'only the native POI icon should be suppressed');
  assert.equal(paint.length,2);
  assert.ok(paint.every(([id])=>id==='poi_transit'));
});

test('native icons stay visible if there is no viable tile-based replacement',()=>{
  const map={getStyle:()=>({layers:[]}),getLayer:()=>undefined,hasImage:()=>false,addLayer:()=>{throw Error('unexpected')}};
  assert.equal(installBasemapBusStopFallback(map),false);
  const code=readFileSync(new URL('../src/transport-map.js',import.meta.url),'utf8');
  assert.match(code,/suppressNativeBusStopGlyphs\(map\)/);
});

test('base layer visibility toggles tile fallback with all other bus markers',()=>{
  assert.ok(BASE_LAYER_IDS.bus.includes('dj-basemap-bus-pictogram'));
  const layout=[];
  const map={getLayer:id=>id==='dj-basemap-bus-pictogram'?{id}:undefined,
    getLayoutProperty:()=>undefined,setLayoutProperty:(...a)=>layout.push(a)};
  applyBaseLayerVisibility(map,{bus:false});
  assert.ok(layout.some(a=>a[0]==='dj-basemap-bus-pictogram'&&a[2]==='none'));
});

test('missing AI binding gets specific dashboard remedy and not a fake model response',async()=>{
  const result=await (await onRequestGet({env:{}})).json();
  assert.equal(result.enabled,false);assert.equal(result.bindingPresent,false);
  const req=new Request('https://dongjak-walk-safety-preview.pages.dev/api/place-insight',{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({name:'동작도서관',type:'공공기관',lat:37.5,lng:126.94})});
  const res=await onRequestPost({request:req,env:{}});const body=await res.json();
  assert.equal(res.status,503);assert.equal(body.code,'missing_ai_binding');
  assert.match(body.message,/Production.*Workers AI.*AI/);
});
