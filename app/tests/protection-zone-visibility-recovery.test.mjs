import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {installProtectionZoneMap} from '../src/protection-zone-map.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=n=>JSON.parse(fs.readFileSync(path.join(root,'public/data/protection-zone',n),'utf8'));
function setup(){
  const elements=new Map();
  function element(id,checked=false){
    const item={id,checked,hidden:false,disabled:false,style:{},textContent:'',innerHTML:'',events:{},
      elements:{namedItem:()=>null},classList:{add(){},remove(){}},
      setAttribute(){},querySelector:()=>null,addEventListener(n,fn){this.events[n]=fn}};
    elements.set(id,item);return item;
  }
  for(const id of ['protection-zone-controls','protection-zone-toggle','protection-zone-status',
   'protection-zone-zoom','protection-zone-focus54','protection-zone-focus62','protection-zone-mode-simple',
   'protection-zone-mode-detail','pza-advanced-tools','pza-mode-guide','pza-road-sheet',
   'pza-fieldwork-form','pza-road-guidance','pza-road-verification','pza-fieldwork-count'])element(id);
  for(const key of ['child','senior','candidates','accidents','radii','schoolgap','catchments'])element(`protection-zone-${key}`,key==='child'||key==='senior');
  const events={};const sources=new Map();let layers=[];let ready=false;
  const map={
    isStyleLoaded:()=>ready, getStyle:()=>({layers,glyphs:'https://example.com/{fontstack}/{range}.pbf'}),
    getLayer:id=>layers.find(l=>l.id===id),getSource:id=>sources.get(id),
    addSource:(id,source)=>sources.set(id,source),
    addLayer:(def,before)=>{
      const idx=before?layers.findIndex(l=>l.id===before):-1;
      const layer={...def,layout:{...def.layout,visibility:'visible'}};
      if(idx<0)layers.push(layer);else layers.splice(idx,0,layer);
    },
    moveLayer:(id,before)=>{
      const i=layers.findIndex(l=>l.id===id);const [layer]=layers.splice(i,1);
      const j=before?layers.findIndex(l=>l.id===before):-1;
      if(j<0)layers.push(layer);else layers.splice(j,0,layer);
    },
    setLayoutProperty:(id,key,val)=>{map.getLayer(id).layout[key]=val},
    on:(name,layer,cb)=>{const fn=typeof layer==='function'?layer:cb;(events[name]??=[]).push(fn)},
    fitBounds:()=>{},flyTo:()=>{},getCanvas:()=>({style:{}}),
    fire:name=>{for(const fn of events[name]||[])fn()}
  };
  layers=[{id:'road',type:'line'},{id:'labels',type:'symbol'},
    {id:'district-exterior-fade',type:'fill'},{id:'buildings-3d',type:'fill-extrusion'},
    {id:'transport-bus-stop',type:'circle'}];
  return {map,elements,sources,setReady:v=>{ready=v},layers:()=>layers};
}
test('overlay automatically recovers from temporarily unloaded style, after buildings and before transit',async()=>{
 const state=setup();const oldDocument=globalThis.document,oldFetch=globalThis.fetch;
 globalThis.document={getElementById:id=>state.elements.get(id)||null,querySelector:()=>null};
 globalThis.fetch=async url=>({ok:true,json:async()=>read(String(url).split('/').pop())});
 try{
  state.setReady(true);
  const ui=installProtectionZoneMap({map:state.map,maplibregl:{Popup:class{}},app:{dataset:{tab:'map'},classList:{contains:()=>false}}});
  state.setReady(false); // style becomes busy between user interaction and overlay insertion
  // enable waits for style.load, which can fire while subsequent sources are still busy.
  const pending=ui.enable();
  state.setReady(true);
  state.map.fire('style.load');
  await pending;
  assert.equal(ui.isActive(),true);
  assert.equal(state.sources.size,9);
  assert.ok(state.map.getLayer('pza-focus-marker'));
  assert.ok(state.map.getLayer('pza-school-gap-300'));
  assert.ok(state.map.getLayer('pza-catchment-outline'));
  assert.equal(state.map.getLayer('pza-catchment-fill').layout.visibility,'none');
  const ids=state.layers().map(x=>x.id);
  assert.ok(ids.indexOf('pza-focus-line')>ids.indexOf('buildings-3d'));
  assert.ok(ids.indexOf('pza-focus-line')<ids.indexOf('transport-bus-stop'));
  assert.equal(state.map.getLayer('pza-focus-line').layout.visibility,'visible');
  // Test restoration after style rebuild removes research sources/layers.
  state.layers().splice(0,state.layers().length,...state.layers().filter(x=>!x.id.startsWith('pza-')));
  state.sources.clear();
  state.setReady(false);state.map.fire('idle');
  assert.equal(state.map.getLayer('pza-focus-marker'),undefined);
  state.setReady(true);state.map.fire('idle');
  assert.ok(state.map.getLayer('pza-focus-marker'));
  assert.ok(state.map.getLayer('pza-school-gap-300'));
  assert.ok(state.map.getLayer('pza-catchment-outline'));
  assert.equal(state.map.getLayer('pza-catchment-fill').layout.visibility,'none');
  assert.equal(state.map.getLayer('pza-focus-line').layout.visibility,'visible');
 }finally{globalThis.document=oldDocument;globalThis.fetch=oldFetch}
});
