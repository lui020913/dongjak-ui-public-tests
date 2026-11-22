import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {buildSanghyeonMiddleSchoolReview} from '../src/sangdo1-middle-school-review.mjs';
import {scopedPolicyFeatures} from '../src/pri-scope-data.mjs';

const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const json=p=>JSON.parse(read(p));
// Source CI has the public production template; the protected release
// assembles a sealed app-only candidate and places the exact copied files
// in src/. Test the same content in both independently validated contexts.
const productionFile=extension=>{
  const template='../../frontend/production/mobile-next.'+extension;
  const copied='../src/mobile-next.'+extension;
  if(existsSync(new URL(template,import.meta.url)))return read(template);
  if(existsSync(new URL(copied,import.meta.url)))return read(copied);
  throw Error('No verified mobile-next.'+extension+' in source or sealed build');
};
const phoneCss=productionFile('css');
const phoneJs=productionFile('js');
const myInfo=read('../src/v834-my-info.js');
const pri=read('../src/pri-map.js');

test('production app no longer reparents the single language row or restores the orphan card',()=>{
  assert.doesNotMatch(phoneJs,/host\.append\(language\)/);
  assert.doesNotMatch(phoneJs,/normalizeMine/);
  assert.doesNotMatch(phoneCss,/\.dj854-language-section\{order:99!important;display:block!important/);
  assert.match(myInfo,/displayGroup\.insertBefore\(languageControl/);
  assert.match(myInfo,/node\.style\.setProperty\('display','none','important'\)/);
  assert.match(myInfo,/if\(active\)node\.style\.removeProperty\('display'\)/);
});

test('actual copied production sheet enforces four equal-height community controls and scoped nearby height',()=>{
  assert.match(phoneCss,/#participation-panel \.community-toolbar\{display:grid!important;grid-template-columns:minmax\(0,\.8fr\)/);
  assert.match(phoneCss,/#participation-panel \.community-post-preview\{background:var\(--dj9272-surface,#fff\)!important/);
  assert.match(phoneCss,/#ped-tools-panel:not\(\[hidden\]\):not\(\.dj871-sheet-expanded\)\{position:fixed!important/);
  assert.match(phoneCss,/height:auto!important;gap:0!important/);
  assert.match(phoneCss,/#ped-tools-panel\.dj871-sheet-expanded:not\(\[hidden\]\)/);
});

test('the protection-gap modal groups both real map subviews but never turns middle school into a factor',()=>{
  assert.match(pri,/const middleSchoolOption=\['middleReview','상현중학교 300m 도로 검토 · 점수 미산정'\]/);
  assert.match(pri,/group\.append\(choice\(\.\.\.middleSchoolOption\)\)/);
  assert.match(pri,/group\.append\(choice\(id,'상도1동 전체 보호 공백 점수 · 그라데이션'\)\)/);
  assert.match(pri,/const auditBox=el\('section','dj-pri-official-audit'\)/);
  assert.match(pri,/boundaryAudit\?\.size/);
  assert.match(pri,/middleSchoolReview:true/);
  assert.match(pri,/score:null,displayScore:0,evaluated:false,middleSchoolReview:true/);
});

test('the official SHP and all prior score and unknown-road contracts are invariant',()=>{
  const geo=json('../public/data/protection-zone/sangdo1_policy_gap_2factor_adminscope_300m_20261122.geojson');
  const audit=json('../public/data/protection-zone/sangdo1_22_clipped_official_catchment_audit_20261122.json');
  const factor=json('../public/data/pri/sangdo1_protection_gap_2factor_adminscope_factor.json');
  assert.equal(audit.source_original_sha256,'66b7650d5eef3b900061083b3d8f5c8f6dcb8eb00b891e6b03132f08fdca2911');
  assert.equal(audit.rows.length,22);
  assert.equal(audit.score_change_required,0);
  assert.equal(audit.rows.filter(r=>r.official_catchment_covered_pct===100).length,18);
  assert.equal(audit.rows.filter(r=>r.official_catchment_covered_pct===0).length,4);
  assert.equal(geo.features.length,1606);
  const plotted=scopedPolicyFeatures(geo);
  assert.equal(plotted.features.filter(f=>f.properties.evaluated).length,1003);
  assert.equal(plotted.features.filter(f=>!f.properties.evaluated).length,603);
  assert.equal(factor.scores.length,1686);
  assert.equal(factor.scores.filter(f=>f.score!==null).length,1003);
  assert.equal(factor.scores.filter(f=>f.score===null).length,683);
  const snapshot=geo.features.map(f=>[f.properties.segment_id,f.properties.combined_new_score]);
  const review=buildSanghyeonMiddleSchoolReview(geo);
  assert.equal(review.features.length,172);
  assert.ok(review.features.every(f=>f.properties.middle_school_gap_score===null));
  assert.deepEqual(geo.features.map(f=>[f.properties.segment_id,f.properties.combined_new_score]),snapshot);
  for(const r of audit.rows){
    const f=geo.features.find(f=>f.properties.segment_id===r.segment_id);
    assert.ok(f,'missing original road '+r.segment_id);
    assert.equal(f.properties.combined_new_score,r.original_combined_score);
    assert.equal(r.risk_score_invariant_for_any_school_overlap,true);
  }
});
