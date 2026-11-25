import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FEATURED_LOGO_SCALE, FEATURED_PLACES_LOGOS, FEATURED_PLACES_LABELS,
  featuredLogoViewportMode, featuredLogoSizeExpression,
  installFeaturedPlaceLabels
} from '../src/featured-place-labels.js';

test('mobile portrait and landscape use compact logos; desktop is independently sized',()=>{
  assert.equal(featuredLogoViewportMode({width:390,coarsePointer:true}),'mobile');
  assert.equal(featuredLogoViewportMode({width:844,coarsePointer:true}),'mobile');
  assert.equal(featuredLogoViewportMode({width:1024,coarsePointer:true}),'mobile');
  assert.equal(featuredLogoViewportMode({width:1440,coarsePointer:false}),'desktop');
  assert.equal(featuredLogoViewportMode({width:1024,coarsePointer:false}),'desktop');
  assert.equal(featuredLogoViewportMode({width:600,coarsePointer:false}),'mobile');
  assert.ok(FEATURED_LOGO_SCALE.mobile.mid<FEATURED_LOGO_SCALE.desktop.mid);
  const compact=featuredLogoSizeExpression('mobile');
  const wide=featuredLogoSizeExpression('desktop');
  assert.deepEqual(compact.slice(0,4),['interpolate',['linear'],['zoom'],12.5]);
  assert.deepEqual(wide.slice(0,4),['interpolate',['linear'],['zoom'],12.5]);
  for(const i of [4,6,8])assert.ok(compact[i]<wide[i]);
});

test('native MapLibre official logo symbol updates on viewport/orientation resize and unregisters listeners',()=>{
  const previousWindow=globalThis.window;
  const previousImage=globalThis.Image;
  let width=390,coarse=true;
  const windowEvents=new Map();
  globalThis.window={
    get innerWidth(){return width;},
    matchMedia:()=>({get matches(){return coarse;}}),
    addEventListener:(name,fn)=>windowEvents.set(name,fn),
    removeEventListener:(name,fn)=>{if(windowEvents.get(name)===fn)windowEvents.delete(name);}
  };
  globalThis.Image=class{set src(_url){this.onload?.();}};
  const layers=new Map(), sources=new Map(), images=new Map(), callbacks=new Map();
  const updates=[];
  const map={
    addSource:(id,data)=>sources.set(id,data),getSource:id=>sources.get(id),
    addLayer:layer=>layers.set(layer.id,layer),getLayer:id=>layers.get(id),
    hasImage:id=>images.has(id),addImage:(id,data)=>images.set(id,data),
    setPaintProperty:()=>{},moveLayer:()=>{},
    setLayoutProperty:(id,name,value)=>{updates.push([id,name,value]);const layer=layers.get(id);layer.layout={...(layer.layout||{}),[name]:value};},
    getStyle:()=>({layers:[...layers.values()]}),
    on:(name,layerOrCb,cb)=>{callbacks.set(name,typeof cb==='function'?cb:layerOrCb);},
    off:(name)=>callbacks.delete(name)
  };
  try{
    const cleanup=installFeaturedPlaceLabels({map,app:{dataset:{theme:'dark'}}});
    const logo=layers.get(FEATURED_PLACES_LOGOS);
    assert.ok(logo,'official logos must remain on the map');
    assert.deepEqual(logo.layout['icon-size'],featuredLogoSizeExpression('mobile'));
    assert.deepEqual(layers.get(FEATURED_PLACES_LABELS).layout['text-radial-offset'],1.12);
    assert.equal(layers.get('dongjak-featured-place-dots').layout.visibility,'none');
    const before=updates.length;
    callbacks.get('resize')();
    assert.equal(updates.length,before,'unchanged viewport must not reset the symbols');
    width=844;
    callbacks.get('resize')();
    assert.equal(updates.length,before,'landscape phone should remain compact');
    width=1440;coarse=false;
    windowEvents.get('resize')();
    assert.deepEqual(logo.layout['icon-size'],featuredLogoSizeExpression('desktop'));
    assert.deepEqual(layers.get(FEATURED_PLACES_LABELS).layout['text-radial-offset'],1.35);
    assert.equal(layers.get(FEATURED_PLACES_LABELS).layout['text-field'][1],'name');
    cleanup();
    assert.equal(windowEvents.has('resize'),false);
    assert.equal(callbacks.has('resize'),false);
  }finally{
    if(previousWindow===undefined)delete globalThis.window;else globalThis.window=previousWindow;
    if(previousImage===undefined)delete globalThis.Image;else globalThis.Image=previousImage;
  }
});
