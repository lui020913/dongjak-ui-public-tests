import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createDataLayerFader} from '../src/map-layer-fade-v815.js';

const read = path => readFileSync(new URL('../'+path,import.meta.url),'utf8');
const delay = ms => new Promise(resolve=>setTimeout(resolve,ms));
function mockLayer(type='fill',opacity=0.56){
  const props={['fill-opacity']:opacity};
  const layout={visibility:'none'};
  return {props,layout,map:{
    getLayer:()=>({type,layout}),
    getPaintProperty:(_id,key)=>props[key],
    setPaintProperty:(_id,key,val)=>{props[key]=val;},
    setLayoutProperty:(_id,key,val)=>{layout[key]=val;}
  }};
}
test('v815: layer fades out before visibility becomes none and restores original alpha', async()=>{
  const {map,props,layout}=mockLayer();
  const fader=createDataLayerFader(map,{duration:22,reduceMotion:()=>false});
  fader.apply('road-fill',false);
  assert.equal(layout.visibility,'none');
  fader.apply('road-fill',true);
  assert.equal(layout.visibility,'visible');
  assert.equal(props['fill-opacity'],0);
  await delay(30);
  assert.equal(props['fill-opacity'],0.56);
  fader.apply('road-fill',false);
  assert.equal(layout.visibility,'visible');
  assert.equal(props['fill-opacity'],0);
  await delay(58);
  assert.equal(layout.visibility,'none');
  fader.apply('road-fill',true);
  assert.equal(layout.visibility,'visible');
  await delay(25);
  assert.equal(props['fill-opacity'],0.56);
});
test('v815: a rapid off-on never hides an active layer using a stale callback',async()=>{
  const {map,layout}=mockLayer();
  const fader=createDataLayerFader(map,{duration:24,reduceMotion:()=>false});
  fader.apply('layer',true);await delay(24);
  fader.apply('layer',false);await delay(4);
  fader.apply('layer',true);await delay(70);
  assert.equal(layout.visibility,'visible');
});
test('v815: reduced motion applies without delayed animation',()=>{
  const {map,layout,props}=mockLayer();
  const fader=createDataLayerFader(map,{duration:240,reduceMotion:()=>true});
  fader.apply('layer',true);
  assert.equal(layout.visibility,'visible');
  assert.equal(props['fill-opacity'],0.56);
  fader.apply('layer',false);
  assert.equal(layout.visibility,'none');
});
test('v815: shared search and settings panels use the mobile-first surface system',()=>{
  const css=read('src/mobile-first-layout.css');
  const main=read('src/main.js');
  const html=read('index.html');
  assert.ok(css.includes('.topbar'));
  assert.ok(css.includes('#map-safety-controls'));
  assert.ok(css.includes('#map-advanced-controls'));
  assert.ok(css.includes('#bottom-nav:not([hidden])'));
  assert.equal(main.includes('v726-desktop-polish.css'),false);
  assert.equal(main.includes('v729-pc-consistency.css'),false);
  assert.equal(html.includes('v815-pc-visual-fixes.css'),false);
});
test('v815: road width and opt-in GeoJSON layers share controlled fade',()=>{
  assert.match(read('src/road-width-layer.js'),/layerFader\.apply\(id,shown\)/);
  assert.match(read('src/dongjak-verified-data-layers.js'),/layerFader\.apply\(id,enabled\.has\(name\)\)/);
});
