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
 assert(idx<panel.indexOf('class="community-toolbar" role="group"'));
 assert.equal(panel.includes('class="community-heading-row"'),false);
 assert.equal((panel.match(/class="community-category-tabs"/g)||[]).length,1);
 for(const type of ['전체','보행 불편','개선 제안','동네 질문','동네생활'])assert(panel.includes('data-community-filter="'+type+'"'));
});

test('history presents categorical headings and keeps exact build metadata only in attributes',()=>{
 const ui=read('src/version-history-v7.js');
 assert(ui.includes('CHANGE_TYPE_GROUPS'));
 assert(ui.includes('classifyReleaseNote'));
 assert(ui.includes('dj-edition-history'));
 assert.match(ui,/dataset\.version/);
 assert.match(ui,/dataset\.archivedVersion/);
 assert(!ui.includes('현재 빌드: '));
 assert(!ui.includes("const versionHeading=el('h4','',displayVersion)"));
});

test('metro trains and beams require close zoom; bus retains its own threshold',()=>{
 const source=read('src/features/liveTransit/integrate.js');
 const layer=read('src/features/liveTransit/index.js');
 assert.match(source,/METRO_LIVE_MIN_ZOOM=13\.0/);
 assert.match(source,/minZoom:13\.2,metroMinZoom:METRO_LIVE_MIN_ZOOM,intervalMs:60000/);
 assert.match(layer,/minzoom:metroMinZoom/);
 assert.match(layer,/TRAIN_BEAM_LAYER/);
 assert.match(layer,/minzoom:minimumZoom/);
});

test('onboarding crossfades retained painted slides and cancels stale transitions',()=>{
 const js=read('src/v860-onboarding.js'),css=read('src/v860-onboarding.css');
 assert.match(js,/function transitionSlide\(/);
 assert.match(js,/holdOutgoingSlide\(\)/);
 assert.match(js,/clearSlideGhosts\(\)/);
 assert.match(js,/swapEpoch\+\+/);
 assert.match(js,/if\(epoch!==swapEpoch\|\|!opened\)return/);
 assert.match(js,/preload\.decode\(\)/);
 assert.match(js,/render\(target,direction,false\)/);
 assert.match(css,/dj9266-retained-slide-out/);
 assert.doesNotMatch(js,/node\.style\.setProperty\('opacity','0','important'\)/);
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
