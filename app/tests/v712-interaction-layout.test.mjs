import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('v7.0.29 short weather/theme/version chips retain larger search surface',()=>{
 const css=read('src/mobile-ui-baseline.css');
 assert.match(css,/--dj-header-mini-h:40px/);
 assert.match(css,/\.weather-widget/);
 assert.match(css,/\.version-history-trigger/);
 assert.match(read('src/main.js'),/import '\.\/mobile-ui-baseline\.css'/);
});
test('guide close is captured and prevents the opening timer from reopening the dialog',()=>{
 const source=read('src/mobile-map-controls.js');
 assert.match(source,/guideDismissedThisSession/);
 assert.match(source,/onGuideClose=\(event\)=>\{[^}]*stopPropagation/);
 assert.match(source,/close\?\.addEventListener\('click',onGuideClose,\{capture:true\}\)/);
});
test('map option launchers stay visible; their width tracks navigation rail',()=>{
 const css=read('src/mobile-ui-baseline.css');
 assert.match(css,/\.map-controls-open #map-safety-toggle/);
 assert.match(css,/\.map-controls-open #night-visibility-quick-off:not\(\[hidden\]\)/);
 assert.match(css,/--dj-rail-btn-w/);
 assert.match(read('src/pedestrian-tools.js'),/style\.setProperty\('--dj-rail-btn-w'/);
});
test('scale sits in the desktop bottom-left corner while mobile still computes around visible overlays',()=>{
 const source=read('src/map-scale-docking.js');
 assert.match(source,/const railBottom=/);
 assert.match(source,/const railBelow=/);
 assert.match(source,/const desktopBottomInset=14/);
 assert.match(source,/const desktopLeftInset=14/);
 assert.match(source,/applyImportant\(scale,'bottom',`\$\{desktopBottomInset\}px`\)/);
 assert.match(source,/applyImportant\(scale,'left',`\$\{desktopLeftInset\}px`\)/);
});
test('station popup left on desktop and map centers Jangseungbaegi',()=>{
 const source=read('src/transport-map.js');
 assert.match(source,/normalizeStationQueryName\(place.name\)==='장승배기'/);
 assert.match(source,/panel\.dataset\.stationFocus/);
 assert.match(source,/map\.easeTo\?\.\(\{center:\[Number\(place.lng\),Number\(place.lat\)\]/);
 const css=read('src/mobile-ui-baseline.css');
 assert.match(css,/data-station-focus="left"/);
});
test('home restores north and level, overview opens expanded',()=>{
 const source=read('src/main.js');
 assert.match(source,/let overviewSheetState = 'expanded'/);
 assert.match(source,/maxZoom:13,duration:800,pitch:0,bearing:0/);
 assert.match(source,/zoom:12\.5,pitch:0,bearing:0/);
});
