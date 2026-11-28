import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {installImportantPlaceClick} from '../src/important-place-click.js';

const load=name=>readFileSync(new URL(`../src/${name}`,import.meta.url),'utf8');

test('legacy night mode cannot restore the removed public protection overlay',()=>{
  const code=load('main.js');
  assert.doesNotMatch(code,/installNightVisibility/);
  assert.doesNotMatch(code,/protectionOverlay\?\.disable/);
  assert.doesNotMatch(code,/installProtectionZoneMap\(/);
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
