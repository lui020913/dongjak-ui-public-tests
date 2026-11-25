import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {startNavigationCompass,signedHeadingDelta,deviceCompassHeading} from '../src/navigation-experience.js';

test('stationary phone rotation supplies absolute heading independently of GPS fixes',()=>{
 const listeners=new Map(),headings=[];let now=0;
 const win={DeviceOrientationEvent:class {},addEventListener:(type,fn)=>listeners.set(type,fn),removeEventListener:type=>listeners.delete(type)};
 const compass=startNavigationCompass(win,value=>headings.push(value),{now:()=>now,interval:100});
 listeners.get('deviceorientation')({webkitCompassHeading:350,webkitCompassAccuracy:10});
 now=150;listeners.get('deviceorientation')({webkitCompassHeading:10,webkitCompassAccuracy:10});
 assert.equal(headings.length,2);assert.equal(headings[0],350);assert.ok(Math.abs(signedHeadingDelta(headings[1],3))<.01);
 assert.equal(deviceCompassHeading({absolute:true,alpha:270}),90);
 assert.equal(signedHeadingDelta(5,355),10);
 compass.stop();assert.equal(listeners.size,0);
});
test('normal GPS marker updates independently of map camera and removes heading on stop',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.match(main,/gpsCompass=startNavigationCompass\(window,heading=>\{gpsDeviceHeading=heading;updateGpsDirection\(\);\}\)/);
 assert.match(main,/const relative=heading-map\.getBearing\(\)/);
 assert.match(main,/map\.on\('rotate',updateGpsDirection\)/);
 assert.match(main,/gpsCompass\?\.stop\(\);gpsCompass=null;gpsDeviceHeading=NaN;gpsCourseHeading=NaN/);
 assert.match(main,/marker\.append\(pulse,arrow\)/);
});
