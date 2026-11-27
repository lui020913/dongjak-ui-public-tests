import test from 'node:test';
import assert from 'node:assert/strict';
import {transitRouteViewportPadding,routeProjectionCorrection} from '../src/route-map-focus.js';
test('transit route padding includes the full endpoint pin above each coordinate',()=>{const p=transitRouteViewportPadding({mapTop:0,viewportHeight:844,toolbarBottom:128,sheetTop:530,markerHeight:48,markerWidth:30});assert.deepEqual(p,{top:186,bottom:332,left:28,right:28});assert.ok(p.top-48>=138);});
test('transit padding does not shrink into the header or sheet on a short viewport',()=>{assert.equal(transitRouteViewportPadding({mapTop:0,viewportHeight:568,toolbarBottom:120,sheetTop:165}),null);});
test('route projection correction detects the hidden endpoint even when its anchor is visible',()=>{const p=transitRouteViewportPadding({mapTop:0,viewportHeight:844,toolbarBottom:128,sheetTop:530});assert.ok(routeProjectionCorrection([{x:200,y:150},{x:100,y:440}],390,844,p));});
