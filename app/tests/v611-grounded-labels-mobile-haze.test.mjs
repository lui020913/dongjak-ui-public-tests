import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {labelHeightAtPitch,installReadable3DLabels,promoteReadable3DLabelLayers} from '../src/readable-3d-labels.js';
const css=readFileSync(new URL('../src/v610-mobile-safety.css',import.meta.url),'utf8');

test('no ground label is floated tens of metres at any camera pitch',()=>{
  for(const pitch of [0,10,14,24,28,36,40,45,55,65,85]){
    assert.equal(labelHeightAtPitch(pitch),0,`pitch ${pitch} must anchor to ground`);
  }
  const layers=[
    {id:'basemap-place',type:'symbol',layout:{'text-field':['get','name'],'symbol-height-offset':95}},
    {id:'dongjak-buildings-3d-001',type:'fill-extrusion',layout:{}},
    {id:'dj-nearby-place-names',type:'symbol',layout:{'text-field':['get','name'],'symbol-height-offset':55}},
    {id:'dongjak-featured-place-logos',type:'symbol',layout:{'icon-image':['get','logo'],'symbol-height-offset':95}},
    {id:'dongjak-featured-place-names',type:'symbol',layout:{'text-field':['get','name'],'symbol-height-offset':95}}
  ];
  const events=new Map();
  const map={
    getPitch:()=>55,getStyle:()=>({layers}),
    getLayoutProperty:(id,key)=>layers.find(item=>item.id===id)?.layout[key],
    setLayoutProperty:(id,key,value)=>{layers.find(item=>item.id===id).layout[key]=value;},
    moveLayer:(id,before)=>{
      const i=layers.findIndex(item=>item.id===id);const [item]=layers.splice(i,1);
      const j=before?layers.findIndex(layer=>layer.id===before):layers.length;
      layers.splice(j,0,item);
    },
    on:(event,fn)=>events.set(event,fn),off:(event)=>events.delete(event)
  };
  const cleanup=installReadable3DLabels({map});
  assert.equal(layers.find(item=>item.id==='dj-nearby-place-names').layout['symbol-height-offset'],0);
  assert.equal(layers.find(item=>item.id==='dongjak-featured-place-names').layout['symbol-height-offset'],0);
  assert.equal(layers.find(item=>item.id==='dongjak-featured-place-logos').layout['symbol-height-offset'],0);
  assert.ok(layers.findIndex(item=>item.type==='fill-extrusion')<layers.findIndex(item=>item.id==='dj-nearby-place-names'));
  cleanup();
});

test('mobile horizon is subtle below header; no 58% screen-space blur on mobile',()=>{
  assert.match(css,/#app #map\.dj-far-haze-active::before\{/);
  assert.match(css,/top:var\(--dj-header-h,80px\)!important/);
  assert.match(css,/height:clamp\(60px,16dvh,160px\)!important/);
  assert.match(css,/rgba\(245,249,247,\.22\)/);
  assert.match(css,/-webkit-backdrop-filter:none!important/);
  assert.match(css,/-webkit-mask-image:none!important/);
  assert.match(css,/#app\[data-theme="dark"\] #map\.dj-far-haze-active::before/);
});
