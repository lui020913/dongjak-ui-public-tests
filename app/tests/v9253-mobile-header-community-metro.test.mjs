import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
// Public CI reads the canonical stylesheet, while the protected release
// archive includes a generated copy under src/mobile-next.css.
const copy=new URL('../src/mobile-next.css',import.meta.url);
const canonical=new URL('../../frontend/production/mobile-next.css',import.meta.url);
const mobileCss=readFileSync(existsSync(copy)?copy:canonical,'utf8');

test('community categories lead the page before sort/search controls',()=>{
 const panel=read('index.html').split('<main id="participation-panel"')[1]?.split('</main>')[0];
 assert(panel,'community panel exists');
 const idx=panel.indexOf('class="community-category-tabs"');
 assert(idx>0);
 assert(idx<panel.indexOf('class="dj-page-intro"'));
 assert(idx<panel.indexOf('id="community-search"'));
 assert(idx<panel.indexOf('class="community-heading-row"'));
 assert.equal((panel.match(/class="community-category-tabs"/g)||[]).length,1);
 for(const type of ['전체','보행 불편','개선 제안','동네 질문','동네생활'])assert(panel.includes('data-community-filter="'+type+'"'));
});

test('history uses two-part headings while retaining exact build metadata',()=>{
 const ui=read('src/version-history-v7.js');
 const label=v=>v.replace(/^v?(\d+)\.(\d+)(?:\.\d+)?$/,'v$1.$2');
 assert.equal(label('v9.2.53'),'v9.2');assert.equal(label('v1.0.0'),'v1.0');
 assert(ui.includes('const editionOf=version=>String(version).replace('));
 assert(ui.includes('const editionFor=entry=>'));
 assert(ui.includes('dj-edition-minor'));
 assert(ui.includes('dj-edition-patch'));
 assert.match(ui,/dataset\.version=String\(release\.version/);
 assert.match(ui,/현재 빌드: /);
 assert(!ui.includes("const versionHeading=el('h4','',displayVersion)"));
});

test('metro trains and beams require close zoom; bus retains its own threshold',()=>{
 const source=read('src/features/liveTransit/integrate.js');
 const layer=read('src/features/liveTransit/index.js');
 assert.match(source,/minZoom:13\.2,metroMinZoom:16\.4,intervalMs:60000/);
 assert.match(layer,/minzoom:metroMinZoom/);
 assert.match(layer,/TRAIN_BEAM_LAYER/);
 assert.match(layer,/minzoom:minimumZoom/);
});

test('onboarding crossfades on slide navigation and cancels stale transitions',()=>{
 const js=read('src/v860-onboarding.js'),css=read('src/v860-onboarding.css');
 assert.match(js,/function transitionSlide\(/);
 assert.match(js,/classList\.add\('dj860-swapping'\)/);
 assert.match(js,/classList\.remove\('dj860-swapping'\)/);
 assert.match(js,/swapEpoch\+\+/);
 assert.match(js,/node\.style\.setProperty\('opacity','0','important'\)/);
 assert.match(js,/node\.style\.setProperty\('opacity','1','important'\)/);
 // The outgoing fade must actually start before the 205ms slide swap timer.
 // Otherwise under load a timeout can replace both slides without a painted fade.
 const fadeBlock=js.split('const fadeOut=()=>{')[1]?.split("if(typeof win.requestAnimationFrame==='function')win.requestAnimationFrame(fadeOut)")[0];
 assert(fadeBlock?.includes('swapTimer=win.setTimeout('));
 assert(fadeBlock?.includes("node.style.setProperty('opacity','0','important')"));
 assert.match(js,/let fadeStarted=false;/);
 assert.match(js,/if\(fadeStarted\|\|epoch!==swapEpoch\|\|!opened\)return;/);
 assert.match(js,/win\.setTimeout\(fadeOut,32\)/);
 assert.match(css,/\.dj860-onboarding\.dj860-swapping/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});

test('nearby sheet has one document-level drag owner, expands and keeps search header visible',()=>{
 const controller=read('src/dj-v8212-sheet-controller.js');
 assert.doesNotMatch(controller,/\['ped-tools-panel','\.ped-tools-panel-head','#ped-tools-close'\]/);
 const nearby=read('src/pedestrian-tools.js');
 assert.match(nearby,/bindHeaderDragInput\(document,window/);
 assert.match(nearby,/nearbyHeader\.getBoundingClientRect\(\)/);
 assert.match(nearby,/event\.clientX<rect\.left\+4/);
 assert.match(nearby,/move\(event\)\{\s*checkNearbyUpward\(event\);/);
 assert.match(nearby,/setMobileSheetExpanded\(panel,false,document,window\)/);
 assert.match(nearby,/panel\.querySelector\('#ped-tools-close'\)\?\.click\(\)/);
 assert.match(nearby,/setMobileSheetExpanded\(panel,true,document,window\)/);
 assert.match(mobileCss,/#ped-tools-panel\.dj871-sheet-expanded:not\(\[hidden\]\)/);
 assert.match(mobileCss,/#ped-tools-panel\[data-nearby-mode="empty"\]:not\(\.dj871-sheet-expanded\)/);
 assert.match(mobileCss,/:has\(#ped-tools-panel:not\(\[hidden\]\)\) > \.topbar/);
 assert.match(mobileCss,/grid-template-columns:minmax\(0,1fr\) 62px!important/);
});
