import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MOBILE_SCALE_BLOCKERS,shouldHideMobileScale} from '../src/map-scale-docking.js';
import {MOBILE_FLOATING_SHEETS} from '../src/dj-v8212-sheet-controller.js';

const css=readFileSync(new URL('../src/v845-mobile-motion.css',import.meta.url),'utf8');
const motion=readFileSync(new URL('../src/v845-mobile-motion.js',import.meta.url),'utf8');
const docking=readFileSync(new URL('../src/map-scale-docking.js',import.meta.url),'utf8');
const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');

function visibleNode(){
 return {
  hidden:false,
  closest:()=>null,
  getBoundingClientRect:()=>({width:120,height:80,left:20,top:20,right:140,bottom:100})
 };
}

test('TIP is not a distance-scale blocker; visible map overlays still block the scale',()=>{
 assert.ok(!MOBILE_SCALE_BLOCKERS.includes('#dj840-map-tip'));
 const app={dataset:{tab:'map'},classList:{contains:()=>false}};
 const view={innerWidth:390,innerHeight:844,getComputedStyle:()=>({display:'block',visibility:'visible',opacity:'1'})};
 const tipOnlyDoc={querySelectorAll:()=>[]};
 assert.equal(shouldHideMobileScale(app,tipOnlyDoc,view),false);
 const sheet=visibleNode();
 const overlayDoc={querySelectorAll:selector=>selector==='#transport-sheet'?[sheet]:[]};
 assert.equal(shouldHideMobileScale(app,overlayDoc,view),true);
 assert.match(docking,/The map TIP is no longer/);
 assert.match(docking,/const visible=fitsBelowRail\|\|dockNight\|\|dock\.visible/);
});

test('full-screen primary pages still use the one shared native swipe controller',()=>{
 for(const id of ['participation-panel','news-panel','mine-panel']){
  assert.ok(MOBILE_FLOATING_SHEETS.some(([name])=>name===id));
  assert.ok(css.includes('#'+id));
 }
 assert.match(css,/\.dj-sheet-dragging:not\(\[hidden\]\)/);
 assert.match(css,/\.dj833-sheet-dismissing:not\(\[hidden\]\)/);
 assert.match(css,/var\(--dj-sheet-drag-y,0px\)/);
 assert.match(css,/110dvh/);
});

test('toolbar returns via opacity-only animation and respects reduced motion',()=>{
 assert.match(index,/v845-mobile-motion\.js/);
 assert.match(motion,/mapShortcutsShouldBeVisible/);
 assert.match(motion,/prefers-reduced-motion: reduce/);
 assert.match(motion,/toolbar\.style\.setProperty\('opacity',String\(alpha\),'important'\)/);
 assert.doesNotMatch(motion,/toolbar\.style\.setProperty\('transform'/);
});

test('profile and other primary sheets retain opaque backing to prevent WebKit black stripes',()=>{
 assert.match(css,/background-color:var\(--dj800-surface,#fff\)!important/);
 assert.match(css,/\.dj834-detail-content/);
 assert.match(css,/backdrop-filter:none!important/);
 assert.match(css,/-webkit-tap-highlight-color:transparent!important/);
});
