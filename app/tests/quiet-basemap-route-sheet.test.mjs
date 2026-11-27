import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {quietNativeLine,nativeVehicleArea,installQuietBasemap} from '../src/quiet-basemap.mjs';
test('native road polygon suppression preserves campus paths, road lines and Dongjak outline',()=>{
 const layers=[{id:'highway-area',type:'fill',source:'openmaptiles','source-layer':'transportation'},{id:'highway-motorway',type:'line',source:'openmaptiles','source-layer':'transportation'},{id:'boundary_3',type:'line',source:'openmaptiles','source-layer':'boundary'},{id:'waterway-river',type:'line',source:'openmaptiles','source-layer':'waterway'},{id:'district-border',type:'line',source:'district-outline'},{id:'rail',type:'line',source:'openmaptiles','source-layer':'transportation'},{id:'ferry',type:'line',source:'openmaptiles','source-layer':'transportation'}];
 assert.equal(nativeVehicleArea(layers[0]),true);assert.equal(nativeVehicleArea(layers[1]),false);
 assert.deepEqual(layers.filter(quietNativeLine).map(l=>l.id),['boundary_3','waterway-river','ferry']);
 const filters=new Map(),visibility=new Map(),events={};const map={getStyle:()=>({layers}),getFilter:id=>filters.get(id),setFilter:(id,v)=>filters.set(id,v),getLayoutProperty:id=>visibility.get(id),setLayoutProperty:(id,k,v)=>visibility.set(id,v),on:(name,fn)=>events[name]=fn};
 installQuietBasemap(map);events['style.load']();events.load();
 assert.deepEqual([...filters.keys()],['highway-area']);assert.deepEqual([...visibility.keys()],['boundary_3','waterway-river','ferry']);assert.match(JSON.stringify(filters.get('highway-area')),/pedestrian/);
});
test('compact route drag cannot dismiss, explicit back clears route without resetting endpoints',()=>{
 const read=p=>readFileSync(new URL('../src/'+p,import.meta.url),'utf8');
 assert.match(read('transit-sheet-gesture.js'),/expanded\(\)\?sheetDragOffset.*Math.min\(0,sheetDragOffset/);
 assert.match(read('transit-sheet-gesture.js'),/if\(action==='dismiss'\)\{settleMobileSheetDrag/);
 assert.match(read('main.js'),/returning=Boolean\(transitPreview\);invalidateRoute\(\);navigate\('route'\)/);
 assert.match(read('transit-route-comparison.js'),/keepPreview:keepCache&&app.dataset.tab==='map'/);
});

test('comparison geometry is isolated and stale asynchronous paths cannot reopen it',()=>{
 const read=p=>readFileSync(new URL('../src/'+p,import.meta.url),'utf8');
 const main=read('main.js');
 assert.match(main,/comparisonRouteGeneration\+\+;comparisonRoutePlan=null/);
 assert.match(main,/generation!==comparisonRouteGeneration\|\|app.dataset.tab!=='route'/);
 assert.match(main,/if\(previousTab==='route'&&tab!=='route'\)\{\s*clearComparisonRoute\(\)/);
 assert.match(main,/framing\?transitFramingBounds\(\)/);
 assert.match(main,/walkSegments:walks.filter/);
});

test('legacy route swipe dismissal is not registered',()=>{const s=readFileSync(new URL('../src/v830-sheet-swipe-close.js',import.meta.url),'utf8');assert.doesNotMatch(s,/id:'route-panel'/);});
