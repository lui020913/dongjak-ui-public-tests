import test from 'node:test';
import assert from 'node:assert/strict';
import {mobileReleaseMarkerMatches} from '../scripts/verify-mobile-release-marker.mjs';

const expected={
  sourceSha:'0c4be7f51a4052b13315294229a044cc65d175d1',
  publicSha:'380af3cbb33ff662ea4690c95a52d1aa6e4c4d34',
  cssSha:'4022b314c362731ced8c353987b503a4744499c42d9c2fe2bc3602465453f519',
  appVersion:'8.26.1',
  buildRun:'44368792360'
};
const marker={
  source_commit:expected.sourceSha,
  public_ui_source_commit:expected.publicSha,
  public_ui_overlay_sha256:expected.cssSha,
  application_version:expected.appVersion,
  build_run:expected.buildRun,
  release_status:'CANDIDATE_PREVIEW_NOT_PRODUCTION'
};

test('accepts only the exact mobile preview candidate marker',()=>{
  assert.equal(mobileReleaseMarkerMatches(marker,expected),true);
});

test('rejects mismatched source, public overlay, version, build or deployment status',()=>{
  for(const [field,value] of [
    ['source_commit','f'.repeat(40)],
    ['public_ui_source_commit','e'.repeat(40)],
    ['public_ui_overlay_sha256','d'.repeat(64)],
    ['application_version','8.26.2'],
    ['build_run','1'],
    ['release_status','DEPLOYED_PRODUCTION']
  ]) {
    assert.equal(mobileReleaseMarkerMatches({...marker,[field]:value},expected),false,field);
  }
});
