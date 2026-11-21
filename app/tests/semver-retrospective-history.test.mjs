import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LATEST_APP_RELEASE,VERSION_HISTORY,RENUMBERED_VERSION_HISTORY as DISPLAY_HISTORY} from '../src/version-history.js';
import {LEGACY_VERSION_HISTORY} from '../src/version-history-legacy.js';
import {REBUILT_RELEASES,VERSION_POLICY,buildRetrospectiveHistory} from '../src/release-semver.js';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const json=p=>JSON.parse(read(p));
const chronological=[...DISPLAY_HISTORY].reverse();
const original=[...VERSION_HISTORY,...LEGACY_VERSION_HISTORY].reverse();
const tuple=v=>v.slice(1).split('.').map(Number);

test('every original version, even the duplicate v7.0.25 entries, is carried through unchanged',()=>{
  assert.equal(original.length,115);
  assert.equal(original.reduce((n,x)=>n+x.items.length,0),519);
  assert.equal(REBUILT_RELEASES.length,21);
  assert.equal(DISPLAY_HISTORY.length,136);
  assert.equal(DISPLAY_HISTORY.reduce((n,x)=>n+x.items.length,0),623);
  assert.equal(chronological[0].version,'v1.0.0');
  assert.equal(chronological[0].sourceVersion,'v1.0');
  assert.equal(chronological.at(-1).sourceVersion,'v8.0.3 플랫폼 공통 UI 정렬·테마 안정화');
  for(let i=0;i<original.length;i++){
    assert.equal(chronological[i].sourceVersion,original[i].version);
    assert.deepEqual(chronological[i].sourceItems,original[i].items);
    assert.equal(chronological[i].sourcePosition,i+1);
  }
  const duplicates=chronological.filter(x=>x.sourceVersion==='v7.0.25');
  assert.equal(duplicates.length,2);
  assert.notEqual(duplicates[0].version,duplicates[1].version);
});

test('new release numbers are unique, valid, strictly increasing, and reset correctly',()=>{
  const unique=new Set(DISPLAY_HISTORY.map(x=>x.version));
  assert.equal(unique.size,DISPLAY_HISTORY.length);
  for(const [i,r] of chronological.entries()){
    assert.match(r.version,/^v\d+\.\d+\.\d+$/);
    assert.ok(['major','minor','patch'].includes(r.scale));
    assert.ok(r.items.length>0);
    if(!i)continue;
    const [a,b,c]=tuple(chronological[i-1].version);
    const [x,y,z]=tuple(r.version);
    if(r.scale==='major')assert.deepEqual([x,y,z],[a+1,0,0]);
    if(r.scale==='minor')assert.deepEqual([x,y,z],[a,b+1,0]);
    if(r.scale==='patch')assert.deepEqual([x,y,z],[a,b,c+1]);
  }
  assert.equal(DISPLAY_HISTORY.filter(r=>r.scale==='major').length,8);
});

test('all public current version surfaces correspond to newest reclassified release',()=>{
  const current=LATEST_APP_RELEASE.version;
  const unprefixed=current.slice(1);
  assert.equal(json('package.json').version,unprefixed);
  assert.equal(json('package-lock.json').version,unprefixed);
  assert.equal(json('package-lock.json').packages[''].version,unprefixed);
  assert.equal(json('public/version.json').version,unprefixed);
  assert.equal(json('src/build-info.json').version,unprefixed);
  const html=read('index.html');
  assert.match(html,/id="version-history-trigger"[^>]*>업데이트<\/button>/);
  assert.ok(html.includes('id="dj-guide-latest-version">분류별 내역</strong>'));
  assert.ok(html.includes('id="map-startup-version" aria-label="앱 버전">버전 1.0</span>'));
  assert.ok(html.includes('v1.0.0부터'));
});

test('app UI uses reclassified records and keeps source notes out of MapLibre code',()=>{
  const controller=read('src/version-history.js');
  const renderer=read('src/version-history-v7.js');
  const interfaceText=read('src/version-history-v7.css');
  assert.ok(controller.includes('...RENUMBERED_VERSION_HISTORY'));
  assert.ok(renderer.includes("record.sourceVersion"));
  assert.ok(renderer.includes('dj-semver-size'));
  assert.ok(interfaceText.includes('dj-semver-size'));
  assert.ok(VERSION_POLICY.major&&VERSION_POLICY.minor&&VERSION_POLICY.patch);
  assert.ok(!read('src/release-semver.js').includes('maplibregl'));
});

test('migration table and human-readable full history include every release',()=>{
  const changelog=read('docs/CHANGELOG_SEMVER_FULL.md');
  const map=read('docs/VERSION_MIGRATION_MAP.csv');
  assert.ok(changelog.includes('### v1.0.0'));
  assert.ok(changelog.includes(`### ${DISPLAY_HISTORY[0].version}`));
  assert.equal((changelog.match(/^### v\d+\.\d+\.\d+/gm)||[]).length,DISPLAY_HISTORY.length);
  assert.equal(map.trimEnd().split('\n').length,DISPLAY_HISTORY.length+1);
  assert.ok(map.includes('"v7.0.25"'));
});

test('data-only re-numbering is reproducible',()=>{
  assert.deepEqual(buildRetrospectiveHistory(VERSION_HISTORY,LEGACY_VERSION_HISTORY),DISPLAY_HISTORY);
});
