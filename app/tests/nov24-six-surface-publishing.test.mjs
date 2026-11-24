import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeSolidMapLines} from '../src/solid-map-lines.js';
const src=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('solid lines preserve widths and colors, including unknown PRI and dynamic layers',()=>{
 const layers=[{id:'a',type:'line',paint:{'line-color':'#777','line-width':4,'line-dasharray':[1,2]}},{id:'b',type:'line',paint:{'line-color':'red'}},{id:'c',type:'fill',paint:{}}];
 const writes=[];assert.equal(normalizeSolidMapLines({getStyle:()=>({layers}),setPaintProperty:(...v)=>writes.push(v)}),1);
 assert.deepEqual(writes,[['a','line-dasharray',null]]);
 assert.match(src('src/main.js'),/installSolidMapLines\(map\)/);
 assert.match(src('src/route-experience-20261123.js'),/회색 실선: 미평가/);
});
test('history closes every group by default, including My Info reentry',()=>{
 assert.match(src('src/version-history-v7.js'),/archive.open=false/);
 assert.match(src('src/v834-my-info.js'),/querySelectorAll\('details\[open\]'\)/);
});
test('AI scroll cannot chain into page, preserving the transcript as scroll owner',()=>{
 assert.match(src('src/v880-supabase-safety-ai.js'),/scroll.scrollHeight<=scroll.clientHeight\+1/);
 assert.match(src('src/v880-supabase-safety-ai.css'),/body\{position:fixed!important;inset:0!important/);
});
test('public posts and reviews require cloud success and never silently save locally',()=>{
 const main=src('src/main.js'),submit=main.slice(main.indexOf("communityForm.addEventListener('submit'"),main.indexOf("communityForm.addEventListener('submit'")+3800);
 assert.match(submit,/if\(!signedIn\)/);
 assert.match(submit,/if\(!wantsPublic\)/);
 assert.doesNotMatch(submit,/saveCommunity\(\[post/);
 const reviews=src('src/v834-place-reviews.js');
 assert.match(reviews,/upsert\(payload,\{onConflict:'place_key,user_id'\}\)\.select/);
 assert.doesNotMatch(reviews,/localWrite\(key,record\);/);
});
