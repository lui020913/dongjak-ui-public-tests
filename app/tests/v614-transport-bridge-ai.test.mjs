import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {bridgeReferenceCollection,snapBridgeReferenceToLine} from '../src/hangang-bridge-labels.js';
import {onRequestGet} from '../functions/api/transport/[[path]].js';
const text=name=>readFileSync(new URL(`../${name}`,import.meta.url),'utf8');

test('Dongjak and Banpo bridge labels are on the published crossing reference, not past incorrect labels',()=>{
 const bridges=Object.fromEntries(bridgeReferenceCollection().features.map(f=>[f.properties.name,f.geometry.coordinates]));
 assert.ok(Math.abs(bridges.동작대교[0]-126.98189)<0.00001);
 assert.ok(Math.abs(bridges.동작대교[1]-37.51070)<0.00001);
 assert.ok(Math.abs(bridges.반포대교[0]-126.99600)<0.00001);
 assert.ok(Math.abs(bridges.반포대교[1]-37.51550)<0.00001);
});
test('metro previous/next strip uses a route-specific CSS variable, not a single navy color',()=>{
 const script=text('src/transport-map.js'),css=text('src/v614-transport-compact.css');
 assert.match(script,/setProperty\?\.\('--dj-metro-route-color',subwayLineColor\(line\)\)/);
 assert.match(css,/background:var\(--dj-metro-route-color/);
 assert.match(css,/width:min\(520px/);
 assert.match(text('src/main.js'),/import '\.\/v614-transport-compact.css';/);
});
test('timetable tab actually expands published timetable table and retains server-side key',()=>{
 const client=text('src/transport-map.js');
 assert.match(client,/if\(view==='hours'\)\{[\s\S]*?timetableExpanded=true/);
 assert.match(client,/renderServiceHours\(visibleServiceHours\)/);
 assert.doesNotMatch(client,/VITE_SEOUL_OPEN_API_KEY/);
 assert.match(text('functions/api/transport/[[path]].js'),/SEOUL_OPEN_API_KEY/);
});
test('bus missing official key is disclosed as a distinct error without fabricating arrival data',async()=>{
 const request={url:'https://example.pages.dev/api/transport/bus?arsId=20001'};
 const resp=await onRequestGet({request,env:{}});
 assert.equal(resp.status,503);
 assert.equal((await resp.json()).code,'MISSING_BUS_KEY');
 const code=text('src/transport-map.js');
 assert.match(code,/classifyOfficialBusLookupError/);
 assert.match(code,/MISSING_BUS_KEY/);
});

test('named bridge line snaps the reference onto the actual line geometry',()=>{
 const snap=snapBridgeReferenceToLine([[126.982,37.508],[126.982,37.513]],[126.98189,37.51070]);
 assert.ok(snap.distance<15);
 assert.ok(Math.abs(snap.coordinates[0]-126.982)<1e-6);
 assert.ok(Math.abs(snap.coordinates[1]-37.51070)<1e-6);
});
