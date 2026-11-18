import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  minimumZoomForBounds,responsiveMetroCutoff,metroVisibleAtZoom,
  installResponsiveMetroVisibility,METRO_OVERVIEW_LAYERS
} from '../src/metro-overview-visibility.js';
import {markerBoxHidden} from '../src/map-marker-occlusion.js';
import {bufferedDistrictBounds} from '../src/map-scope.js';
import {fallbackBoundary} from '../src/fixed-rail-data.js';
const source=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const bounds=bufferedDistrictBounds(fallbackBoundary.features[0].geometry);

test('desktop effective maximum zoom-out differs from phone due to geographic maxBounds',()=>{
  const phone=minimumZoomForBounds(bounds,390,840);
  const desktop=minimumZoomForBounds(bounds,1440,850);
  assert.ok(phone<desktop);
  assert.ok(responsiveMetroCutoff({bounds,width:1440,height:850})>12.2);
  assert.equal(metroVisibleAtZoom({zoom:desktop,bounds,width:1440,height:850}),false);
  assert.equal(metroVisibleAtZoom({zoom:phone,bounds,width:390,height:840}),false);
  assert.equal(metroVisibleAtZoom({zoom:13,bounds,width:1440,height:850}),true);
  assert.equal(metroVisibleAtZoom({zoom:13,bounds,width:390,height:840}),true);
});

test('zoom policy hides *all* custom rail lines and route badges, respects a manually disabled metro layer',()=>{
  const listeners=new Map();
  const vis=new Map(METRO_OVERVIEW_LAYERS.map(id=>[id,'visible']));
  const app={dataset:{baseMetro:'on'}};
  let zoom=12.10;
  const map={
    getZoom:()=>zoom,
    getMaxBounds:()=>bounds,
    getContainer:()=>({clientWidth:1440,clientHeight:850}),
    getLayer:id=>vis.has(id)?{}:null,
    getLayoutProperty:(id)=>vis.get(id),
    setLayoutProperty:(id,key,value)=>{assert.equal(key,'visibility');vis.set(id,value);},
    on:(event,cb)=>listeners.set(event,cb),
    off:(event)=>listeners.delete(event)
  };
  const dispose=installResponsiveMetroVisibility({map,app});
  assert.ok([...vis.values()].every(v=>v==='none'));
  zoom=13.2;listeners.get('zoom')();
  assert.ok([...vis.values()].every(v=>v==='visible'));
  app.dataset.baseMetro='off';listeners.get('zoom')();
  assert.ok([...vis.values()].every(v=>v==='none'));
  dispose();
});

test('logo body never leaks onto the edge; legitimate in-map logos remain',()=>{
  assert.equal(markerBoxHidden({x:4,y:150,width:390,height:840,boxWidth:48,boxHeight:48,margin:38}),true);
  assert.equal(markerBoxHidden({x:74,y:150,width:390,height:840,boxWidth:44,boxHeight:44,margin:38}),false);
});

test('mobile sheet has no artificial floating gap above its bottom tab bar',()=>{
  const core=source('src/layout-core.css');
  assert.match(core,/bottom:var\(--dj-mobile-nav-h\)!important/);
  assert.doesNotMatch(core,/bottom:calc\(var\(--dj-mobile-nav-h\) \+ 6px\)!important/);
});

test('unified marker layers keep viewport edge checks up-to-date',()=>{
  for(const file of ['src/education-layer.js','src/landmark-layer.js']){
    const src=source(file);
    assert.match(src,/el\.style\.visibility='hidden'/);
    assert.match(src,/map\.on\('move',onMove\)/);
    assert.match(src,/map\.on\('idle',syncZoom\)/);
  }
});
