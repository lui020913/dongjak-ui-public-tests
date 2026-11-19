import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {APP_VERSION} from '../src/app-version.js';
import {metroTransferBadgeLines} from '../src/transport-map.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('R2 PC-only styles and history shortcut are replaced by the shared mobile-first toolbar',()=>{
 const html=read('index.html'),main=read('src/main.js'),css=read('src/mobile-first-layout.css');
 assert.equal(html.includes('v729-r1-responsive-ui.css'),false);
 assert.equal(html.includes('v729-r2-new-ui.css'),false);
 assert.equal(html.includes('v729-r2-new-ui.js'),false);
 assert.ok(html.includes('id="version-history-trigger"'));
 assert.ok(main.includes("import './mobile-first-layout.css'"));
 assert.ok(css.includes('#dj-v794-toolbar'));
 assert.ok(css.includes('#bottom-nav:not([hidden])'));
});
test('the shared dock retains five adaptive tabs and non-wrapping labels',()=>{
 const css=read('src/mobile-first-layout.css');
 assert.ok(css.includes('grid-template-columns: repeat(5,minmax(0,1fr))'));
 assert.ok(css.includes('white-space: nowrap !important'));
 assert.ok(css.includes('text-overflow: ellipsis !important'));
});
test('transfer line badges retain distinct line semantics',()=>{
 assert.deepEqual(metroTransferBadgeLines('보라매',['7호선']),['7호선','신림선']);
 assert.deepEqual(metroTransferBadgeLines('이수',['7호선']),['7호선','4호선']);
 assert.deepEqual(metroTransferBadgeLines('노량진',['9호선']),['9호선','1호선']);
 assert.ok(read('src/transport-map.js').includes("makeLineBadge(line,'metro-panel-badge')"));
 assert.equal(JSON.parse(read('package.json')).version,APP_VERSION);
});
