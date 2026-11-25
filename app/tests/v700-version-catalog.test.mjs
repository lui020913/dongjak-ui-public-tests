import {APP_VERSION} from '../src/app-version.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {VERSION_HISTORY} from '../src/version-history.js';
import {LEGACY_VERSION_HISTORY} from '../src/version-history-legacy.js';
import {makeHistoryCatalog, classifyHistoryItem,HISTORY_CATEGORIES} from '../src/version-history-v7.js';
const read=f=>readFileSync(new URL(`../${f}`,import.meta.url),'utf8');

test('v7.0.4 metadata and visible header agree',()=>{
 assert.equal(JSON.parse(read('package.json')).version,APP_VERSION);
 assert.equal(JSON.parse(read('package-lock.json')).version,APP_VERSION);
 assert.equal(JSON.parse(read('public/version.json')).version,APP_VERSION);
 assert.equal(JSON.parse(read('src/build-info.json')).version,APP_VERSION);
 assert.equal(VERSION_HISTORY[0].version,'v7.0.29');
 assert.doesNotMatch(read('index.html'),/>업데이트<\/button>/);
});

test('all legacy and recent original notes are preserved exactly once in the hierarchy',()=>{
 const records=[...VERSION_HISTORY,...LEGACY_VERSION_HISTORY];
 const model=makeHistoryCatalog(VERSION_HISTORY,LEGACY_VERSION_HISTORY);
 const originals=records.flatMap(entry=>entry.items.map(text=>`${entry.version}|${text}`));
 const visible=model.groups.flatMap(group=>group.sections.flatMap(section=>section.items.map(item=>`${item.version}|${item.text}`)));
 assert.equal(model.releaseCount,records.length);
 assert.equal(model.itemCount,originals.length);
 assert.equal(LEGACY_VERSION_HISTORY.length,60);
 assert.equal(model.groups.length,HISTORY_CATEGORIES.length);
 assert.deepEqual(visible.slice().sort(),originals.slice().sort());
 assert.ok(visible.some(text=>text.startsWith('v1.0|')));
 assert.ok(visible.some(text=>text.startsWith('v6.1.2|')));
 assert.ok(visible.some(text=>text.startsWith('v7.0|')));
 assert.ok(visible.some(text=>text.startsWith('v7.0.1|')));
});

test('history preserves all original notes in data and shows audited public presentation',()=>{
 const renderer=read('src/version-history-v7.js');
 assert.ok(renderer.includes("el('article','v707-release dj-history-latest')"));
 assert.ok(renderer.includes("el('section','v707-history-timeline')"));
 assert.ok(renderer.includes("el('li','',publicReleaseNote(description,currentRelease.version))"));
 assert.ok(renderer.includes("el('aside','v707-history-sources')"));
 assert.ok(renderer.includes('DATA_SOURCE_GROUPS'));
 assert.ok(!renderer.includes("createElement('details')"));
 assert.ok(!renderer.includes('details.open'));
 assert.equal(classifyHistoryItem('상도1동 제한속도 도로').major,'safety');
});
