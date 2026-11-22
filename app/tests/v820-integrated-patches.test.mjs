import {historicalSnapshotTest} from './support/historical-snapshot-audit.mjs';
import {stripApprovedV825TransportUI} from './support/approved-v825-transport-ui.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('latest PC and mobile styles, home icon and customization remain intact',()=>{
  const html=read('index.html');
  for(const item of ['v819-safety-one-screen.css','v819-safety-one-screen.js','v818-ux-settings.js','v817-dialog-search-safety.js','local-font.css','dongjak-ios-home-180.png'])
    assert.ok(html.includes(item),`${item} was removed`);
  assert.ok(html.includes('/src/v804-new-features.js'));
  assert.ok(fs.existsSync(path.join(root,'src/v820-integration-polish.css')));
});
test('merged map keeps existing local station indexing and full mobile search protections',()=>{
  const src=read('src/map-quick-search.js');
  for(const item of ['VERIFIED_STATIONS','visualViewport','searchButton','viewResults','dj815-search-filters','dongjak:map-place-selected'])assert.ok(src.includes(item),item);
  assert.ok(!src.includes('marker=new maplibregl.Marker({color:'));
});
test('place info retains latest mobile pin and offset while enabling save/share',()=>{
  const src=read('src/place-details.js');
  for(const item of ['const viewportFocus=isPhone','offset:[0,offsetY],duration:380','mobilePin?-15:-4','toggleSavedPlace','placeShareUrl','recordRecentPlace'])assert.ok(src.includes(item),item);
});
test('routing, comparison and voice picker all operate in the same main integration',()=>{
  const src=read('src/main.js');
  for(const item of ['computeMultiStopRoutes','installMapProduct','routeWaypoints','applySelectedNavVoice','installNavVoicePicker','dongjak:route-variants-ready'])assert.ok(src.includes(item),item);
  assert.match(src,/navReroutePending\|\|routeWaypoints\.length/);
  assert.ok(read('src/v804-new-features.js').includes('dj820-safety-addons'));
});
historicalSnapshotTest('latest unrelated transport module remains untouched by the new delta patch',()=>{
 assert.equal(crypto.createHash('sha256').update(stripApprovedV825TransportUI(fs.readFileSync(path.join(root,'src/transport-map.js'),'utf8'))).digest('hex'), '15c1bd89214dddbff3b0840994c89032f293076b9d837c2e380be6f5b6a93c3a');
});
