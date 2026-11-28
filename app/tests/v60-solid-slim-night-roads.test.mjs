import {APP_VERSION} from '../src/app-version.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {VERSION_HISTORY} from '../src/version-history.js';
const read=rel=>readFileSync(new URL('../'+rel,import.meta.url),'utf8');

test('v6.0 preserves earlier history and uses valid internal semver',()=>{
  assert.equal(JSON.parse(read('package.json')).version,APP_VERSION);
  assert.equal(JSON.parse(read('package-lock.json')).packages[''].version,APP_VERSION);
  assert.equal(JSON.parse(read('public/version.json')).version,APP_VERSION);
  assert.ok(VERSION_HISTORY.some(entry=>entry.version==='v6.0'));
  assert.ok(VERSION_HISTORY.some(entry=>entry.version==='v1.0.0'));
   assert.doesNotMatch(read('index.html'),/>업데이트<\/button>/);
});

test('retired standalone night legend is absent from public HTML',()=>{
  const html=read('index.html');
  assert.doesNotMatch(html,/night-occlusion-legend|분석선은 모두 실선입니다/);
  assert.doesNotMatch(html,/night-result-legend/);
  assert.doesNotMatch(html,/점선: 영향 반경 밖/);
});
