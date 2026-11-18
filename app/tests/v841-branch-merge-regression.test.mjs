import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(f)=>readFileSync(new URL('../'+f,import.meta.url),'utf8');

test('v8.4 coordination loads without replacing v8.3.2 interaction and styles',()=>{
 const html=read('index.html');
 for(const ref of ['/src/v840-coordinated-ui.js','/src/v832-mobile-interaction.js','/src/v832-mobile-interaction.css']){
  assert.equal(html.split(ref).length-1,1,`${ref} should be loaded once`);
 }
 assert.match(read('src/v840-coordinated-ui.js'), /PRIMARY_PANELS,TRANSIENT_PANELS/);
 assert.match(read('src/v832-mobile-interaction.js'),/dongjak:route-boundary-denied/);
});
test('original 15 v8.4 changes and mobile route enhancements coexist',()=>{
 const html=read('index.html');
 assert.match(html,/src\/v8215-transit-auth-bus-sheet\.js/);
 assert.match(html,/src\/v840-coordinated-ui\.js/);
 const app=read('src/main.js');
 assert.match(app,/const accepted=setRouteLocation\('start'/);
 assert.match(app,/if\(accepted\)\{/);
 assert.match(read('src/v815-map-product.js'),/＋ 경유지 추가/);
 assert.match(read('src/v840-ui-core.js'),/MAP_TIP_MESSAGES/);
});
test('the audited v8.4.1 and v8.4.0 source releases keep their original order and notes',()=>{
 const pkg=JSON.parse(read('package.json'));
 const log=JSON.parse(read('src/app-release-log.json')).releases;
 assert.equal(pkg.version,log[0].version);
 const later=log.findIndex(entry=>entry.previousVersion==='8.4.1');
 const earlier=log.findIndex(entry=>entry.previousVersion==='8.4.0');
 assert.ok(later>=0&&earlier>later);
 assert.equal(log[later].scale,'minor');
 assert.equal(log[earlier].scale,'minor');
 assert.match(log[later].originalItems.join(' '),/출발지 지정 오류 수정/);
 assert.match(log[earlier].originalItems.join(' '),/행정동 선택/);
});
