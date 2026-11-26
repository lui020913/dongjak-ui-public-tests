import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sharedRoadDisplay} from '../src/pri-shared-road-display.mjs';
const ref=JSON.parse(readFileSync(new URL('../public/data/sangdo1-analysis-view/bocha-mixed-roads.geojson',import.meta.url),'utf8'));
const candidate=JSON.parse(readFileSync(new URL('../public/data/pri/sangdo1_shared_road_candidates_20261125.json',import.meta.url),'utf8'));
test('restore every original clipped line without adding unknown scores or duplicate matched candidate geometry',()=>{
 const id=candidate.scores[0].id,ids=new Set([id]);
 const unknown={type:'Feature',geometry:ref.features[0].geometry,properties:{segmentId:id,evaluated:false}};
 const evaluated={...unknown,properties:{segmentId:'confirmed',evaluated:true,score:70,displayScore:70}};
 const result=sharedRoadDisplay({features:[unknown,evaluated]},ids,ref);
 assert.equal(result.features.length,238);
 assert.equal(result.features.filter(f=>f.properties.sharedReference).length,237);
 assert.ok(result.features.filter(f=>f.properties.sharedReference).every(f=>f.properties.score===null&&!f.properties.evaluated));
 assert.equal(result.features[0].properties.score,70);
 const fallback=sharedRoadDisplay({features:[unknown]},ids,null);
 assert.equal(fallback.features[0].properties.sharedCandidate,true);
});
