import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('PC responsive styles and desktop-only UI trees are not loaded',()=>{
 const html=read('index.html'),main=read('src/main.js'),css=read('src/mobile-first-layout.css');
 assert.equal(html.includes('v853-pc-responsive-fixes.css'),false);
 assert.equal(html.includes('v815-pc-visual-fixes.css'),false);
 assert.equal(main.includes('v881-desktop-ui.css'),false);
 assert.equal(main.includes('v881-tablet-workspace.css'),false);
 assert.equal(main.includes('installDesktopSafetyRail('),false);
 assert.ok(css.includes('#bottom-nav:not([hidden])'));
 assert.ok(css.includes('#route-panel,#participation-panel,#news-panel,#mine-panel'));
});

test('facility detail uses one draggable sheet presentation at every viewport',()=>{
 const detail=read('src/place-details.js'),css=read('src/mobile-first-layout.css');
 assert.ok(detail.includes('const sharedSheet=true'));
 assert.ok(detail.includes("maxWidth:'min(520px, calc(100vw - 24px))'"));
 assert.ok(detail.includes("anchor:'top'"));
 // Folder selector remains hidden until the facility is actually saved.
 assert.ok(detail.includes('folderWrap.hidden=!isPlaceSaved(p)'));
 assert.ok(detail.includes('folderSection.hidden=folderWrap.hidden'));
 assert.ok(detail.includes('folderWrap.hidden=!saved;folderSection.hidden=!saved'));
 assert.equal(detail.includes('desktopDetail'),false);
 assert.equal(detail.includes("matchMedia?.('(min-width:1080px)')"),false);
 assert.equal(detail.includes("matchMedia?.('(max-width:1079px)')"),false);
 assert.ok(css.includes('.maplibregl-popup.dj-place-detail-popup'));
 assert.ok(css.includes('.dj-place-edge-drag'));
});

test('transit marker sizing and map camera focus use the same mobile-first geometry',()=>{
 const transport=read('src/transport-map.js');
 assert.ok(transport.includes('usableMapSelectionOffset'));
 assert.ok(transport.includes('syncSharedBusPresentation'));
 assert.ok(transport.includes("setLayoutProperty('transport-bus-names','text-offset',[0,1.4])"));
 assert.ok(transport.includes("setLayoutProperty('transport-bus-names-close','text-offset',[0,1.4])"));
 assert.equal((transport.match(/'text-offset':\[0,1\.4\]/g)||[]).length,3,'all three bus stop label paths use the closer offset');
 assert.equal(transport.includes("'text-offset':[0,1.85]"),false,'no stale bus label clearance');
 assert.equal(transport.includes("matchMedia?.('(min-width:1080px)')"),false);
 assert.equal(transport.includes("matchMedia?.('(max-width:1079px)')"),false);
});

test('weather and feature categories remain available in the shared toolbar',()=>{
 const html=read('index.html'),weather=read('src/v854-weather-desktop.js'),poi=read('src/v912-poi-presentation.js');
 assert.ok(html.includes('mobile-toolbar-v794.js'));
 assert.ok(html.includes('v831-swipe-feature-toolbar.js'));
 assert.ok(weather.includes("matchMedia('(min-width: 0px)')"));
 assert.ok(poi.includes("const MOBILE_TOOLBAR_MEDIA='(min-width: 0px)'"));
});
