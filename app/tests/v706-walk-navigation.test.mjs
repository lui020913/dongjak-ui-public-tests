import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {bearingDegrees,headingForCamera,shouldAutoReroute,voiceCueKey} from '../src/navigation-experience.js';
const read=file=>readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
test('heading follows north/east/south and preserves current orientation on missing GPS heading',()=>{
  assert.ok(bearingDegrees([126.9,37.5],[127,37.5])>80);
  assert.ok(bearingDegrees([126.9,37.5],[127,37.5])<100);
  assert.equal(bearingDegrees([126.9,37.5],[126.9,37.6]),0);
  assert.equal(headingForCamera(NaN,72),72);
  assert.equal(headingForCamera(275,72),275);
});
test('automatic rerouting waits for 3 good GPS samples and a 30-second cooldown',()=>{
  const base={offRouteMeters:80,accuracy:15,consecutiveSamples:3,now:60000,lastAttemptAt:10000};
  assert.equal(shouldAutoReroute(base),true);
  assert.equal(shouldAutoReroute({...base,consecutiveSamples:2}),false);
  assert.equal(shouldAutoReroute({...base,accuracy:55}),false);
  assert.equal(shouldAutoReroute({...base,lastAttemptAt:40000}),false);
  assert.equal(shouldAutoReroute({...base,offRouteMeters:25}),false);
  assert.equal(shouldAutoReroute({...base,pending:true}),false);
});
test('voice cues have stable threshold keys and do not announce far away turns',()=>{
  assert.equal(voiceCueKey(7,200),'');
  assert.equal(voiceCueKey(7,100),'turn-7-100');
  assert.equal(voiceCueKey(7,45),'turn-7-30');
  assert.equal(voiceCueKey(7,10),'turn-7-now');
});
test('navigation DOM controls, source hooks and error fix are integrated',()=>{
  const html=read('index.html');const main=read('src/main.js');
  for(const id of ['nav-voice','nav-orientation','nav-follow','nav-warning'])assert.ok(html.includes(`id="${id}"`));
  for(const symbol of ['autoRerouteFromGps','navRerouteController?.abort()','updateNavState([coords.longitude,coords.latitude],coords.accuracy,coords.heading)',"map.on('dragstart'"])
    assert.ok(main.includes(symbol));
  assert.match(main,/fitWalkingRoute\(routeResult\.coords\);\s*syncRoutePresentation\(\);\s*toast\('도보 경로가 지도에 표시됐습니다/);
  assert.match(main,/import '\.\/mobile-ui-baseline\.css';/);
  assert.match(read('src/version-history.js'),/version:'v7\.0\.6'/);
});
import {validateWalkingRouteRequest} from '../functions/routing/route.js';
test('Cloudflare same-origin walking route proxy validates bounds and pedestrian-only profile',()=>{
  const payload={locations:[{lat:37.5,lon:126.95},{lat:37.49,lon:126.98}],costing:'pedestrian',costing_options:{pedestrian:{use_hills:0}}};
  const result=validateWalkingRouteRequest(payload);
  assert.equal(result.costing,'pedestrian');
  assert.equal(result.costing_options.pedestrian.use_hills,0);
  assert.equal(validateWalkingRouteRequest({...payload,costing:'auto'}),null);
  assert.equal(validateWalkingRouteRequest({...payload,locations:[{lat:1,lon:2},payload.locations[1]]}),null);
  assert.equal(validateWalkingRouteRequest({...payload,locations:[{lat:37.5,lon:126},{lat:37.5,lon:127}]}),null);
  assert.match(read('src/main.js'),/const url='\/routing\/route'/);
});
