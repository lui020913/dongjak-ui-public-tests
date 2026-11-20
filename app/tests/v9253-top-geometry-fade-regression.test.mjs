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
});
test('onboarding fades render on distinct frames rather than coalescing same-task opacities',()=>{
 const src=read('src/v860-onboarding.js');
 assert.match(src,/function transitionSlide\(target,direction='next'\)/);
 assert.match(src,/const fadeOut=\(\)=>/);
 assert.match(src,/requestAnimationFrame\(fadeOut\)/);
 assert.match(src,/const fadeIn=\(\)=>/);
 assert.match(src,/requestAnimationFrame\(fadeIn\)/);
 assert.match(src,/opacity 170ms ease-in/);
 assert.match(src,/opacity 200ms cubic-bezier/);
});
test('paired bus arrival cards remain same-row after phone layout migrations',()=>{
 const src=read('src/v910-request-completion.css');
 assert(src.includes('grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px!important;'));
 assert(!src.includes('grid-template-columns:repeat(auto-fit,minmax(min(100%,205px),1fr))'));
});
