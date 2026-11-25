import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {nightFeatureVisible} from '../src/night-visibility-map.js';
import {installImportantPlaceClick} from '../src/important-place-click.js';

const load=name=>readFileSync(new URL(`../src/${name}`,import.meta.url),'utf8');

test('legacy night mode cannot restore the removed public protection overlay',()=>{
  const code=load('main.js');
  assert.match(code,/installNightVisibility\(\{map,maplibregl,app,toast,theme:visualTheme\}\)/);
  assert.doesNotMatch(code,/protectionOverlay\?\.disable/);
  assert.doesNotMatch(code,/installProtectionZoneMap\(/);
  const night=load('night-visibility-map.js');
  assert.match(night,/if\(next\)await onActivate\(\)/);
  assert.match(night,/enable:\(\)=>setMode\(true\)/);
});

test('close night views retain lamps and reach zones at any camera angle; far views show only roads',()=>{
  assert.equal(nightFeatureVisible('dj-night-light-point',17.2,true,0),true);
  assert.equal(nightFeatureVisible('dj-night-light-point',15.5,true,0),false);
  assert.equal(nightFeatureVisible('dj-night-light-point',17.2,true,59),true);
  assert.equal(nightFeatureVisible('dj-night-reach-fill',17.2,true,59),true);
  assert.equal(nightFeatureVisible('dj-night-reach-fill',16,true,15),true);
  assert.equal(nightFeatureVisible('dj-night-occ-clear',12.8,true,59),true);
  assert.equal(nightFeatureVisible('dj-night-light-point',18,false,0),false);
  assert.match(load('night-visibility-map.js'),/nativeRoads\.isActive\(\)!==lastNativeActive/);
});

test('clicking landmark circular logo does not open a second global-place popup',()=>{
  let mapClick=null;
  const map={
    on:(name,fn)=>{if(name==='click')mapClick=fn;},
    off:()=>{},
    queryRenderedFeatures:()=>[{layer:{id:'dongjak-featured-place-logos'},properties:{name:'동작구청'}}],
    getZoom:()=>16,project:()=>({x:100,y:100})
  };
  const cleanup=installImportantPlaceClick({map,maplibregl:{Popup(){throw Error('unexpected duplicate popup');}}});
  assert.equal(typeof mapClick,'function');
  assert.doesNotThrow(()=>mapClick({point:{x:100,y:100},lngLat:{lng:126.9402905,lat:37.5042528}}));
  cleanup();
});
