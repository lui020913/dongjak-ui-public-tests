import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {scopedCompositeFeatures} from '../src/pri-scope-data.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('candidate display is visible and distinguishable without changing unknown risk',()=>{
 const src=read('src/pri-map.js'),css=read('src/pri-map.css');
 assert.match(src,/CANDIDATE_COLOR='#829691',CANDIDATE_OPACITY=\.88/);
 assert.match(src,/sharedCandidate:!f.properties.evaluated&&ids.has/);
 assert.match(src,/'line-color':CANDIDATE_COLOR,'line-opacity':CANDIDATE_OPACITY/);
 assert.match(css,/dj-pri-key-candidate::before\{border-top:3px dashed #829691/);
 const candidates=JSON.parse(read('public/data/pri/sangdo1_shared_road_candidates_20261125.json'));
 const scope=JSON.parse(read('public/data/protection-zone/sangdo1_policy_gap_2factor_adminscope_300m_20261122.geojson'));
 const ids=new Set(candidates.scores.map(s=>s.id)),draw=scopedCompositeFeatures(scope,new Map());
 assert.ok(draw.features.some(f=>ids.has(f.properties.segmentId)&&!f.properties.evaluated));
 assert.ok(candidates.scores.every(s=>s.score===null));
});
test('speed links use common road width and render only once',()=>{
 const src=read('src/pri-map.js');
 assert.match(src,/map.setPaintProperty\(SPEED_LINE,'line-width',roadWidth\)/);
 assert.match(src,/mode==='speed'\?\['all',\['==',\['geometry-type'\],'LineString'\],\['!=',\['get','speedSource'\],'observed-link'\]\]/);
 assert.doesNotMatch(src,/11\.5,1\.4,13,2\.4,15,3\.8/);
});
