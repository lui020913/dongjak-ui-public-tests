import test from 'node:test';
import assert from 'node:assert/strict';
import {buildingFootprintPaint,buildingExtrusionAppearance,buildingZoomOpacityExpression,BUILDING_VISUAL_PALETTE,BUILDING_ZOOM_FADE_START,BUILDING_ZOOM_FADE_END} from '../src/map-appearance.js';

test('Approved light map keeps its original 3D building opacity and smooth zoom fade',()=>{
 assert.equal(BUILDING_VISUAL_PALETTE.light.footprint,'#fafafa');
 assert.equal(BUILDING_VISUAL_PALETTE.light.footprintOpacity,1);
 assert.equal(BUILDING_VISUAL_PALETTE.light.extrusion,'#f1f3f1');
 assert.deepEqual(buildingFootprintPaint('dark',0),{'fill-color':'#fafafa','fill-outline-color':'#e2e2e2','fill-opacity':1,'fill-antialias':true});
 assert.equal(buildingFootprintPaint('dark',55)['fill-opacity'],0);
 assert.equal(buildingExtrusionAppearance('dark',10).opacity,0.38);
 assert.equal(buildingExtrusionAppearance('dark',30).opacity,0.22);
 assert.equal(BUILDING_ZOOM_FADE_START,13);
 assert.equal(BUILDING_ZOOM_FADE_END,15);
 assert.deepEqual(buildingZoomOpacityExpression(.5),['interpolate',['linear'],['zoom'],13,0,15,.5]);
 assert.equal(BUILDING_VISUAL_PALETTE.light.footprintOpacity,1);
});

test('Retired night consent has no live toolbar capture handler',async()=>{
 const {readFileSync}=await import('node:fs');
 const src=readFileSync(new URL('../src/v831-swipe-feature-toolbar.js',import.meta.url),'utf8');
 assert.doesNotMatch(src,/requestNight|requestSafetyNight|buildNightConfirm/);
});
