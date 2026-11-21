import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('expanded nearby utility card measures search/toolbar and stores its real safe top',()=>{
 const src=read('src/v889-mobile-sheet-motion.js');
 assert.match(src,/syncPedestrianExpandedBounds\(panel,doc,win\)/);
 assert.match(src,/getElementById\('map-quick-search'\)/);
 assert.match(src,/getElementById\('djNext-toolbar'\)/);
 assert.match(src,/getElementById\('bottom-nav'\)/);
 assert.match(src,/panel\.style\.setProperty\('top',top\+'px','important'\)/);
 assert.match(src,/clearPedestrianExpandedBounds\(panel\)/);
 assert.match(src,/const minDelta=safeTop-expandedRect\.top/);
 assert.match(src,/startDelta\.y=Math\.max\(startDelta\.y,minDelta\)/);
 assert.match(src,/endDelta\.y=Math\.max\(endDelta\.y,minDelta\)/);
});
test('onboarding retains the outgoing surface until the incoming image is decoded',()=>{
 const src=read('src/v860-onboarding.js');
 const css=read('src/v860-onboarding.css');
 assert.match(src,/function transitionSlide\(target,direction='next'\)/);
 assert.match(src,/holdOutgoingSlide\(\)/);
 assert.match(src,/preload\.decode\(\)/);
 assert.match(src,/render\(target,direction,false\)/);
 assert.match(css,/dj9266-retained-slide-out/);
 assert.doesNotMatch(src,/const fadeOut=\(\)=>/);
 assert.doesNotMatch(src,/opacity 170ms ease-in/);
});
test('paired bus arrival cards remain same-row after phone layout migrations',()=>{
 const src=read('src/mobile-ui/current.css');
 assert(src.includes('grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px!important;'));
 assert(!src.includes('grid-template-columns:repeat(auto-fit,minmax(min(100%,205px),1fr))'));
});
