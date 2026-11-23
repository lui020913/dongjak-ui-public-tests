import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const lifecycle=readFileSync(new URL('../src/v806-unified-ui.js',import.meta.url),'utf8');
const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
test('map-origin risk report is an authorized participation-page opening intent',()=>{
 assert.match(lifecycle,/node\.closest\('#djNext-report,#ped-report-open'\)\)return 'participation-panel'/);
 assert.match(lifecycle,/pendingIntent=requested/);
 assert.match(lifecycle,/explicitUntil\.set\(requested,Date\.now\(\)\+1200\)/);
 assert.match(main,/navigate\('participate'\);communityComposerOrigin=origin/);
 assert.match(main,/communityComposerPortal\.open\(\)/);
 const portal=readFileSync(new URL('../src/community-composer-portal.js',import.meta.url),'utf8');
 assert.match(portal,/doc\.body\.append\(root\)/);
});
