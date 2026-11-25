import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../src/'+p,import.meta.url),'utf8');
test('risk report opens the same community composer on every viewport',()=>{
 const lifecycle=read('v806-unified-ui.js'),main=read('main.js'),portal=read('community-composer-portal.js');
 assert.match(lifecycle,/node\.closest\('#djNext-report,#ped-report-open'\)\)return 'participation-panel'/);
 const report=main.slice(main.indexOf('onReport:()=>{'),main.indexOf('function makeCEl('));
 assert.match(report,/navigate\('participate'\);[\s\S]*?openCommunityComposer\(true/);
 assert.doesNotMatch(main,/communityComposerOrigin/);
 assert.doesNotMatch(portal,/mapOrigin/);
 assert.match(portal,/doc\.body\.append\(root\)/);
});
