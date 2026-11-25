import {inLegacyOrder} from './legacy-css-baseline-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {busLastServiceStatus} from '../src/bus-last-service.js';
const read=p=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');

// No inferred actual GPS stop passage: direct provider flag or a labelled planned schedule only.
test('bus last-service status distinguishes reported termination from planned last-time expiry',()=>{
  assert.deepEqual(busLastServiceStatus({passed:true,last:'23:45'},{minute:720}),
    {kind:'provider-confirmed',message:'운영기관 안내: 해당 노선 운행 종료'});
  const elapsed=busLastServiceStatus({last:'23:30'},{minute:1435,afterMidnight:false});
  assert.equal(elapsed.kind,'planned-past');
  assert.match(elapsed.message,/시간표 기준/);
  assert.match(elapsed.message,/실제 정류장 통과 여부 미확인/);
  assert.equal(busLastServiceStatus({last:'23:30'},{minute:1400}),null);
  assert.equal(busLastServiceStatus({last:'00:30 (+1일)'},{minute:1400}),null);
  assert.equal(busLastServiceStatus({last:'23:30'},{minute:45,afterMidnight:true}),null);
  assert.equal(busLastServiceStatus({last:'확인 불가'},{minute:1430}),null);
});

test('all four auxiliary pages have X controls and explicit map-return behavior',()=>{
  const html=read('index.html');
  for(const name of ['route','participate','mine']){
    assert.match(html,new RegExp(`data-close-page="${name}"[^>]+><svg[^>]+width="24"[\\s\\S]*?<\\/svg><\\/button>`));
  }
  assert.match(html,/id="news-close-to-map"[^>]+><svg[^>]+width="24"[\s\S]*?<\/svg><\/button>/);
  assert.match(html,/id="overview-sheet-close"[^>]+><\/button>/);
  for(const name of ['transport-close','map-safety-close','map-options-desktop-close','map-options-mobile-close',
    'admin-dong-close','pza-road-close','close-detail','cancel-add'])assert.ok(html.includes(`id="${name}"`));
  assert.match(read('src/main.js'),/querySelectorAll\('\[data-close-page\]'\)/);
  assert.match(read('src/main.js'),/navigate\('map'\)/);
});

test('selected Dongjak bus stops center the real map and bus status uses official time distinction',()=>{
  const source=read('src/transport-map.js');
  assert.match(source,/!refresh && Number\.isFinite\(Number\(place\.lng\)\)/);
  assert.match(source,/map\.easeTo\?\.\(\{center:\[Number\(place\.lng\),Number\(place\.lat\)\]/);
  assert.match(source,/busLastServiceStatus\(row/);
  assert.match(source,/bus-service-status/);
});

test('mobile search/top clarity, night emphasis, safety-last and bottom-seam changes are last CSS layer',()=>{
  const css=read('src/mobile-ui-baseline.css');
  const main=read('src/main.js');
  assert.ok(main.includes("import './mobile-ui-baseline.css'")&&inLegacyOrder('v704-user-request-fixes.css','v705-integrated-ui.css'));
  assert.match(css,/\.dj-night-action-symbol/);
  assert.match(css,/#ffd24d/i);
  assert.match(css,/#app #map-safety-toggle\{top:calc\(var\(--dj-controls-under-nav,438px\) \+ 144px\)/);
  assert.match(css,/#app \.topbar>\.map-quick-search/);
  assert.match(css,/#app #map::after\{background:linear-gradient\(0deg/);
  assert.match(css,/#app #bottom-nav\{border-radius:0!important/);
  assert.match(read('src/night-visibility-map.js'),/renderNightQuickAction\(\)/);
});

test('release history shows adjacent update/source links and retains v704 and the point attachment workflow',()=>{
  const history=read('src/version-history-v7.js');
  const releases=read('src/version-history.js');
  const html=read('index.html');
  assert.match(history,/v707-history-switch/);
  assert.match(history,/v707-history-timeline/);
  assert.match(history,/v707-history-sources/);
  assert.match(releases,/\{version:'v7\.0\.5'/);
  assert.match(releases,/\{version:'v7\.0\.4'/);
  assert.match(html,/id="point-attachment-input"/);
  assert.match(read('src/main.js'),/updatePointAttachments\(/);
  assert.match(read('src/point-attachments.js'),/indexedDB/);
  assert.match(read('src/transport-map.js'),/deduplicateBusStops/);
});
