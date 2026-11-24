import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {offRouteThreshold,shouldAutoReroute,voiceCueKey} from '../src/navigation-experience.js';
import {deriveWalkingTurns,nextTurnCue} from '../src/v825-walk-guidance.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('walking reroute uses one accuracy-aware threshold and throttles repeated requests',()=>{
  assert.equal(offRouteThreshold(14),22);
  const base={accuracy:14,offRouteMeters:25,consecutiveSamples:3,now:16000,lastAttemptAt:0};
  assert.equal(shouldAutoReroute(base),true);
  assert.equal(shouldAutoReroute({...base,offRouteMeters:21}),false);
  assert.equal(shouldAutoReroute({...base,consecutiveSamples:2}),false);
  assert.equal(shouldAutoReroute({...base,accuracy:50}),false);
  assert.equal(shouldAutoReroute({...base,pending:true}),false);
  assert.equal(shouldAutoReroute({...base,now:14000}),false);
  assert.match(read('src/main.js'),/offRouteLimit=offRouteThreshold\(actualAccuracy\)/);
});
test('arrival is an exclusive stage and voice is an allowed guidance control',()=>{
  const ui=read('src/route-experience-20261123.js'), main=read('src/main.js'),css=read('src/route-experience.css'),html=read('index.html');
  assert.match(ui,/djWalkArrived==='1'\?'arrived'/);
  assert.match(main,/!navMode && app.dataset.djWalkArrived!=='1'/);
  assert.match(ui,/mapCard.hidden=true;setStage\(\)/);
  assert.match(css,/data-dj-walk-arrived="1"\] :is\(#route-map-card,#nav-live-card/);
  assert.match(html,/nav-live-actions[^\n]+id="nav-voice"[^\n]+id="nav-stop"/);
  assert.match(ui,/closest\?\.\('#nav-voice'\)/);
  assert.match(css,/nav-live-actions > :not\(#nav-stop\):not\(#nav-voice\)/);
});
test('real turn geometry yields a distance-specific Korean cue',()=>{
  const turns=deriveWalkingTurns([[126.95,37.5],[126.95,37.5006],[126.9507,37.5006]]);
  assert.equal(turns[0].label,'우회전');
  const cue=nextTurnCue(turns[0],60);
  assert.match(cue.text,/60미터 앞에서 우회전/);
  assert.equal(nextTurnCue(turns[0],60,new Set([cue.key])),null);
  assert.notEqual(voiceCueKey(2,60),voiceCueKey(2,20));
});
test('nearby sheet and screen-space marker use scoped canonical CSS',()=>{
  const css=read('src/mobile-ui/current.css');
  assert.match(css,/:has\(#ped-tools-panel:not\(\[hidden\]\)\) .map-actions/);
  assert.match(css,/dj-round-location-pulse/);
  assert.match(css,/width:38px!important;height:38px!important/);
});
