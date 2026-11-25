import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeBusServiceKey} from '../src/bus-service-key.js';
import {featuredPlaceCollection} from '../src/featured-place-labels.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('v7.0.29 encoded public-data key is decoded exactly once',()=>{
 assert.equal(normalizeBusServiceKey('abc%2Bdef%2Fghi%3D'),'abc+def/ghi=');
 assert.equal(normalizeBusServiceKey('abc+def/ghi='),'abc+def/ghi=');
 assert.match(read('server/transport-proxy.mjs'),/normalizeBusServiceKey\(process\.env\.SEOUL_BUS_SERVICE_KEY\)/);
 assert.match(read('functions/api/transport/[[path]].js'),/normalizeSharedBusServiceKey/);
});
test('v7.0.29 the desktop rail moves real controls, not cloned buttons',()=>{
 const module=read('src/v713-desktop-rail.js');
 assert.match(module,/minWidth=1080/);
 assert.match(module,/section\.append\(el\)/);
 assert.match(module,/slots\[i\]\.parentNode\.insertBefore/);
 const css=read('src/mobile-ui-baseline.css');
 assert.match(css,/#dj-desktop-safety-rail/);
 assert.match(css,/@media \(max-width:699px\)/);
});
test('v7.0.29 scale paints in the desktop bottom-left corner and keeps the MapLibre control margin zero',()=>{
 const js=read('src/map-scale-docking.js'),css=read('src/mobile-ui-baseline.css');
 assert.match(js,/const desktopBottomInset=14/);
 assert.match(js,/const desktopLeftInset=14/);
 assert.match(js,/applyImportant\(scale,'bottom',`\$\{desktopBottomInset\}px`\)/);
 assert.match(js,/applyImportant\(scale,'left',`\$\{desktopLeftInset\}px`\)/);
 assert.match(css,/\.maplibregl-ctrl-scale\{margin:0!important/);
});
test('v7.0.29 Soongsil symbol and title share one moved map point',()=>{
 const feature=featuredPlaceCollection().features.find(f=>f.properties.name==='숭실대학교');
 assert.ok(feature && feature.geometry.coordinates[0]>126.955);
 const code=read('src/featured-place-labels.js');
 assert.match(code,/'icon-offset':\[0,0\]/);
 assert.match(code,/'text-anchor':'bottom'/);
 assert.match(code,/'text-offset':\[0,-1\.15\]/);
});
test('v7.0.29 overview no longer exposes the unnecessary collapse button',()=>{
 assert.doesNotMatch(read('index.html'),/id="overview-sheet-toggle"/);
 assert.match(read('index.html'),/id="overview-sheet-close"/);
});
