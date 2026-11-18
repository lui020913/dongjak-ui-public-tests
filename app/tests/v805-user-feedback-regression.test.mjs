import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {popupViewportOffset} from '../src/map-popup-viewport.js';

const root=resolve(import.meta.dirname,'..');
const read=file=>readFileSync(resolve(root,file),'utf8');

test('2026-11-13 integrated AUDIO/AED/SANGDO source is retained',()=>{
  assert.ok(existsSync(resolve(root,'functions/api/aed.js')));
  assert.ok(existsSync(resolve(root,'docs/V802_AUDIO_AED_INTEGRATION_20261112.md')));
  assert.ok(existsSync(resolve(root,'docs/SANGDO1_TEAM_ACCIDENT_REVIEW_20261113.md')));
  assert.match(read('index.html'),/src\/v805-responsive-readability\.css/);
  assert.match(read('index.html'),/src\/v805-responsive-readability\.js/);
});

test('safety-map tab does not open the district chooser automatically on desktop or mobile',()=>{
  const js=read('src/v805-responsive-readability.js');
  const main=read('src/main.js');
  assert.doesNotMatch(js,/pendingAdmin|scheduleAdmin|openAdminAfterNavigation/);
  assert.doesNotMatch(js,/opener\.click\(\)/);
  // The deliberate option-button path remains available.
  assert.match(main,/getElementById\('open-admin-dongs-from-options'\)/);
  assert.match(main,/getElementById\('open-admin-dongs'\)\?\.click\(\)/);
});

test('desktop transit sheets and admin modal are content-sized, not bottom-pinned',()=>{
  const css=read('src/v805-responsive-readability.css');
  assert.match(css,/#admin-dong-picker:not\(\[hidden\]\)/);
  assert.match(css,/#transport-sheet\[data-kind="subway"\]:not\(\[hidden\]\)/);
  assert.match(css,/height:max-content!important/);
  assert.match(css,/bottom:auto!important/);
  assert.match(css,/\.map-quick-search-submit/);
  assert.match(css,/border-radius:999px/);
});

test('mobile subway shows all information when it fits and bus records stay compact',()=>{
  const js=read('src/v805-responsive-readability.js');
  const css=read('src/v805-responsive-readability.css');
  assert.match(js,/scrollHeight<=transport\.clientHeight\+2/);
  assert.match(js,/dj805-subway-no-scroll/);
  assert.match(css,/#transport-sheet\[data-kind="bus"\] #transport-description/);
  assert.match(css,/#transport-sheet\[data-kind="bus"\] \.transport-arrival-row/);
  assert.match(css,/dj805-subway-tight/);
});

test('facility popup viewport reserves right map tools and bottom navigation',()=>{
  const js=read('src/map-popup-viewport.js');
  assert.match(js,/dj-place-detail-popup/);
  assert.match(js,/railLeft-10/);
  assert.match(js,/navTop-10/);
  assert.deepEqual(popupViewportOffset({left:110,top:300,right:440,bottom:740},
    {left:0,top:0,right:330,bottom:720},12),{x:-98,y:-32});
});

test('dark bridge name paint changes both text and halo for the two native GIS layers',()=>{
  const bridge=read('src/hangang-bridge-labels.js');
  assert.match(bridge,/attributeFilter:\['data-theme'\]/);
  assert.match(bridge,/dark\?'#edf8ff':'#31586e'/);
  assert.match(bridge,/dark\?'#10212b':'#ffffff'/);
  assert.match(bridge,/setPaintProperty\(id,'text-halo-color',halo\)/);
});

test('PC help hides iPhone instructions; route and updates are still usable',()=>{
  const css=read('src/v805-responsive-readability.css');
  const js=read('src/v805-responsive-readability.js');
  assert.match(css,/#map-gesture-guide \.dj803-ios-install-help\{display:none!important/);
  assert.match(css,/#route-panel>\.page-note\{display:none!important/);
  assert.match(css,/#version-history-modal:not\(\[hidden\]\) \.version-history-dialog/);
  assert.match(js,/closeWithMotion/);
  assert.match(js,/anim\.finished\.then\(replay,replay\)/);
});
