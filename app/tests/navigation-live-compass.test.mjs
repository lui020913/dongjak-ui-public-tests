import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {deviceCompassHeading,signedHeadingDelta,smoothCompassHeading,startNavigationCompass} from '../src/navigation-experience.js';
test('absolute orientation yields clockwise heading; relative yaw and inaccurate iOS readings are rejected',()=>{
  assert.equal(deviceCompassHeading({webkitCompassHeading:90,webkitCompassAccuracy:15}),90);
  assert.equal(deviceCompassHeading({absolute:true,alpha:270}),90);
  assert.ok(Number.isNaN(deviceCompassHeading({absolute:false,alpha:270})));
  assert.ok(Number.isNaN(deviceCompassHeading({webkitCompassHeading:90,webkitCompassAccuracy:-1})));
  assert.ok(Number.isNaN(deviceCompassHeading({alpha:null,absolute:true})));
});
test('compass smoothing takes the short path across north in both directions',()=>{
  assert.equal(signedHeadingDelta(5,355),10);
  assert.equal(signedHeadingDelta(355,5),-10);
  assert.equal(smoothCompassHeading(355,5,.5),0);
  assert.equal(smoothCompassHeading(5,355,.5),0);
});
function fakeWindow(permission){
  let time=0;
  const win=new EventTarget();
  win.performance={now:()=>time};
  win.DeviceOrientationEvent=permission?{requestPermission:permission}:class {};
  return {win,tick:n=>{time+=n;},emit:heading=>{
    const event=new Event('deviceorientation');
    Object.defineProperties(event,{webkitCompassHeading:{value:heading},webkitCompassAccuracy:{value:12}});
    win.dispatchEvent(event);
  }};
}
test('stationary compass changes are emitted without GPS and expire or stop cleanly',()=>{
  const {win,tick,emit}=fakeWindow();
  const values=[];
  const compass=startNavigationCompass(win,h=>values.push(h));
  emit(0);tick(30);emit(90);assert.deepEqual(values,[0]);
  tick(100);emit(90);assert.equal(values.length,2);assert.ok(values[1]>45);
  assert.equal(compass.heading(),values[1]);
  tick(2600);assert.ok(Number.isNaN(compass.heading()));
  compass.stop();emit(180);assert.equal(values.length,2);
});
test('iOS prompts immediately and denial or stopping before grant leaves no listener',async()=>{
  let requests=0;
  const denied=fakeWindow(()=>{requests++;return Promise.resolve('denied');});
  const values=[];const a=startNavigationCompass(denied.win,h=>values.push(h));
  assert.equal(requests,1);await Promise.resolve();denied.emit(90);assert.equal(values.length,0);
  assert.ok(Number.isNaN(a.heading()));a.stop();
  let grant;const pending=fakeWindow(()=>new Promise(resolve=>{grant=resolve;}));
  const b=startNavigationCompass(pending.win,h=>values.push(h));
  b.stop();grant('granted');await Promise.resolve();pending.emit(90);assert.equal(values.length,0);
});
test('guidance alone owns compass camera, GPS fallback and cleanup',()=>{
  const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
  assert.match(main,/navCompass=startNavigationCompass\(window,heading=>/);
  assert.match(main,/navMode==='gps'&&navFollow&&navHeadingUp&&navLastGps&&!document.hidden/);
  assert.match(main,/followNavigationPosition\(navLastGps.pos,heading,\{compassUpdate:true\}\)/);
  assert.match(main,/Number.isFinite\(compassHeading\)\?compassHeading:/);
  assert.match(main,/navCompass\?\.stop\(\);navCompass=null/);
});
