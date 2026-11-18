import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {friendlyError} from '../src/v824-favorites-cloud.js';
import {stabilizePageHeaders} from '../src/v823-route-panel.js';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const html=read('index.html'),css=read('src/v829-mobile-layout-system.css');

test('mobile dock is lowered while panels follow the same nav offset token',()=>{
 assert.match(css,/--dj829-nav-bottom: max\(6px, calc\(env\(safe-area-inset-bottom, 0px\) - 22px\)\)/);
 assert.match(css,/--dj829-panel-bottom: calc\(var\(--dj829-nav-bottom\) \+ var\(--dj829-nav-h\) \+ 8px\)/);
 assert.match(css,/bottom:var\(--dj829-nav-bottom\)!important/);
 assert.match(css,/bottom:var\(--dj829-panel-bottom\)!important/);
});
test('five rebuilt news-style headers share one semantic structure and right-hand close',()=>{
 const rebuilt=read('src/v835-news-style-drawer.css');
 for(const id of ['route-panel','participation-panel','news-panel','mine-panel','admin-dong-picker']){
  const fragment=html.slice(html.indexOf(`id="${id}"`));
  const header=fragment.slice(fragment.indexOf('<header class="dj-sheet-chrome"'),fragment.indexOf('</header>'));
  const keys=['dj-sheet-chrome-grip','dj-sheet-chrome-title','dj-sheet-chrome-icon','<h2>','dj-sheet-chrome-close'];
  const positions=keys.map(key=>header.indexOf(key));
  assert.ok(positions.every(x=>x>=0),id);
  assert.deepEqual(positions,[...positions].sort((a,b)=>a-b),id);
  assert.doesNotMatch(header,/<p>/);
 }
 assert.match(rebuilt,/align-items:center!important/);
 assert.match(rebuilt,/max-height:min\(50dvh/);
});
test('native search placeholder is the sole hint, and old cloned map controls hidden',()=>{
 assert.doesNotMatch(read('src/v807-ui-refine.js'),/createElement\('span'\).*dj807-search-copy/);
 assert.match(css,/#dj-mobile-map-actions\{display:none!important/);
 assert.match(css,/\.map-actions > button::before/);
});
test('admin district title row and handle have stable center geometry',()=>{
 assert.match(css,/#admin-dong-picker \.admin-dong-heading::before\{/);
 assert.match(css,/transform:translateX\(-50%\)!important/);
 assert.match(css,/#admin-dong-picker #admin-dong-list\{/);
});
test('Supabase external-code failures are properly decoded and distinguished from local PKCE errors',()=>{
 assert.match(friendlyError({message:'Unable to exchange external code%3A uTMW'}),/카카오 인증코드를 Supabase 서버가 교환하지 못했습니다/);
 assert.match(friendlyError({message:'PKCE code verifier not found'}),/인증정보가 만료/);
});
