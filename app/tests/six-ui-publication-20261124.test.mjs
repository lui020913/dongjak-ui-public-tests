import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {solidifyMapLines} from '../src/solid-map-lines.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('solid rendering retains the meaning, geometry and color of every line layer',()=>{
 const layers=[{id:'route',type:'line',paint:{'line-color':'#85949d','line-dasharray':[1,2]}},{id:'rail',type:'line',paint:{'line-dasharray':[2,2]}},{id:'plain',type:'line',paint:{'line-color':'blue'}},{id:'area',type:'fill'}];
 const changed=[];const map={getStyle:()=>({layers}),setPaintProperty:(id,key,value)=>{changed.push([id,key,value]);delete layers.find(l=>l.id===id).paint[key]}};
 assert.equal(solidifyMapLines(map),2);assert.equal(solidifyMapLines(map),0);assert.deepEqual(changed.map(x=>x[0]),['route','rail']);assert.equal(layers[0].paint['line-color'],'#85949d');
});
test('history collapses on both entry paths and keeps text inside category',()=>{
 assert.match(read('src/version-history-v7.js'),/archive.open=false/);
 assert.match(read('src/v834-my-info.js'),/historyList.querySelectorAll\('details'\)/);
 assert.match(read('src/version-history-v7.css'),/v707-release-items li\{[\s\S]*?overflow-wrap:anywhere!important/);
});
test('AI and PRI headers stay outside the scrolling content',()=>{
 const ai=read('src/v880-supabase-safety-ai.js'),css=read('src/v880-supabase-safety-ai.css'),pri=read('src/pri-map.js');
 assert.match(ai,/event.cancelable\)event.preventDefault/);assert.match(css,/position:fixed!important;inset:0!important;width:100%!important;height:100%!important/);
 assert.match(pri,/scrollBody.append\(intro,status,scopeNotice,actions,focusArea,clear,dataTools\);dialog.append\(head,scrollBody\)/);
 assert.match(read('src/pri-map.css'),/\.dj-pri-body\{[\s\S]*?overflow-y:auto!important/);
});
test('public submission never silently falls back to private device storage',()=>{
 const main=read('src/main.js'),form=main.slice(main.indexOf("communityForm.addEventListener('submit'"),main.indexOf("communityForm.addEventListener('submit'")+4200);
 assert.match(form,/await publishCommunityPost\(post\)/);assert.doesNotMatch(form,/saveCommunity\(\[post/);
 assert.match(read('index.html'),/id="community-share-publicly" required/);
 const reviews=read('src/v834-place-reviews.js');assert.match(reviews,/\.select\('id'\).single\(\)/);assert.doesNotMatch(reviews,/localWrite\(/);assert.match(reviews,/form.hidden=false;return;/);
});
