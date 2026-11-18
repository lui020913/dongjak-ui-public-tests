import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DEFAULT_BASE_LAYERS,closeMapWindows,installSafetyHomeTab} from '../src/v833-home-reset.js';
const read=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const html=read('index.html');
const sheets=['route-panel','participation-panel','news-panel','mine-panel','admin-dong-picker'];

test('v836: every primary sheet has a fixed header and a distinct scroll body',()=>{
  for(const id of sheets){
    const start=html.indexOf(`id="${id}"`);
    assert.ok(start>0,id);
    const header=html.slice(start,html.indexOf('</header>',start));
    assert.match(header,/dj836-edge-drag/);
    const after=html.slice(html.indexOf('</header>',start),html.indexOf('</main>',start)>0&&id!=='admin-dong-picker'?html.indexOf('</main>',start):html.indexOf('</section>',start));
    assert.match(after,/<div class="dj836-sheet-body">/);
  }
  const css=read('src/v836-sheet-toolbar-controls.css');
  assert.match(css,/overflow:hidden!important/);
  assert.match(css,/overscroll-behavior-y:contain!important/);
  assert.match(css,/height:25px!important/);
});

test('v836: one permanent district shortcut and configurable road width in More',()=>{
  const src=read('src/v831-swipe-feature-toolbar.js');
  assert.match(src,/\['map-road-width','도로폭 추정 레이어'/);
  assert.match(src,/key==='map-dong'\|\|primary.has\(key\)/);
  assert.match(src,/featureMap.get\('map-dong'\)/);
  assert.doesNotMatch(read('src/v829-mobile-layout-system.css'),/not\(\[data-tab="map"\]\) #dj-v794-toolbar\s*\{\s*display:none/);
  assert.match(read('src/v836-sheet-toolbar-controls.css'),/\.map-actions > #toggle-road-width\{display:none!important/);
});

test('v836: one click closes, a quick second click resets; no first-click reset',async()=>{
  const state={dataset:{tab:'map'},classList:{contains:()=>false}};
  let resetCalls=0;
  let capture=null;
  const home={setAttribute(){}};
  const panel={hidden:false,querySelector:()=>null};
  const doc={
    getElementById(id){if(id==='app')return state;if(id==='overview-sheet')return panel;if(id==='center-dongjak')return {click(){resetCalls++;}};return null;},
    querySelector(sel){if(sel.includes('nav-tab[data-tab="map"]'))return home;return null;},
    querySelectorAll(){return [];},
    addEventListener(event,fn){if(event==='click')capture=fn;},
    removeEventListener(){},
    dispatchEvent(){},
  };
  const win={performance:{now(){return win.t;}},queueMicrotask(fn){fn();},t:1000};
  const remove=installSafetyHomeTab(doc,win);
  const event={target:{closest:()=>home},stopImmediatePropagation(){},preventDefault(){}};
  capture(event);
  assert.equal(panel.hidden,true);
  assert.equal(resetCalls,0);
  win.t=1500;
  capture(event);
  assert.equal(resetCalls,1);
  remove();
  assert.ok(DEFAULT_BASE_LAYERS.includes('bus'));
});
