import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
test('community controls are immediately accessible without expanding a details menu',()=>{
 const html=read('../index.html');
 const block=html.split('<div class="community-view-options">')[1]?.split('<section id="community-notifications"')[0];
 assert.ok(block);
 assert.doesNotMatch(block,/<details|<summary/);
 for(const id of ['community-dong-filter','community-sort','community-saved-toggle','community-notifications-toggle','community-refresh']){
   assert.equal((block.match(new RegExp('id="'+id+'"','g'))||[]).length,1);
 }
 assert.ok(block.indexOf('class="community-toolbar"')<block.indexOf('id="community-dong-filter"'));
 const css=read('../src/phone-surface-consistency-20261123.css');
 assert.doesNotMatch(css,/community-view-options:not\(\[open\]\)/);
 assert.match(css,/repeat\(3,44px\)/);
 assert.match(css,/min-height:44px!important;height:44px!important/);
 const js=read('../src/main.js');
 assert.ok(js.includes("button.textContent='알림';"));
 assert.ok(js.includes("button.setAttribute('aria-label',count?"));
});
