import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {nearbyExpandedHeight} from '../src/nearby-sheet-drag.js';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('nearby compact card leaves search and toolbar space when expanding',()=>{
 const p=nearbyExpandedHeight({viewportHeight:1100,topOfTools:250,navTop:1000});
 assert(p>600&&p<760);
 assert.equal(nearbyExpandedHeight({viewportHeight:600,topOfTools:180,navTop:500}),302);
 assert(nearbyExpandedHeight({viewportHeight:340,topOfTools:140,navTop:300})>=180);
 const owner=read('src/pedestrian-tools.js');
 assert.match(owner,/installNearbySheetDrag\(/);
 assert.match(owner,/disposeNearbyDrag\(\)/);
 const drag=read('src/nearby-sheet-drag.js');
 assert.match(drag,/bindHeaderDragInput\(/);
 assert.match(drag,/sheetStageAction\(/);
 assert.match(drag,/dj-ped-expanded/);
 assert.doesNotMatch(drag,/setMobileSheetExpanded/);
});

test('mobile browser measures the actual search row before setting toolbar position',()=>{
 const js=read('src/mobile-browser-layout.js');
 assert.match(js,/topbar\?\.getBoundingClientRect/);
 assert.match(js,/Math\.ceil\(headerRect\.bottom\+8\)/);
 assert.match(js,/ResizeObserver/);
 const css=read('src/v860-onboarding.css');
 assert.match(css,/dj9252-onboarding-fade-in/);
 assert.match(css,/dj9252-changing/);
 const renderer=read('src/v860-onboarding.js');
 assert.match(renderer,/goToSlide\(/);
 assert.match(renderer,/dj9252-changing/);
 assert.match(renderer,/moveTimer/);
});

test('community categories become the first item below the sheet title',()=>{
 const source=read('src/main.js');
 assert.match(source,/communitySheetBody\.prepend\(communityTabs\)/);
 assert.match(source,/communitySheetBody=document\.querySelector/);
 const css=read('../frontend/production/mobile-next.css');
 assert.match(css,/\.dj836-sheet-body>\.community-category-tabs/);
 assert.match(css,/dj-ped-expanded/);
});

test('moving subway train and its headlight beams are hidden at wide map zoom',()=>{
 const control=read('src/features/liveTransit/integrate.js');
 const layers=read('src/features/liveTransit/index.js');
 assert.match(control,/minZoom:13\.2,metroMinZoom:16\.4,intervalMs:60000/);
 assert.match(layers,/LIVE_METRO_LAYER,type:'symbol',source:LIVE_SOURCE,minzoom:metroMinZoom/);
 assert.match(layers,/TRAIN_BEAM_LAYER,type:'symbol',source:LIVE_SOURCE,minzoom:metroMinZoom/);
 assert.match(layers,/LIVE_BUS_LAYER,type:'circle',source:LIVE_SOURCE,minzoom:minimumZoom/);
});
