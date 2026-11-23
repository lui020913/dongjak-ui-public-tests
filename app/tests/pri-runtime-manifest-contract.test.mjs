import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {adaptLighting,parseImport,CURRENT_SIX_FACTORS,currentSixFactorCoverage,observedFactorScore} from '../src/pri-data.mjs';
const json=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
test('runtime PRI manifest has exactly one canonical source for each evidence factor',()=>{
 const manifest=json('../public/data/pri/manifest.json');
 assert.equal(manifest.bundle,'/data/pri/lighting_segments.json');
 assert.ok(Array.isArray(manifest.patches));
 assert.equal(new Set(manifest.patches).size,manifest.patches.length,'duplicate factor import may override observations');
 let bundle=adaptLighting(json('../public/data/pri/lighting_segments.json'));
 const factors=new Set(['lighting']);
 for(const patchPath of manifest.patches){
  assert.match(patchPath,/^\/data\/pri\/[a-zA-Z0-9_.-]+\.json$/);
  const source=json('../public'+patchPath);
  assert.ok(!factors.has(source.factor.id),'factor must be imported only once');
  factors.add(source.factor.id);
  bundle=parseImport(source,bundle);
 }
 assert.ok(CURRENT_SIX_FACTORS.every(f=>factors.has(f)||f==='speed'),
  'the speed factor is joined from an independent standard-node-link source');
 assert.equal(bundle.segments.length,1686);
 assert.ok(bundle.segments.every(s=>currentSixFactorCoverage(s)<=CURRENT_SIX_FACTORS.length));
 // A published rubric without scored roads must remain missing; do not invent zero risk.
 for(const f of ['crossing','sharedRoad']){
  const patch=json('../public/data/pri/'+(f==='crossing'?'sangdo1_crosswalk_rubric_factor.json':'sangdo1_shared_road_rubric_factor.json'));
  if(patch.scores.length===0)assert.ok(bundle.segments.every(s=>observedFactorScore(s,f)===null),f+' may not be imputed');
 }
});
