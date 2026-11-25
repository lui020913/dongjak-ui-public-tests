import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {matchSharedRoadWidths} from '../src/pri-shared-road-width-match.mjs';
const json=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'));
test('width spatial join reproduces the exact candidate coverage and preserves all unverified scores as null',()=>{
 const base=json('../public/data/pri/lighting_segments.json');const geo=json('../public/data/sangdo1-analysis-view/roadwidth.geojson');
 const candidates=json('../public/data/pri/sangdo1_shared_road_candidates_20261125.json');const {rows,stats}=matchSharedRoadWidths(base,geo);const byId=new Map(rows.map(r=>[r.id,r]));
 assert.equal(stats.eligible,1276);assert.equal(stats.matched,649);assert.equal(stats.stable,226);
 assert.equal(candidates.scores.length,224);assert.equal(candidates.scores.filter(c=>c.width).length,127);
 assert.equal(candidates.scores.filter(c=>c.width?.conditionalMixedRisk!=null).length,6);
 for(const row of candidates.scores){assert.equal(row.score,null);assert.deepEqual(row.width,byId.get(row.id)??null);}
});
