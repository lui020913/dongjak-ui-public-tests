import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('help guide has no update UI, but retains app tour and map attribution',()=>{
 const html=read('index.html'),onboarding=read('src/v860-onboarding.js'),main=read('src/main.js');
 assert.doesNotMatch(html,/id="(?:version-history-modal|version-history-trigger|dj-guide-release-details|dj-guide-latest-version)"/);
 assert.doesNotMatch(read('src/mobile-chrome-v790.js'),/id="dj-mobile-history"/);
 assert.match(onboarding,/body\.insertBefore\(button,remember\|\|null\)/);
 assert.match(html,/id="dj-map-attribution-template"/);
 assert.match(read('src/v7120-settings.js'),/about\.querySelector\('\.dj-about-done'\)\?\.before\(credit\)/);
 assert.doesNotMatch(main,/initVersionHistory\(\)/);
});
test('only official bus timetable remains in station schedule, and route history is separate',()=>{
 const src=read('src/transport-map.js'),detail=read('src/bus-route-detail.js');
 assert.doesNotMatch(src,/appendObservedBusHistory|storeBusObservation/);
 assert.match(src,/첫차 예정','막차 예정/);
 assert.match(detail,/정류장별 실제 도착 이력/);
});
test('mobile metro schedule mode hides realtime rows, retains navigation and renders official rows',()=>{
 const generated=new URL('../src/mobile-next.css',import.meta.url);
 const css=existsSync(generated)?readFileSync(generated,'utf8'):read('../frontend/production/mobile-next.css'),src=read('src/transport-map.js');
 assert.match(css,/\[data-transport-view="hours"\] :is\(#transport-arrivals,#transport-neighbors,[^}]+\{display:none!important\}/);
 assert.match(css,/\[data-transport-view="hours"\] #transport-service-hours\{display:grid!important/);
 assert.match(src,/if\(place.kind==='subway'&&Array.isArray\(data.timetable\)&&data.timetable.length\)timetableExpanded=true/);
});
