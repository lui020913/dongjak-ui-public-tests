#!/usr/bin/env node
/** Reproducible Sangdo1 middle-school spatial-review export (NOT risk scores). */
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildSanghyeonMiddleSchoolReview,distanceToSchoolMeters} from '../../app/src/sangdo1-middle-school-review.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const base=resolve(root,'app/public/data/protection-zone');
const path=join(base,'sangdo1_policy_gap_2factor_adminscope_300m_20261122.geojson');
const geo=JSON.parse(await readFile(path,'utf8'));
assert.equal(geo.features.length,1606,'The official clipped Sangdo1 study should contain 1606 roads');
const review=buildSanghyeonMiddleSchoolReview(geo);
const {metadata,features}=review;
assert.equal(features.length,metadata.road_segments);
assert.equal(metadata.existing_policy_scored+metadata.existing_policy_null,features.length);
assert.ok(features.length>0,'No nearby roads: school coordinates or base data must be checked');
for(const f of features){
 const lines=f.geometry.type==='MultiLineString'?f.geometry.coordinates:[f.geometry.coordinates];
 for(const line of lines)for(const p of line)assert.ok(distanceToSchoolMeters(p)<=300.02,
  'Outside middle-school 300m boundary: '+f.properties.segment_id);
 assert.equal(f.properties.middle_school_gap_score,null);
}
const esc=s=>'"'+String(s??'').replaceAll('"','""')+'"';
const header=['segment_id','road_name','network_kind','existing_policy_score_0_100',
 'existing_policy_scored','middle_school_gap_score','middle_school_gap_status','boundary_scope'];
const records=features.map(f=>header.map(k=>esc(f.properties[k])).join(','));
const csv=[header.join(','),...records].join('\n')+'\n';
const outFlag=process.argv.indexOf('--out-dir');
if(outFlag!==-1){
 if(!process.argv[outFlag+1])throw Error('--out-dir requires a path');
 const output=resolve(process.argv[outFlag+1]);
 await mkdir(output,{recursive:true});
 await writeFile(join(output,'sangdo1_middle_school_300m_review.geojson'),JSON.stringify(review));
 await writeFile(join(output,'sangdo1_middle_school_300m_review.csv'),csv);
 await writeFile(join(output,'sangdo1_middle_school_300m_summary.json'),JSON.stringify(metadata,null,2)+'\n');
}
console.log(JSON.stringify(metadata,null,2));
