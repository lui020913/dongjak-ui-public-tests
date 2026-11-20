import test from 'node:test';import assert from 'node:assert/strict';import {hasOpenMapWindow,TRANSIENT_PANELS} from '../src/v840-ui-core.js';
test('the actual weather dialog suppresses the map tip until closed',()=>{
 const app={dataset:{tab:'map'},classList:{contains:()=>false}};
 const weather={hidden:true,ownerDocument:{defaultView:{getComputedStyle:()=>({display:'block',visibility:'visible'})}}};
 const doc={getElementById:id=>id==='app'?app:id==='dj854-weather-sheet'?weather:null};
 assert.ok(TRANSIENT_PANELS.includes('dj854-weather-sheet'));
 assert.equal(hasOpenMapWindow(doc,app),false);weather.hidden=false;
 assert.equal(hasOpenMapWindow(doc,app),true);weather.hidden=true;
 assert.equal(hasOpenMapWindow(doc,app),false);
});
