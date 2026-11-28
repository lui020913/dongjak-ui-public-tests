import {APP_VERSION} from '../src/app-version.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {VERSION_HISTORY,DEVELOPMENT_PHASES} from '../src/version-history.js';
import {LEGACY_VERSION_HISTORY} from '../src/version-history-legacy.js';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('new v6.0 release retains its v1.0.0 predecessor and sixty historic records',()=>{
  const p=JSON.parse(read('package.json'));
  const lock=JSON.parse(read('package-lock.json'));
  assert.equal(p.version,APP_VERSION);
  assert.equal(lock.version,APP_VERSION);
  assert.equal(VERSION_HISTORY[0].version,'v7.0.29');
  assert.ok(VERSION_HISTORY.some(entry=>entry.version==='v1.0.0'));
  assert.equal(LEGACY_VERSION_HISTORY.length,60);
  assert.equal(LEGACY_VERSION_HISTORY.at(-1).version,'v1.0');
  assert.equal(LEGACY_VERSION_HISTORY[0].version,'v5.12.11');
  assert.equal(DEVELOPMENT_PHASES.length,7);
   assert.doesNotMatch(read('index.html'),/>업데이트<\/button>/);
  assert.ok(read('docs/RELEASE_HISTORY_LEGACY_FULL.md').includes('v5.12.10'));
});
