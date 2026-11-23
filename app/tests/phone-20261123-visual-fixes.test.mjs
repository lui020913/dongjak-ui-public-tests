import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createTrainBeamSprite} from '../src/features/liveTransit/train-beams.js';
import {CURRENT_FOUR_FACTORS} from '../src/pri-data.mjs';

const read=relative=>readFileSync(new URL('../'+relative,import.meta.url),'utf8');

test('all six PRI factors use the same high-red risk direction; four historical factors remain compatible',()=>{
  assert.deepEqual(CURRENT_FOUR_FACTORS,['lighting','accidents','protectionGap','speed']);
  const map=read('src/pri-map.js');
  assert.match(map,/\['step',\['get','displayScore'\],'#4C948B',40,'#E0A04A',70,'#CF4248'/);
  assert.match(map,/0,'#4C948B'.*100,'#CB6563'/);
  assert.match(map,/100-f\.properties\.displayScore/);
  assert.match(map,/id==='current6'\?\(policyScope\?scopedCompositeFeatures/);
  assert.match(map,/id==='current4'\?\(policyScope\?scopedCompositeFeatures/);
  assert.match(map,/높은 점수=취약, 빨간색/);
});

test('line strokes are mildly thicker at all map zoom levels without changing data',()=>{
 const map=read('src/pri-map.js');
 assert.equal(map.split("['interpolate',['linear'],['zoom'],11.5,1,13,1.5,15,2.35,17,3.6,19,5.2]").length-1,2);
 assert.match(map,/11\.5,1\.4,13,2\.4,15,3\.8,17,5\.7,19,7\.8/);
});

test('live train forward illumination is neutral radial, not warm yellow cones',()=>{
 const right=createTrainBeamSprite('right');
 const index=(x,y)=>((y*right.width+x)*4);
 const centre=index(195,50),edge=index(195,10);
 assert(right.data[centre+3]>right.data[edge+3]);
 assert.equal(right.data[centre],228);
 assert.equal(right.data[centre+1],244);
 assert.equal(right.data[centre+2],255);
 assert.equal(right.data[index(165,50)+3],0);
 const lamps=read('src/features/liveTransit/train-headlights.js');
 assert.doesNotMatch(lamps,/255,228,142|255,255,244/);
});

test('nearby guidance dock follows measured tab bar and uses neutral secondary action',()=>{
 const code=read('src/pedestrian-tools.js'),css=read('src/phone-six-issues.css');
 assert.match(code,/measuredPhoneDockClearance\(rect,window,\{minimum:0,gap:8\}\)/);
 assert.match(code,/--dj-nearby-dock-clearance/);
 assert.match(css,/bottom:var\(--dj-nearby-dock-clearance/);
 assert.match(css,/\.dj-nearby-map-center\{/);
 assert.match(css,/background:#e9f4ee!important/);
});

test('My Info subviews animate by direction without blank-fading the page root',()=>{
 const js=read('src/v834-my-info.js');
 const css=read('src/phone-surface-consistency-20261123.css');
 assert.match(js,/enter\(content,'forward'\)/);
 assert.match(js,/enter\(landing,'back'\)/);
  // Visible directional motion, without fading content or the page root.
  assert.match(js,/direction==='back'\?-44:44/);
  assert.match(js,/opacity:1,transform/);
  assert.match(js,/duration:360,easing/);
  assert.match(js,/heading\.insertBefore\(detailNav,heading\.querySelector\('\.dj-sheet-chrome-close'\)\)/);
  assert.match(js,/syncSubpageHeader\(\);/);
  assert.doesNotMatch(js,/opacity:\.88,transform/);
  assert.match(css,/\.dj834-detail-nav\s*\{[\s\S]*?position:sticky!important/);
  assert.match(css,/True iOS child navigation: reuse the fixed parent header/);
  assert.match(css,/\.dj-sheet-chrome > \.dj834-detail-nav/);
  assert.match(css,/\.dj885-type-choices[\s\S]*?button\[aria-pressed="true"\]/);
  assert.match(css,/\.nav-tab:is\(\.active,\[aria-current="page"\]\)/);
  assert.match(css,/\.route-location-row[\s\S]*?min-height:74px!important/);
 assert.match(css,/\.dj834-detail-nav\{/);
 assert.match(css,/\.dj834-choice-settings > button\{/);
 // Production builds inject the same tracked source into the isolated app.
 // Source CI retains the original frontend file; both inspect the same code.
 let more;
 try{more=read('src/mobile-17-followup.js');}
 catch(error){if(error?.code!=='ENOENT')throw error;more=read('../frontend/production/mobile-17-followup.js');}
 assert.match(more,/\.dj834-tools-container/);
});
