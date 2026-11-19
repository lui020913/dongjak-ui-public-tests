import {historicalSnapshotTest} from './support/historical-snapshot-audit.mjs';
import {APP_VERSION} from '../src/app-version.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {createHash} from 'node:crypto';
const read=p=>readFileSync(new URL('../'+p, import.meta.url),'utf8');
const hash=p=>createHash('sha256').update(readFileSync(new URL('../'+p, import.meta.url))).digest('hex');
// v8.3.2: approved route boundary alert and GPS success guard change.
const oldMain='33c3f91f45f6e553d5f023a89afed30579026c667b6854ac7781a4108075d44a';
historicalSnapshotTest('original v8.0.0 map engine is unchanged',()=>{
  assert.equal(hash('src/main.js'),oldMain);
  assert.equal(JSON.parse(read('package.json')).version,APP_VERSION);
});
test('v8.0.0 iOS artwork and theme transition survive safety drawer UI',()=>{
  const html=read('index.html');
  for(const fragment of ['manifest-light.webmanifest','dj-apple-touch-icon','dj-pwa-transition-v7104','dongjak-light-512.png','src/app-artwork-v7104.js','src/safety-workbench-entry-v7104.js']){
    assert.ok(html.includes(fragment),`missing ${fragment}`);
  }
  assert.ok(!html.includes('보행안전 지도 v7.10.3'));
  assert.ok(html.includes('보행안전 지도 v'+APP_VERSION));
});
