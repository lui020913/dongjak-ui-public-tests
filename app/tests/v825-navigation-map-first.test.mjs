import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {deriveWalkingTurns,classifyGeometryTurn,signedTurnDegrees,turnAnnouncement,nextTurnCue} from '../src/v825-walk-guidance.js';
const text=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('v8.2.5: derived turn instructions use real geometry (not mock GPS)',()=>{
  assert.equal(classifyGeometryTurn(49),null);
  assert.equal(classifyGeometryTurn(60).label,'우회전');
  assert.equal(classifyGeometryTurn(-65).label,'좌회전');
  assert.equal(signedTurnDegrees(90,0),-90);
  assert.equal(signedTurnDegrees(0,90),90);
  const left=deriveWalkingTurns([[126.94,37.5],[126.9405,37.5],[126.9405,37.5005]]);
  const right=deriveWalkingTurns([[126.94,37.5],[126.9405,37.5],[126.9405,37.4995]]);
  assert.equal(left.length,1);
  assert.equal(left[0].label,'좌회전');
  assert.equal(right.length,1);
  assert.equal(right[0].label,'우회전');
  assert.equal(deriveWalkingTurns([[126.94,37.5],[126.941,37.5],[126.942,37.5]]).length,0);
});
test('v8.2.5: navigation voice cues announce only once per corner and stage',()=>{
  const turn={index:4,label:'좌회전'};const used=new Set();
  assert.equal(nextTurnCue(turn,170,used),null);
  const far=nextTurnCue(turn,100,used);
  assert.match(far.text,/100미터 앞에서 좌회전/);
  used.add(far.key);
  assert.equal(nextTurnCue(turn,100,used),null);
  assert.equal(nextTurnCue(turn,29,used).stage,'30');
  assert.equal(nextTurnCue(turn,8,used).stage,'now');
  assert.match(turnAnnouncement(turn,8),/주변 보행로를 확인/);
});
test('route UI: one map-preview comparison uses native route selection and preserves real navigation',()=>{
  const main=text('src/main.js');
  const navigation=text('src/v825-navigation-experience.js');
  const ui=text('src/route-experience-20261123.js');
  assert.match(main,/dongjak:route-variants-ready/);
  assert.match(main,/dongjak:route-pri-ready/);
  assert.match(ui,/routeComparisonItems\(latest\)/);
  assert.match(ui,/native\.click\(\)/);
  assert.match(ui,/const selected=\(\)=>variants\.querySelector/);
  assert.match(navigation,/isRealTurn\(route\)/);
  assert.doesNotMatch(navigation,/dj825-route-options/);
});
test('v8.2.5: guiding hides bottom navigation but shows real GPS marker and compact panel',()=>{
  const css=text('src/v825-navigation-experience.css');const main=text('src/main.js');
  assert.match(css,/\.route-guiding #bottom-nav/);
  assert.match(css,/\.maplibregl-marker\.nav-position-dot/);
  assert.match(css,/\.route-guiding #nav-live-card/);
  assert.match(main,/new maplibregl\.Marker\(\{element:el,anchor:'center'\}\)/);
  assert.match(main,/updateNavMarker\(pos,actualAccuracy\)/);
});
test('v8.2.5: no unnecessary wake lock button; vibration requires real browser support',()=>{
  const extras=text('src/v804-navigation-extras.js');const css=text('src/v825-navigation-experience.css');
  assert.doesNotMatch(extras,/dj804-nav-wake/);
  assert.match(extras,/navigator\?\.vibrate/);
  assert.match(extras,/진동 미지원/);
  assert.match(css,/\.nav-live-options/);
});
