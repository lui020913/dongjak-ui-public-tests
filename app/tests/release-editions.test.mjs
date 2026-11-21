import test from 'node:test';
import assert from 'node:assert/strict';
import {VERSION_HISTORY,RENUMBERED_VERSION_HISTORY} from '../src/version-history.js';
import {LEGACY_VERSION_HISTORY} from '../src/version-history-legacy.js';
import {APP_RELEASES} from '../src/app-version.js';
import {releaseEdition,groupReleaseEditions,deploymentVersionLabel,syncPublicVersion,HISTORICAL_EDITIONS} from '../src/release-editions.js';
test('all 202 baseline records retain their identity and every note',()=>{
 const operational=APP_RELEASES.filter(r=>/^v8\./.test(r.version));
 assert.equal(operational.length,66);
 const records=[...operational,...RENUMBERED_VERSION_HISTORY];
 assert.equal(records.length,202);
 const groups=groupReleaseEditions(records),flattened=groups.flatMap(g=>g.records.map(x=>x.record));
 assert.equal(groups.length,HISTORICAL_EDITIONS.length);
 assert.ok(groups.every(g=>g.historical&&/^\d+\.\d$/.test(g.label)));
 assert.deepEqual(flattened,records);
 assert.equal(flattened.reduce((n,x)=>n+(x.sourceItems||x.items).length,0),883);
 assert.equal(new Set(records.map(r=>releaseEdition(r).position)).size,202);
 assert.equal(RENUMBERED_VERSION_HISTORY.filter(r=>r.sourceVersion==='v7.0.25').length,2);
});
test('deployment status only comes from matching verified release marker',()=>{
 const beta={application_version:'9.0.0',release_status:'CANDIDATE_PREVIEW_NOT_PRODUCTION',release_channel:'developer-beta',beta_number:1};
 assert.equal(deploymentVersionLabel('9.0.0',beta),'9.0.0 Developer Beta 1');
 assert.equal(deploymentVersionLabel('9.0.0',{...beta,release_channel:'rc',rc_number:2}),'9.0.0 RC 2');
 assert.equal(deploymentVersionLabel('9.0.0',{...beta,release_status:'DEPLOYED_PRODUCTION'}),'9.0.0');
 assert.equal(deploymentVersionLabel('9.0.0',{...beta,application_version:'8.27.0'}),'9.0.0 · 개발 빌드');
 assert.equal(deploymentVersionLabel('9.1.2',null),'9.1.2 · 개발 빌드');
 assert.equal(releaseEdition({version:'v8.26.1'}).label,'8.9');
});

test('current patch versions are distinct',()=>{assert.deepEqual(groupReleaseEditions([{version:'9.1.2'},{version:'9.1.1'},{version:'9.1.0'}]).map(g=>g.label),['9.1.2','9.1.1','9.1.0']);});

test('pre-release screens stay 1.0 and unnumbered regardless of internal build',async()=>{
 const values=new Map(['version-history-trigger','dj-guide-latest-version','dj-about-version-number'].map(id=>[id,{textContent:'',dataset:{}}]));
 const doc={title:'동작하는 안전지도 · 9.2.74',getElementById:id=>values.get(id)||null};
 const result=await syncPublicVersion({version:'9.2.74',doc,win:{}});
 assert.deepEqual([...values.values()].map(x=>x.textContent),['업데이트','분류별 내역','1.0']);
 assert.equal(doc.title,'동작하는 안전지도 · 보행안전 지도');
 assert.equal(result.internalVersion,'9.2.74');
 assert.equal(result.publicVersion,'1.0');
});
