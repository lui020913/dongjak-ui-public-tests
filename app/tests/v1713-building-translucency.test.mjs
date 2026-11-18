import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const root=new URL('../',import.meta.url);
test('건물 3D는 테마별 불투명도·색상 규칙을 공유하고 새 타일도 반영',async()=>{
  const src=await readFile(new URL('src/main.js',root),'utf8');
  const ui=await readFile(new URL('src/ui-environment.js',root),'utf8');
  assert.match(src,/nightOcclusionBuildingPaint\(\s*buildingExtrusionAppearance\(theme,pitch,PITCH_BUILDING_START,PITCH_BUILDING_FULL\)/);
  assert.match(src,/nightOcclusionBuildingPaint\(\s*buildingExtrusionAppearance\(visualTheme\.currentTheme\(\),map\.getPitch\(\)\)/);
  assert.match(src,/loadBuildingTileFeatures\(sheet\)/);
  assert.match(ui,/buildingExtrusionAppearance\(themeState\.value,map\.getPitch/);
  assert.match(ui,/buildingFootprintPaint\(themeState\.value,map\.getPitch/);
});
test('복구된 보완 건물 8개가 manifest에서 유지',async()=>{
  const manifest=JSON.parse(await readFile(new URL('public/buildings/manifest.json',root),'utf8'));
  assert.equal(manifest.sheets.length,8);
  assert.ok(manifest.sheets.every(x=>String(x.supplement||'').endsWith(`supplement_${x.sheet}.geojson`)));
});
