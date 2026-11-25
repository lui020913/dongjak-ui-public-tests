import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const lifecycle=readFileSync(new URL('../src/v806-unified-ui.js',import.meta.url),'utf8');
const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
test('phone map-origin risk report never opens participation; desktop retains its native intent',()=>{
 assert.match(lifecycle,/node\.closest\('#djNext-report,#ped-report-open'\)\)return win\.matchMedia\?\.\('\(max-width:699px\)'\)\?\.matches&&app\.dataset\.tab==='map'\?'':'participation-panel'/);
 assert.match(lifecycle,/app\.dataset\.tab==='map'&&event\.target\?\.closest\?\.\('#djNext-report,#ped-report-open'\)\)\{\s*dismissOthers\(''\);activeSurface='';return;/);
 assert.match(lifecycle,/pendingIntent=requested/);
 assert.match(lifecycle,/explicitUntil\.set\(requested,Date\.now\(\)\+1200\)/);
 assert.match(main,/else navigate\('participate'\);\s*communityComposerOrigin=origin/);
 assert.match(main,/communityComposerPortal\.open\(\{mapOrigin:communityComposerOrigin==='map',animate\}\)/);
 const portal=readFileSync(new URL('../src/community-composer-portal.js',import.meta.url),'utf8');
 assert.match(portal,/doc\.body\.append\(root\)/);
});
