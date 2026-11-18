import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resetMapDisplay,DEFAULT_BASE_LAYERS} from '../src/v833-home-reset.js';
import {friendlyError} from '../src/v824-favorites-cloud.js';
const src=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');

test('home sits in actual center nav slot; district entry is only under options',()=>{
  const html=src('index.html');
  const nav=html.match(/<nav id="bottom-nav"[\s\S]*?<\/nav>/)?.[0];
  assert.ok(nav);
  const order=[...nav.matchAll(/data-tab="([^"]+)"/g)].map(x=>x[1]);
  assert.deepEqual(order,['route','participate','map','news','mine']);
  const options=html.indexOf('id="map-advanced-controls"');
  const picker=html.indexOf('id="admin-dong-picker"');
  const overview=html.indexOf('id="overview-sheet"');
  const original=html.indexOf('id="open-admin-dongs"');
  assert.ok(options<original&&original<overview&&overview<picker);
  assert.match(html,/id="open-admin-dongs-from-options"/);
});

test('all four tabs and district use the same icon/title/right-close shared layout',()=>{
  const css=src('src/v833-home-sheet-layout.css');
  const html=src('index.html');
  const headerCss=src('src/v829-mobile-layout-system.css');
  assert.match(headerCss,/display:flex!important;flex-flow:row nowrap!important/);
  assert.match(src('src/v835-news-style-drawer.css'),/\.dj-sheet-chrome-grip/);
  assert.doesNotMatch(css,/grid-column:3!important;grid-row:1!important/);
  assert.match(css,/max-height:min\(50dvh/);
  assert.match(css,/dj833-sheet-dismissing/);
  for(const id of ['route-panel','participation-panel','news-panel','mine-panel']){
    assert.match(html,new RegExp('id="'+id+'"'));
  }
  assert.match(html,/id="admin-dong-picker"[\s\S]*?class="dj-sheet-chrome"[\s\S]*?<h2>행정동 선택/);
  assert.match(html,/v833-home-sheet-layout.css/);
  assert.match(html,/v833-home-reset.js/);
});

test('home restores base overlays through existing button events without deleting user data',()=>{
  const elements=new Map();
  const pressed=(pressed)=>({disabled:false,clicks:0,attributes:{'aria-pressed':String(pressed)},getAttribute(name){return this.attributes[name];},click(){this.clicks++;this.attributes['aria-pressed']=this.attributes['aria-pressed']==='true'?'false':'true';}});
  for(const layer of DEFAULT_BASE_LAYERS)elements.set(`[data-base-layer="${layer}"]`,pressed(false));
  const optional=pressed(true);
  const all={classList:{contains:()=>false},clicks:0,click(){this.clicks++;}};
  let events=0,home=0;
  const app={classList:{contains:()=>false},dataset:{}};
  const doc={
    getElementById(id){if(id==='app')return app;if(id==='overview-sheet')return {hidden:false};if(id==='center-dongjak')return {click(){home++;}};return null;},
    querySelector(sel){return elements.get(sel)|| (sel==='[data-filter="전체"]'?all:null);},
    querySelectorAll(sel){return sel==='[data-dj-import]'?[optional]:[];},
    dispatchEvent(){events++;}
  };
  const state=resetMapDisplay(doc,{});
  assert.equal(state.restored,5);
  assert.equal(home,1);
  assert.equal(events,1);
  assert.equal(all.clicks,1);
  for(const btn of elements.values())assert.equal(btn.clicks,1);
  assert.equal(optional.clicks,1);
  assert.doesNotMatch(src('src/v833-home-reset.js'),/localStorage\.(clear|removeItem)|sessionStorage\.(clear|removeItem)/);
});

test('Kakao server grant errors remain diagnosed instead of silently marked as login success',()=>{
  assert.match(friendlyError({message:'Unable to exchange external code%3A uTMW'}),/Supabase 서버가 교환하지 못했습니다/);
  const source=src('src/v824-favorites-cloud.js');
  assert.match(source,/kakaoSignIn.disabled=true;kakaoFallback.disabled=true;linkKakao.disabled=true/);
  assert.match(source,/logs\/auth-logs/);
  assert.match(source,/if\(response.error\)throw response.error/);
});
