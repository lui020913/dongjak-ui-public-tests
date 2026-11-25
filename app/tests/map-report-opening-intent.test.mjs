import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../src/'+p,import.meta.url),'utf8');
test('phone risk report opens the composer directly over the map; wide screens retain inline editing',()=>{
 const lifecycle=read('v806-unified-ui.js'),main=read('main.js'),portal=read('community-composer-portal.js');
 assert.ok(lifecycle.includes("if(node.closest('#djNext-report,#ped-report-open'))return phone()?'':'participation-panel';"));
 const report=main.slice(main.indexOf('onReport:()=>{'),main.indexOf('function makeCEl('));
 assert.ok(report.includes("if(!communityComposerFromMap)navigate('participate');"));
 assert.ok(report.includes("else if(app.dataset.tab!=='map')navigate('map',{suppressOverview:true});"));
 assert.ok(report.includes("openCommunityComposer(true,{animate:true})"));
 assert.ok(portal.includes('doc.body.append(root)'));
});
