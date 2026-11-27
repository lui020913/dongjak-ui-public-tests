import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createTransitCellStream,viewportKeys,cellKey} from '../src/transit-stream-grid.mjs';
import {setSeoulBoundary,inSeoul,routeInSeoul} from '../src/seoul-transit-boundary.mjs';
import {makeTransitAssets} from '../scripts/transit-stream-assets.mjs';
const wait=()=>new Promise(r=>setTimeout(r,65));
test('viewport cells and LOD exclude bus at low zoom',()=>{
 const b={west:126.94,east:126.95,south:37.49,north:37.5};
 assert.deepEqual(viewportKeys(b,11),[]);
 assert.ok(viewportKeys(b,14).every(k=>k.startsWith('rail_')));
 const keys=viewportKeys(b,17);assert.ok(keys.includes('bus_'+cellKey(126.945,37.495)));assert.ok(keys.length<=50);
 assert.ok(viewportKeys(b,17,{bus:false}).every(k=>k.startsWith('rail_')));
});
test('rapid movement aborts obsolete requests and reuses cached cells',async()=>{
 const jobs=new Map(),changes=[];
 const stream=createTransitCellStream({load:(key,signal)=>new Promise(resolve=>jobs.set(key,{signal,resolve})),onChange:rows=>changes.push(rows),concurrency:2});
 stream.update(['a','b']);await wait();
 jobs.get('a').resolve(['a']);await wait();
 stream.update(['a','c']);await wait();
 assert.equal(jobs.get('b').signal.aborted,true);
 jobs.get('b').resolve(['b']);jobs.get('c').resolve(['c']);await wait();
 assert.deepEqual(changes.at(-1),['a','c']);
 stream.update(['a']);assert.deepEqual(changes.at(-1),['a']);stream.dispose();
});
test('Seoul polygon rejects a point in bounding rectangle but outside actual city and a crossing of polygon hole',()=>{
 setSeoulBoundary({type:'Polygon',coordinates:[[[126.8,37.4],[127.1,37.4],[127.1,37.6],[126.8,37.6],[126.8,37.4]],[[126.91,37.48],[126.93,37.48],[126.93,37.52],[126.91,37.52],[126.91,37.48]]]});
 assert.equal(inSeoul(126.9,37.5),true);assert.equal(inSeoul(127.12,37.5),false);
 assert.equal(routeInSeoul([[126.9,37.5],[126.94,37.5]]),false);
});
test('real source records split into independent spatial chunks',()=>{
 const bus=JSON.parse(readFileSync(new URL('../public/data/transport/seoul-bus-stops.json',import.meta.url),'utf8'));
 const csv=readFileSync(new URL('../data-source/seoul-station-coordinates.csv',import.meta.url),'utf8');
 const chunks=makeTransitAssets(bus,csv);
 const rows=[...chunks.values()].flat();
 assert.ok(rows.filter(p=>p.kind==='bus').length>5000);
 assert.ok(rows.filter(p=>p.kind==='subway').length>200);
 for(const [key,points] of chunks)for(const p of points)assert.equal(key,(p.kind==='bus'?'bus':'rail')+'_'+cellKey(p.lng,p.lat));
});

test('normal loading is distinct from failed cells and arrivals are batched',async()=>{
 const states=[];const stream=createTransitCellStream({load:async key=>{if(key==='bad')throw Error('offline');return [key];},onChange:(rows,state)=>states.push({rows,...state})});
 stream.update(['a','b','bad']);assert.equal(states[0].pending,3);assert.equal(states[0].failed,0);await wait();assert.equal(states.at(-1).pending,0);assert.equal(states.at(-1).failed,1);assert.deepEqual(states.at(-1).rows,['a','b']);assert.equal(states.length,2);stream.dispose();
});
