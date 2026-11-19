import test from 'node:test';
import assert from 'node:assert/strict';
import {buildingVisualPalette,buildingFootprintPaint,buildingExtrusionAppearance,BUILDING_VISUAL_PALETTE,MOBILE_DARK_BUILDING_PALETTE} from '../src/map-appearance.js';

test('Phone dark buildings use a stronger opaque surface while preserving the common palette',()=>{
 assert.equal(buildingVisualPalette('dark',false),BUILDING_VISUAL_PALETTE.dark);
 assert.equal(buildingVisualPalette('dark',true),MOBILE_DARK_BUILDING_PALETTE);
 assert.equal(buildingVisualPalette('light',true),BUILDING_VISUAL_PALETTE.light);
 const previous=globalThis.window;
 try{
  globalThis.window={matchMedia:()=>({matches:true})};
  assert.deepEqual(buildingFootprintPaint('dark',0),{'fill-color':'#30383d','fill-opacity':1,'fill-antialias':false});
  assert.equal(buildingFootprintPaint('dark',55)['fill-opacity'],0);
  assert.equal(buildingExtrusionAppearance('dark',10).opacity,0.98);
  assert.equal(buildingExtrusionAppearance('dark',30).opacity,0.96);
 }finally{if(previous===undefined)delete globalThis.window;else globalThis.window=previous;}
});

test('Safety night consent extends the existing shortcut without replacing its capture lifecycle',async()=>{
 const {readFileSync}=await import('node:fs');
 const src=readFileSync(new URL('../src/v831-swipe-feature-toolbar.js',import.meta.url),'utf8');
 assert.match(src,/scroller\.addEventListener\('click',requestNight,true\)/);
 assert.match(src,/doc\.addEventListener\('click',requestSafetyNight,true\)/);
 assert.match(src,/doc\.removeEventListener\('click',requestSafetyNight,true\)/);
 assert.match(src,/function requestSafetyNight\(e\)\{[\s\S]*?closest\?\.\('#night-visibility-toggle'\)[\s\S]*?requestNight\(e\);/);
});
