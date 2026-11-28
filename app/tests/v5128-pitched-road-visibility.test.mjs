import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildingPlanVisibility,buildingFootprintPaint,buildingFootprintOutlinePaint} from '../src/map-appearance.js';
import {analyzeOcclusion,occlusionLineFeatures} from '../src/night-occlusion.js';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('light overhead remains opaque, dark footprints translucent; GIS plan switches by extrusion eligibility',()=>{
  assert.equal(buildingPlanVisibility(0),1);
  assert.equal(buildingPlanVisibility(3),1);
  assert.ok(buildingPlanVisibility(12)<0.26);
  assert.equal(buildingPlanVisibility(19),0);
  assert.equal(buildingPlanVisibility(45),0);
  for(const theme of ['light','dark']){
    assert.equal(buildingFootprintPaint(theme,0)['fill-opacity'],theme==='dark'?0.74:1);
    assert.equal(buildingFootprintPaint(theme,35)['fill-opacity'],0);
    assert.equal(buildingFootprintOutlinePaint(theme,35)['line-opacity'],0);
  }
  const main=read('src/main.js');
  assert.match(main,/const fillVisible=visibleBuilding2D\(\) && !show/);
  assert.match(main,/buildingModeVisibility\(show\)/);
  assert.doesNotMatch(main,/movementIsSlow/);
  assert.match(main,/nextBuildingPitchMode\(buildingPitchActive,pitch,PITCH_BUILDING_START,PITCH_BUILDING_EXIT\)/);
  assert.doesNotMatch(main,/promoteNightAnalysisLayers\(map\)/);
});

test('offline road dataset supplies clear, obstructed, and out-of-range segments',()=>{
  const roads=JSON.parse(read('public/data/sangdo1-night/occlusion-road-samples.json'));
  const segments=occlusionLineFeatures(analyzeOcclusion(roads.lines,20,5).segments).features;
  const counts=segments.reduce((acc,f)=>(acc[f.properties.category]=(acc[f.properties.category]||0)+1,acc),{});
  assert.ok(counts.clear>50);
  assert.ok(counts.outside>100);
  assert.ok(counts.blocked>0);
  assert.ok(segments.some(f=>f.properties.kind==='path'));
  assert.ok(segments.some(f=>f.properties.kind==='alley'));
});

test('the startup screen omits duplicate eyebrow',()=>{
  const html=read('index.html');
  assert.doesNotMatch(html,/<div class="map-startup-eyebrow">동작구 보행안전 지도<\/div>/);
});
