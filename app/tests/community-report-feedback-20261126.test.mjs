import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const main=read('src/main.js'),css=read('src/style.css');
test('map picker uses one persistent, cancellable notice above the phone dock',()=>{
 const pick=main.slice(main.indexOf("document.getElementById('community-map-pick').addEventListener"),main.indexOf("document.getElementById('community-map-cancel').addEventListener"));
 assert.ok(pick.includes("document.getElementById('community-map-hint').hidden=false"));
 assert.ok(!pick.includes("toast("));
 assert.ok(css.includes('bottom:var(--dj-community-picker-bottom'));
 assert.ok(main.includes('Math.ceil(host.bottom-dock.top)+12'));
 assert.ok(main.includes('new ResizeObserver(syncCommunityPickerDock)'));
 assert.ok(main.includes("delete app.dataset.communityPicking"));
 const tip=read('src/v840-coordinated-ui.js'),scale=read('src/map-scale-docking.js');
 assert.ok(tip.includes("app.dataset.communityPicking!=='true'"));
 assert.ok(scale.includes("app.dataset.communityPicking==='true'"));
 assert.ok(tip.includes("dongjak:community-picker-visibility"));
 assert.ok(scale.includes("dongjak:community-picker-visibility"));
});
test('report reason has app-owned controls and equal action styling',()=>{
 const report=main.slice(main.indexOf('function showCommunityReport('),main.indexOf('function renderCommunity()'));
 assert.ok(report.includes("makeCEl('details','community-report-picker')"));
 assert.ok(!report.includes("createElement('select')"));
 assert.equal(report.split("'community-report-action'").length-1,2);
 assert.ok(report.includes('reportSharedCommunity(postId,commentId,selected)'));
});
test('anonymous reactions and bookmarks show visible login feedback before writes',()=>{
 assert.ok(main.includes("if(!await isCommunitySignedIn()){showCommunityLoginRequired(actions,'공감하려면 로그인해 주세요.');return;}"));
 assert.ok(main.includes("if(!await isCommunitySignedIn()){showCommunityLoginRequired(actions,'게시글을 저장하려면 로그인해 주세요.');return;}"));
 assert.ok(main.includes("note.setAttribute('role','status')"));
});
