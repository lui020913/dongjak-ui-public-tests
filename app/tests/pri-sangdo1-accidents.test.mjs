import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {adaptLighting,parseImport,segmentScore,summarize} from '../src/pri-data.mjs';

const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'));

test('PRI ② is spatially aligned to the existing Sangdo1 night-visibility road network',()=>{
 const lighting=read('../public/data/pri/lighting_segments.json');
 const patch=read('../public/data/pri/sangdo1_accidents_factor.json');
 const manifest=read('../public/data/pri/manifest.json');
 const base=adaptLighting(lighting);
 assert.equal(base.segments.length,1686);
 assert.equal(patch.networkVersion,base.networkVersion,'patch must use the exact existing lighting road geometry');
 assert.equal(manifest.bundle,'/data/pri/lighting_segments.json');
 assert.deepEqual(manifest.patches,['/data/pri/sangdo1_accidents_factor.json','/data/pri/sangdo1_protection_gap_2factor_factor.json']);
 assert.equal(read('../public/data/pri/sangdo1_protection_gap_2factor_factor.json').networkVersion,base.networkVersion,'third PRI factor must be spatially aligned to the same 25m network');
 assert.equal(patch.sourceRecords.length,3,'only the three Sangdo1 records may be included');
 assert.deepEqual(new Set(patch.sourceRecords.map(r=>r.source_fid)),new Set(['6931875','6838434','6778949']));
 assert.deepEqual(new Set(patch.sourceRecords.map(r=>r.score)),new Set([40,50]));
 assert.equal(patch.factor.scoreDirection,'risk');
 assert.equal(patch.unmatchedScore,100);
 const integrated=parseImport(patch,base),observed=integrated.segments.filter(s=>s.evidence.accidents?.note?.startsWith('원본 위험점수'));
 const notSelected=integrated.segments.filter(s=>!s.evidence.accidents?.note?.startsWith('원본 위험점수'));
 assert.equal(observed.length,76,'site polygons must overlap 76 of the existing 25 m survey segments');
 assert.equal(observed.filter(s=>s.scores.accidents===60).length,30,'source risk 40 -> safety 60');
 assert.equal(observed.filter(s=>s.scores.accidents===50).length,46,'source risk 50 -> safety 50');
 assert.equal(notSelected.length,1610,'all other 25m lighting segments receive an explicitly provisional baseline');
 assert.ok(notSelected.every(s=>s.scores.accidents===100&&/실제 사고 0건/.test(s.evidence.accidents.note)));
 assert.ok(integrated.segments.every(s=>s.scores.lighting>=0&&s.scores.lighting<=100));
 assert.ok(observed.every(s=>s.scores.lighting!==null),'light and accident factors are joined by the same segment ID');
 const observedIds=new Set(observed.map(s=>s.id));
 for(const s of integrated.segments){
  const value=segmentScore(integrated,s,'pri12');
  const expected=observedIds.has(s.id)?(s.scores.lighting+s.scores.accidents)/2:null;
  assert.equal(value,expected,'only observed overlapping lighting and accident risk scores may enter the preliminary mean');
  assert.equal(segmentScore(integrated,s,'pri'),null,'a 2/6 mean is not an approved 6-factor PRI');
 }
 assert.ok(summarize(integrated,'pri12').observedM>0);
 assert.equal(summarize(integrated,'pri12').observedM,observed.reduce((n,s)=>n+s.lengthM,0),'only the 76 observed accident-overlap segments contribute');
 assert.ok(summarize(integrated,'pri12').observedM<summarize(integrated,'lighting').observedM);
});
