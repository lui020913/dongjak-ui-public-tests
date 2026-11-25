import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('notice view owns visibility of notifications, feed and map-report link',()=>{
 const s=read('src/main.js'),css=read('src/style.css');
 const view=s.slice(s.indexOf('function setCommunityNoticeView('),s.indexOf('function resetCommunityNotices('));
 assert.match(view,/panel\.hidden=!open/);
 assert.match(view,/\['community-list','participate-register'\]/);
 assert.match(view,/\.hidden=open/);
 assert.match(view,/getElementById\('community-list'\)\.replaceChildren\(\)/);
 assert.match(view,/else if\(wasOpen\)renderCommunity\(\)/);
 assert.match(s,/root\.replaceChildren\(\);\s*\/\/[^\n]+\n\s*if\(!document\.getElementById\('community-notifications'\)\.hidden\)return/);
 assert.match(read('src/mobile-ui/current.css'),/#community-list:not\(\[hidden\]\)\s*\{\s*order:0!important;display:grid!important/);
 assert.match(s,/setCommunityNoticeView\(panel\.hidden\)/);
 assert.match(s,/function openCommunityNoticesFromPush\(\)\{navigate\('participate'\);setCommunityNoticeView\(true\)/);
 assert.match(css,/#participation-panel #community-list\[hidden\],#participation-panel #participate-register\[hidden\]\{display:none!important\}/);
 assert.doesNotMatch(css,/#community-notifications:not\(\[hidden\]\)\{[^}]*max-height/);
});
test('notice actions have one shared geometry and card tags stay together',()=>{
 const s=read('src/main.js'),css=read('src/style.css');
 for(const label of ['읽음','이의제기','접수'])assert.ok(s.includes(label==='접수'?"'community-notice-action','접수'":"'"+label+"','community-notice-action'"));
 assert.match(s,/tags\.append\(cat\);if\(post\.dong\)tags\.append\(/);
 assert.match(s,/header\.append\(tags,meta\)/);
 assert.match(css,/\.community-post-tags\{display:flex;align-items:center;flex-wrap:wrap;gap:6px/);
 assert.match(css,/\.community-notice-action\{[^}]*min-height:44px;[^}]*border-radius:12px/);
});
test('native composer selects retain an explicit nonshrinking text box',()=>{
 const css=read('src/community-composer-portal.css');
 assert.match(css,/\.dj-compose-scroll>select\{\s*flex:0 0 auto!important;height:48px!important;min-height:48px!important;\s*line-height:normal!important;padding-block:0!important;\s*-webkit-text-fill-color:currentColor!important/);
});
