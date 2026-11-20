import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('nearby safety sheet uses the existing single sheet gesture owner on the visible header',()=>{
 const source=read('src/dj-v8212-sheet-controller.js');
 assert.match(source,/id==='ped-tools-panel'/);
 assert.match(source,/bindHeaderDragInput\(handleNodes\[0\],win,\{down,move,up,cancel\}\)/);
 assert.match(source,/bindHeaderDragInput\(panel,win,\{down,move,up,cancel\}\)/);
 assert.match(source,/setMobileSheetExpanded\(panel,true,doc,win\)/);
 assert.match(source,/sheetStageAction\(delta,g.velocity/);
});

test('onboarding fade actually reaches zero before replacing the old slide',()=>{
 const js=read('src/v860-onboarding.js');
 const css=read('../frontend/production/mobile-next.css');
 assert.match(js,/overlay\.classList\.add\('dj860-swapping'\)/);
 assert.match(js,/overlay\.classList\.remove\('dj860-swapping'\);\s*render\(target,direction\);\s*},190\)/);
 assert.match(css,/#dj860-onboarding\.dj860-swapping \.dj860-visual-pane/);
 assert.match(css,/opacity:0!important;animation:none!important/);
 assert.match(css,/transition:opacity 165ms/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
