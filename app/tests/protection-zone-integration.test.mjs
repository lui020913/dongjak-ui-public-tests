import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {installProtectionZoneMap} from '../src/protection-zone-map.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dataPath=n=>path.join(root,'public','data','protection-zone',n);
const readJson=async n=>JSON.parse(await readFile(dataPath(n),'utf8'));
test('GIS data structures and 10th-analysis labels are intact',async()=>{
 const [zone,road,hot,facility,radii,boundary]=await Promise.all([
  'zones.geojson','candidates.geojson','accident_hotspots.geojson','facilities.geojson',
  'distance_rings_reference.geojson','boundary_reference.geojson'].map(readJson));
 assert.equal(zone.features.length,9);
 assert.equal(zone.features.filter(f=>f.properties.facility_type==='어린이').length,7);
 assert.equal(zone.features.filter(f=>f.properties.facility_type==='노인').length,2);
 assert.equal(road.features.length,125);
 assert.equal(road.features.filter(f=>f.properties.evidence_tier==='A').length,2);
 assert.equal(hot.features.length,9);
 assert.equal(facility.features.length,9);
 assert.equal(radii.features.length,18);
 assert.equal(boundary.features.length,1);
 for(const f of road.features){assert.ok(f.properties.road_id);assert.ok(['A','B','C','D','E'].includes(f.properties.evidence_tier));}
 for(const f of radii.features)assert.ok([300,500].includes(f.properties.radius_m));
});
test('safety menu hook and feature activation toggles map layers',async()=>{
 const html=await readFile(path.join(root,'index.html'),'utf8');
 const main=await readFile(path.join(root,'src','main.js'),'utf8');
 assert.match(html,/id="protection-zone-controls"/);
 assert.match(main,/installProtectionZoneMap\(\{map,maplibregl,app,nightMode\}\)/);
 const controls={};
 function element(id,checked=false){return controls[id]={id,checked,disabled:false,textContent:'',attributes:{},events:{},setAttribute(key,val){this.attributes[key]=val;},addEventListener(name,fn){this.events[name]=fn;}};}
 for(const id of ['protection-zone-controls','protection-zone-toggle','protection-zone-status',
  'protection-zone-zoom','protection-zone-focus54','protection-zone-focus62',
  'protection-zone-mode-simple','protection-zone-mode-detail','pza-advanced-tools','pza-mode-guide'])element(id);
 for(const key of ['child','senior','candidates','accidents','radii','schoolgap','catchments'])element(`protection-zone-${key}`,['child','senior'].includes(key));
 globalThis.document={getElementById:id=>controls[id]||null};
 globalThis.fetch=async url=>({ok:true,json:async()=>readJson(String(url).split('/').pop())});
 const sources=new Map(),layers=new Map(),events={};let lastZoom=null;
 const map={
  isStyleLoaded:()=>true,
  getStyle:()=>({layers:[{id:'label',type:'symbol'}]}),
  getSource:id=>sources.get(id),getLayer:id=>layers.get(id),
  addSource:(id,src)=>sources.set(id,src),addLayer:(layer,before)=>{assert.equal(before,undefined);layers.set(layer.id,{...layer,layout:{visibility:'visible'}});},
  setLayoutProperty:(id,k,v)=>{layers.get(id).layout[k]=v;},
  on:(name,layer,cb)=>{const fn=typeof layer==='function'?layer:cb;(events[name]??=[]).push(fn);},
  flyTo:config=>{lastZoom=config;},fitBounds:config=>{lastZoom=config;},
  getCanvas:()=>({style:{}})
 };
 class Popup{setLngLat(){return this;}setHTML(){return this;}addTo(){return this;}}
 const ui=installProtectionZoneMap({map,maplibregl:{Popup},app:{dataset:{tab:'map'},classList:{contains:()=>false}}});
 assert.equal(ui.isActive(),false);
 await ui.enable();
 assert.equal(ui.isActive(),true);
 assert.equal(sources.size,9);
 assert.equal(layers.get('pza-child-fill').layout.visibility,'visible');
 assert.equal(layers.get('pza-child-point').layout.visibility,'none');
 assert.equal(layers.get('pza-senior-fill').layout.visibility,'visible');
 assert.equal(layers.get('pza-candidates-line').layout.visibility,'none');
 assert.equal(layers.get('pza-focus-line').layout.visibility,'visible');
 assert.equal(layers.get('pza-focus-halo').layout.visibility,'visible');
 assert.equal(layers.get('pza-radius-300').layout.visibility,'none');
 assert.equal(layers.get('pza-school-gap-300').layout.visibility,'none');
 assert.equal(layers.get('pza-catchment-fill').layout.visibility,'none');
 assert.equal(ui.getMode(),'simple');
 controls['protection-zone-mode-detail'].events.click();
 assert.equal(ui.getMode(),'detail');
 assert.equal(controls['pza-advanced-tools'].hidden,false);
 controls['protection-zone-candidates'].checked=true;
 controls['protection-zone-candidates'].events.change();
 assert.equal(layers.get('pza-candidates-line').layout.visibility,'visible');
 controls['protection-zone-schoolgap'].checked=true;
 controls['protection-zone-schoolgap'].events.change();
 assert.equal(layers.get('pza-school-gap-300').layout.visibility,'visible');
 controls['protection-zone-catchments'].checked=true;
 controls['protection-zone-catchments'].events.change();
 assert.equal(layers.get('pza-catchment-fill').layout.visibility,'visible');
 assert.equal(layers.get('pza-focus-line').layout.visibility,'visible');
 controls['protection-zone-mode-simple'].events.click();
 assert.equal(layers.get('pza-candidates-line').layout.visibility,'none');
 assert.equal(layers.get('pza-focus-line').layout.visibility,'visible');
 assert.equal(controls['pza-advanced-tools'].hidden,true);
 assert.equal(layers.get('pza-school-gap-300').layout.visibility,'none');
 assert.equal(layers.get('pza-catchment-fill').layout.visibility,'none');
 controls['protection-zone-focus54'].events.click();
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(lastZoom.zoom,16.8);
 ui.disable();
 assert.equal(layers.get('pza-child-fill').layout.visibility,'none');
});
