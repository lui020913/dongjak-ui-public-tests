import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildingFootprintPaint,BUILDING_VISUAL_PALETTE,installBaseBuildingPalette} from '../src/map-appearance.js';
import {onRequest} from '../functions/api/transport/[[path]].js';
const read=p=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');

test('v5.12.4: overhead footprints remain visible and fade substantially at high pitch in both themes',()=>{
  for(const theme of ['dark','light']){
    const top=buildingFootprintPaint(theme,0);
    const middle=buildingFootprintPaint(theme,10);
    const tilted=buildingFootprintPaint(theme,55);
    assert.ok(top['fill-opacity']>=.7);
    assert.ok(tilted['fill-opacity']<=.15);
    assert.ok(top['fill-opacity']>middle['fill-opacity'] && middle['fill-opacity']>tilted['fill-opacity']);
    assert.equal(top['fill-color'],tilted['fill-color']);
  }
  assert.notEqual(BUILDING_VISUAL_PALETTE.dark.footprint,BUILDING_VISUAL_PALETTE.light.footprint);
});

test('v5.12.4: base map only changes building footprints when map pitch changes',()=>{
  const changed=[];const handlers={};let pitch=0;
  const map={getPitch:()=>pitch,getStyle:()=>({layers:[{type:'fill',id:'building'},{type:'fill',id:'dj-night-reach-fill'},{type:'line',id:'street'}]}),
    getLayer:id=>({id}),setPaintProperty:(...args)=>changed.push(args),on:(name,fn)=>{handlers[name]=fn;}};
  const previous=globalThis.document;
  globalThis.document={getElementById:()=>null};
  try{
    installBaseBuildingPalette({map,app:{dataset:{theme:'dark'}}});
    pitch=55;handlers.pitch();
  } finally{globalThis.document=previous;}
  assert.equal(changed.length,6);
  assert.ok(changed.every(x=>x[0]==='building'));
  assert.deepEqual(changed[4][2],['interpolate',['linear'],['zoom'],13,0,15,0]);
  assert.deepEqual(changed[5],['building','fill-antialias',false]);
});

test('v5.12.4: night panel and options use shared theme colors and version menu button is absent',()=>{
  const css=read('src/night-visibility-panel.css');
  const options=read('src/layout-core.css');
  const html=read('index.html');
  assert.match(css,/#night-visibility-float\s*\{[^}]*var\(--dj-ui-bg/s);
  assert.match(options,/\.map-advanced-controls #map-status/);
  assert.doesNotMatch(html,/id="version-history-menu"/);
  assert.match(html,/id="version-history-trigger"/);
});

test('v5.12.4: deployed bus stop auth failure returns a short, key-free diagnostic',async()=>{
  const original=globalThis.fetch;
  globalThis.fetch=async()=>new Response('Forbidden',{status:401});
  try{
    const response=await onRequest({request:new Request('https://test.pages.dev/api/transport/bus/stops-nearby?lat=37.501&lng=126.953'),env:{SEOUL_BUS_SERVICE_KEY:'DONT_EXPOSE_ME'}});
    assert.equal(response.status,503);
    const body=await response.json();
    assert.equal(body.code,'BUS_API_AUTH');
    assert.ok(!JSON.stringify(body).includes('DONT_EXPOSE_ME'));
  }finally{globalThis.fetch=original;}
});
