import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {installMyInfoPanelRecovery} from '../src/v834-my-info.js';
const file=n=>readFileSync(new URL('../'+n,import.meta.url),'utf8');
const mainTabs=['route-panel','participation-panel','news-panel','mine-panel'];

test('all mobile sheet headers physically order handle, icon, heading, then close',()=>{
  const html=file('index.html');
  for(const id of mainTabs){
    const start=html.indexOf(`<main id="${id}"`);
    assert.ok(start>0,id);
    const header=html.slice(html.indexOf('<header class="dj-sheet-chrome',start),html.indexOf('</header>',start));
    const parts=['dj-sheet-chrome-grip','dj-sheet-chrome-title','dj-sheet-chrome-icon','<h2>','dj-sheet-chrome-close'];
    const positions=parts.map(s=>header.indexOf(s));
    assert.ok(positions.every(n=>n>=0),`${id} missing part`);
    assert.deepEqual(positions,[...positions].sort((a,b)=>a-b),`${id} DOM order`);
  }
});

test('one mobile CSS owner, genuine grabber and common half-height',()=>{
 const mobile=file('src/v829-mobile-layout-system.css');
 const contract=file('src/v833-home-sheet-layout.css');
 const legacy=file('src/v824-mobile-sheet-and-keyboard.css');
 assert.match(file('src/v835-news-style-drawer.css'),/\.dj-sheet-chrome-grip/);
 assert.match(file('src/v835-news-style-drawer.css'),/button\.dj-sheet-chrome-close/);
 assert.match(file('src/v835-news-style-drawer.css'),/justify-content:space-between!important/);
 assert.match(mobile,/--dj829-sheet-max-height: 50dvh/);
 assert.match(contract,/max-height:min\(50dvh/);
 assert.doesNotMatch(contract,/grid-template-columns:28px minmax\(0,1fr\) 44px!important/);
 assert.doesNotMatch(legacy,/height:min\(61dvh,520px\)!important/);
 assert.doesNotMatch(file('src/v823-route-panel.css'),/height:min\(73dvh,650px\)!important/);
});

test('my info selected-tab recovery works without Supabase account initialization',()=>{
 const actions={};
 const app={dataset:{tab:'mine'}};
 const panel={hidden:true};
 const modal={hidden:true};
 const nav={dataset:{},addEventListener:(name,fn)=>{actions[name]=fn;},removeEventListener:(name)=>{delete actions[name];}};
 const doc={getElementById:id=>id==='app'?app:id==='mine-panel'?panel:id==='dj-map-settings'?modal:null,
   querySelector:selector=>selector.includes('data-tab="mine"')?nav:null};
 const win={requestAnimationFrame:fn=>fn()};
 const unmount=installMyInfoPanelRecovery(doc,win);
 assert.equal(nav.dataset.dj834Recovery,'true');
 actions.click();assert.equal(panel.hidden,false);
 panel.hidden=true;modal.hidden=false;actions.click();assert.equal(panel.hidden,true);
 modal.hidden=true;app.dataset.tab='map';actions.click();assert.equal(panel.hidden,true);
 unmount();assert.equal(actions.click,undefined);
});

test('repeat tap suppression lets native navigation reopen a hidden selected sheet',()=>{
 const source=file('src/v806-unified-ui.js');
 assert.match(source,/A selected tab with a hidden sheet is a broken state/);
 assert.match(source,/\(!linked\|\|visible\(panelId\)\)/);
});
