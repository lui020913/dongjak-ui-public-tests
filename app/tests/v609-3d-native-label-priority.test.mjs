import {APP_VERSION} from '../src/app-version.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  promoteReadable3DLabelLayers,installReadable3DLabels,FRONT_LABEL_ORDER
} from '../src/readable-3d-labels.js';

function makeMap(){
  const layers=[
    {id:'basemap-road',type:'line',layout:{}},
    {id:'base-poi',type:'symbol',layout:{'text-field':'name'}},
    {id:'dongjak-admin-dong-labels',type:'symbol',layout:{'text-field':['get','dong_name']}},
    {id:'dj-hangang-bridge-geometry-labels',type:'symbol',layout:{'text-field':'name'}},
    {id:'dj-hangang-bridge-osm-labels',type:'symbol',layout:{'text-field':'name'}},
    // Delayed building sheets and a delayed bus stop layer arrive after other labels.
    {id:'dongjak-buildings-3d-42',type:'fill-extrusion',layout:{}},
    {id:'dongjak-featured-place-names',type:'symbol',layout:{'text-field':['get','name']}},
    {id:'dongjak-featured-place-logos',type:'symbol',layout:{'icon-image':['get','logo']}},
    {id:'dongjak-zoom-busstop-names',type:'symbol',layout:{'text-field':['get','name']}}
  ];
  const events=new Map();let moves=0;
  const map={
    getStyle:()=>({layers}),getPitch:()=>46,
    getLayoutProperty:(id,key)=>layers.find(layer=>layer.id===id)?.layout?.[key],
    setLayoutProperty:(id,key,value)=>{layers.find(l=>l.id===id).layout[key]=value;},
    moveLayer:(id,before)=>{
      const from=layers.findIndex(x=>x.id===id);
      if(from<0)throw new Error('missing layer: '+id);
      const [layer]=layers.splice(from,1);
      const pos=before?layers.findIndex(x=>x.id===before):-1;
      if(before&&pos<0)throw new Error('missing target: '+before);
      layers.splice(pos>=0?pos:layers.length,0,layer);
      moves++;
    },
    on:(event,cb)=>events.set(event,cb),off:(event)=>events.delete(event)
  };
  return {map,layers,events,get moves(){return moves;}};
}

test('3D building sheets stay below native point labels, prioritised names above them',()=>{
  const f=makeMap();
  assert.equal(promoteReadable3DLabelLayers(f.map),true);
  const ids=f.layers.map(layer=>layer.id);
  assert.ok(ids.indexOf('dongjak-buildings-3d-42')<ids.indexOf('base-poi'));
  assert.ok(ids.indexOf('dongjak-admin-dong-labels')>ids.indexOf('dongjak-buildings-3d-42'));
  assert.ok(ids.indexOf('dongjak-featured-place-logos')<ids.indexOf('dongjak-featured-place-names'));
  assert.ok(ids.indexOf('dj-hangang-bridge-geometry-labels')>ids.indexOf('dongjak-featured-place-names'));
  assert.ok(FRONT_LABEL_ORDER.includes('dongjak-admin-dong-labels'));
  const count=f.moves;
  assert.equal(promoteReadable3DLabelLayers(f.map),false,'stable order must not redraw forever');
  assert.equal(f.moves,count);
});

test('3D label manager keeps facility names and logos at ground height (v6.0.11 fix)',()=>{
  const f=makeMap();
  const cleanup=installReadable3DLabels({map:f.map});
  assert.equal(f.layers.find(x=>x.id==='dongjak-admin-dong-labels').layout['symbol-height-offset'],0);
  assert.equal(f.layers.find(x=>x.id==='dongjak-featured-place-names').layout['symbol-height-offset'],0);
  assert.equal(f.layers.find(x=>x.id==='dongjak-featured-place-logos').layout['symbol-height-offset'],0);
  assert.equal(f.layers.find(x=>x.id==='dongjak-buildings-3d-42').layout['symbol-height-offset'],undefined);
  assert.ok(f.events.has('styledata')&&f.events.has('idle'));
  cleanup();assert.equal(f.events.size,0);
});

test('3D text remains in MapLibre, with no separate animated DOM labels',()=>{
  const source=readFileSync(new URL('../src/readable-3d-labels.js',import.meta.url),'utf8');
  assert.doesNotMatch(source,/createElement|requestAnimationFrame\(.*project\(/s);
  const packageJson=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
  assert.equal(packageJson.version,APP_VERSION);
});

test('a partially loaded bridge pair never creates competing reorder loops',()=>{
  const f=makeMap();
  f.layers.splice(f.layers.findIndex(x=>x.id==='dj-hangang-bridge-osm-labels'),1);
  assert.equal(promoteReadable3DLabelLayers(f.map),true);
  const first=f.moves;
  assert.equal(promoteReadable3DLabelLayers(f.map),false);
  assert.equal(f.moves,first);
});

test('metro exits, facilities, close bus stops and bridge labels converge on one order without reentrant redraw',()=>{
 const f=makeMap();
 for(const id of ['metro-access-exits','metro-access-exit-labels','metro-access-elevator','metro-access-escalator','metro-access-stairs','transport-bus-names-close'])f.layers.push({id,type:'symbol',layout:{}});
 const original=f.map.moveLayer;
 let reentrant=0;
 f.map.moveLayer=(...args)=>{original(...args);assert.equal(promoteReadable3DLabelLayers(f.map),false);reentrant++;};
 assert.equal(promoteReadable3DLabelLayers(f.map),true);
 assert.ok(reentrant>0);
 const ids=f.layers.map(l=>l.id);
 assert.ok(ids.indexOf('metro-access-exits')>ids.indexOf('dongjak-featured-place-names'));
 assert.ok(ids.indexOf('metro-access-exit-labels')<ids.indexOf('dj-hangang-bridge-geometry-labels'));
 const count=f.moves;
 for(let i=0;i<20;i++)assert.equal(promoteReadable3DLabelLayers(f.map),false);
 assert.equal(f.moves,count);
 for(const path of ['featured-place-labels.js','station-accessibility.js','hangang-bridge-labels.js']){
  const code=readFileSync(new URL('../src/'+path,import.meta.url),'utf8');
  assert.match(code,/promoteReadable3DLabelLayers\(map\)/);
  assert.doesNotMatch(code,/map\.moveLayer\(/);
 }
});

test('no label layout or layer moves during an active gesture, exactly one settled update',()=>{
 const f=makeMap();let moving=true,writes=0;f.map.isMoving=()=>moving;
 const set=f.map.setLayoutProperty;f.map.setLayoutProperty=(...args)=>{writes++;set(...args);};
 const dispose=installReadable3DLabels({map:f.map});
 for(let i=0;i<50;i++){f.events.get('styledata')();f.events.get('idle')();assert.equal(promoteReadable3DLabelLayers(f.map),false);}
 assert.equal(writes,0);assert.equal(f.moves,0);
 moving=false;f.events.get('moveend')();assert.ok(writes>0);const count=writes,moves=f.moves;
 for(let i=0;i<50;i++){f.events.get('styledata')();f.events.get('idle')();}
 assert.equal(writes,count);assert.equal(f.moves,moves);dispose();
});
