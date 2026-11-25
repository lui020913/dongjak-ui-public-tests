import {APP_VERSION} from '../src/app-version.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EXTRA_LAYER_DEFS } from '../src/dongjak-verified-data-layers.js';
const read=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('v8.0.1 mobile motion and header are preserved while retired feeds cannot be activated',()=>{
  const html=read('index.html');
  assert.match(html,/<title>동작하는 안전지도 · 보행안전 지도<\/title>/);
  assert.match(html,/id="version-history-trigger"[^>]*>업데이트<\/button>/);
  assert.match(html,/v800-ui-architecture\.css/);
  assert.match(html,/v800-live-environment\.css/);
  for(const key of ['road-incidents','sdot-environment']){
    assert.equal((html.match(new RegExp(`data-dj-import="${key}"`,'g'))||[]).length,0);
    assert.equal(EXTRA_LAYER_DEFS[key],undefined);
  }
  assert.match(html,/id="pilot-unavailable-incidents"[^>]*disabled/);
  assert.match(read('src/v800-ui-architecture.js'),/animateEntrance/);
  assert.match(read('src/v800-ui-architecture.css'),/dj800/);
});

test('TOPIS and S-DoT are optional, secure server routes without a public credential',()=>{
  const to=read('functions/api/road-incidents.js'),sd=read('functions/api/sdot-environment.js');
  for(const text of [to,sd])assert.match(text,/SEOUL_OPEN_API_KEY/);
  assert.match(to,/fetchSeoulXmlOverTcp/);
  assert.match(sd,/fetchSdotPageOverTcp/);
  assert.match(read('src/dongjak-verified-data-layers.js'),/pedestrian_closure_verified|보행 통제 여부 미확인/);
  const points=JSON.parse(read('public/data/safety/sdot/dongjak_sdot_locations.geojson'));
  assert.equal(points.features.length,0,'unverified locations must not be invented');
});
