import {test} from 'node:test';import assert from 'node:assert/strict';
import {dockClearance} from '../src/v910-request-completion.js';
test('dock clearance uses the actual navigation edge in a resized viewport',()=>{
 assert.equal(dockClearance(844,754),98);assert.equal(dockClearance(768,674),102);
 assert.equal(dockClearance(844,NaN),88);assert.equal(dockClearance(844,0),88);
});

test('transport decorative edge cannot intercept controls and real drag owners remain',async()=>{
 const {readFileSync}=await import('node:fs');
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
 const css=read('src/mobile-ui/current.css'),controller=read('src/dj-v8212-sheet-controller.js');
 const assert=(await import('node:assert/strict')).default;
 assert.match(css,/#app #transport-sheet \.dj856-transport-edge-drag\s*\{pointer-events:none!important/);
 assert.match(controller,/handleNodes=\[header\]/);
 assert.match(controller,/const grip=panel\.querySelector\(':scope > \.handle'\)/);
 assert.match(controller,/if\(event.target.closest\?\.\(INTERACTIVE\)\)return/);
});

test('compact transport grip stays centered despite legacy oversize minimum width',async()=>{
 const {readFileSync}=await import('node:fs');
 const css=readFileSync(new URL('../src/mobile-ui/current.css',import.meta.url),'utf8');
 assert.match(css,/#app #transport-sheet > \.handle \{[^}]*width:100%!important;min-width:0!important;max-width:100%!important;[^}]*align-self:center!important/);
 assert.match(css,/#app #transport-sheet > \.handle::after \{[^}]*left:50%!important;[^}]*translate:-50% 0!important/);
});
test('explicit compact entrance is consumed only by an actual visible winner, never replayed over an active animation',async()=>{
 const {readFileSync}=await import('node:fs');
 const source=readFileSync(new URL('../src/v806-unified-ui.js',import.meta.url),'utf8');
 assert.match(source,/entranceIntent\.set\(requested,Date.now\(\)\+3000\)/);
 assert.match(source,/const realOpen=now&&id===activeSurface/);
 assert.match(source,/const requested=realOpen&&intent>Date.now\(\)/);
 assert.match(source,/if\(realOpen&&\(!was\|\|requested\)\)\{[\s\S]*?if\(!activeAnimation.has\(target\)\)playOpen\(id\)/);
 assert.match(source,/opening&&!doc.hidden\?4500:1600/);
});

test('wide coarse-pointer tablets inherit the compact shell geometry and webapp advice hides the legacy tip',async()=>{
 const {readFileSync}=await import('node:fs');
 const css=readFileSync(new URL('../src/mobile-ui/current.css',import.meta.url),'utf8');
 const compactMedia='@media (max-width:1079px), (min-width:1080px) and (max-width:1366px) and (pointer:coarse)';
 assert.ok(css.split(compactMedia).length>=5);
 assert.match(css,/data-dj-webapp-tip-visible="true"\] :is\(#dj840-map-tip,#dj-user-tip-close\) \{display:none!important/);
});
test('explicit place selection may open after a transport close without allowing stale popup mutations',async()=>{
 const {readFileSync}=await import('node:fs');
 const source=readFileSync(new URL('../src/v806-unified-ui.js',import.meta.url),'utf8');
 assert.match(source,/on\(win,'dongjak:map-place-selected'/);
 assert.match(source,/lifecycle.requestOpen\('maplibre-popup',\{origin:'automatic',explicit:explicitPopup\}\)/);
 assert.match(source,/explicitUntil.delete\('maplibre-popup'\)/);
});

test('phone toolbar has equal compact sizes, a real scroll cue and the unchanged full accessible district label',async()=>{
 const {readFileSync}=await import('node:fs');const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
 const css=read('src/mobile-ui/current.css'),toolbar=read('src/v831-swipe-feature-toolbar.js');
 assert.match(css,/--dj910-tool-width:52px/);
 assert.match(css,/#dj-v794-toolbar > #dj-v794-more \{flex:0 0 52px!important;width:52px!important/);
 assert.match(toolbar,/scrollCue\.addEventListener\('click'/);
 assert.match(toolbar,/scrollCue\.hidden=!hasViewport\|\|remain<=3/);
 assert.match(toolbar,/'map-dong':'행정동'/);
 assert.match(toolbar,/btn\.setAttribute\('aria-label',label\)/);
});
test('mobile HUD follows the actual dock and stays hidden throughout the outgoing More animation',async()=>{
 const {readFileSync}=await import('node:fs');const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
 assert.match(read('src/mobile-ui/current.css'),/bottom:max\(3px,calc\(env\(safe-area-inset-bottom,0px\) - 16px\)\)!important/);
 assert.match(read('src/map-scale-docking.js'),/const hudHeight=window\.innerWidth<700\?38:44/);
 assert.match(read('src/v910-request-completion.js'),/classList\.contains\('dj870-more-leaving'\)/);
 assert.match(read('src/map-scale-docking.js'),/app\.dataset\.dj910SheetOpen==='true'/);
});
test('competing compact surfaces terminate synchronously and More has one entrance owner',async()=>{
 const {readFileSync}=await import('node:fs');const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
 assert.match(read('src/v806-unified-ui.js'),/panelHide\(id,\{immediate:phone\(\)\}\)/);
 assert.match(read('src/mobile-chrome-v790.js'),/app\.dataset\.dj806Motion==='on'&&media\.matches/);
 assert.match(read('src/place-details.js'),/dj912ImmediateDismiss==='true'/);
 assert.match(read('src/v831-swipe-feature-toolbar.js'),/dongjak:close-more',\{detail:\{immediate:true\}/);
 assert.match(read('src/mobile-toolbar-v794.js'),/dj912WeatherIcon/);
});
