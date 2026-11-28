import test from 'node:test';
import assert from 'node:assert/strict';
import {buildingFootprintPaint,buildingExtrusionAppearance,buildingZoomOpacityExpression,BUILDING_VISUAL_PALETTE,BUILDING_ZOOM_FADE_START,BUILDING_ZOOM_FADE_END} from '../src/map-appearance.js';

test('Approved charcoal map keeps opaque dark 3D buildings and smooth zoom fade',()=>{
 assert.equal(BUILDING_VISUAL_PALETTE.dark.footprint,'#444d56');
 assert.equal(BUILDING_VISUAL_PALETTE.dark.footprintOpacity,0.74);
 assert.equal(BUILDING_VISUAL_PALETTE.dark.extrusion,'#525d66');
 assert.deepEqual(buildingFootprintPaint('dark',0),{'fill-color':'#444d56','fill-opacity':0.74,'fill-antialias':false});
 assert.equal(buildingFootprintPaint('dark',55)['fill-opacity'],0);
 assert.equal(buildingExtrusionAppearance('dark',10).opacity,0.94);
 assert.equal(buildingExtrusionAppearance('dark',30).opacity,0.89);
 assert.equal(BUILDING_ZOOM_FADE_START,13);
 assert.equal(BUILDING_ZOOM_FADE_END,15);
 assert.deepEqual(buildingZoomOpacityExpression(.5),['interpolate',['linear'],['zoom'],13,0,15,.5]);
 assert.equal(BUILDING_VISUAL_PALETTE.light.footprintOpacity,1);
});

test('Safety night consent extends the existing shortcut without replacing its capture lifecycle',async()=>{
 const {readFileSync}=await import('node:fs');
 const src=readFileSync(new URL('../src/v831-swipe-feature-toolbar.js',import.meta.url),'utf8');
 assert.match(src,/scroller\.addEventListener\('click',requestNight,true\)/);
 assert.match(src,/doc\.addEventListener\('click',requestSafetyNight,true\)/);
 assert.match(src,/doc\.removeEventListener\('click',requestSafetyNight,true\)/);
 assert.match(src,/function requestSafetyNight\(e\)\{[\s\S]*?closest\?\.\('#night-visibility-toggle'\)[\s\S]*?requestNight\(e\);/);
});
