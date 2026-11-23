import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const html=read('index.html');
const main=read('src/main.js');
const my=read('src/v834-my-info.js');
const mobile=read('src/phone-surface-consistency-20261123.css');
// In the sealed Preview artifact, frontend/ is intentionally excluded. The
// production follow-up module is copied into app/src/ by the release builder.
const followup=(()=>{try{return read('src/mobile-17-followup.js');}catch(error){
 if(error?.code!=='ENOENT')throw error;
 return read('../frontend/production/mobile-17-followup.js');
}})();

test('each route point has one picker, without deleting native map/search/GPS owners',()=>{
 assert.equal((html.match(/class="route-location-menu"/g)||[]).length,2);
 assert.equal((html.match(/class="route-location-popover"/g)||[]).length,2);
 for(const id of ['route-search-start','route-pick-start','route-gps-start','route-search-end','route-pick-end']){
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 }
 assert.match(main,/querySelectorAll\('#route-panel \.route-location-menu'\)/);
 assert.doesNotMatch(followup,/hint\.textContent='출발지와 목적지를 선택하면/);
 assert.match(read('src/route-experience.css'),/\.route-location-menu > summary/);
 assert.match(mobile,/\.route-location-popover/);
});

test('community presents one writing action, optional tools and one permanent refresh owner',()=>{
 assert.equal((html.match(/id="community-compose-toggle"/g)||[]).length,1);
 assert.equal((html.match(/id="community-refresh"/g)||[]).length,1);
 assert.match(html,/class="community-primary-controls"/);
 assert.match(html,/<details class="community-view-options">/);
 assert.doesNotMatch(html,/class="community-report-secondary"/);
 assert.match(html,/id="participate-register" class="community-map-report-link"/);
 assert.match(main,/community-refresh'\)\.addEventListener\('click'/);
 assert.doesNotMatch(main,/const bar=makeCEl\('div','dj-community-feed-status'\)/);
 assert.doesNotMatch(main,/dj-community-empty-footnote'/);
 assert.match(followup,/\.community-primary-controls'/);
 assert.match(mobile,/\.community-view-options>summary/);
});

test('advanced map tools live inside one map preferences subpage',()=>{
 assert.doesNotMatch(my,/data-dj834-action="tools"/);
 assert.match(my,/advancedTools\.append\(advancedTitle,toolsBox\);mapBox\.append\(advancedTools\)/);
 assert.match(my,/toolsBox\.hidden=false/);
 assert.match(my,/mapBox:mapBox|map:mapBox/);
 assert.match(my,/if\(view==='tools'\)\{view='map';advancedTools\.open=true;\}/);
 assert.match(mobile,/\.dj834-advanced-tools>summary/);
});
