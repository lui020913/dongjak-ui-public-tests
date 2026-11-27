import test from 'node:test';import assert from 'node:assert/strict';
import {installRedevelopment,REDEVELOPMENT_STYLE,repaintRedevelopment} from '../src/redevelopment-map.mjs';
test('confirmed redevelopment uses its own pale district polygons and lower zoom without changing other site layers',()=>{
 const layers=[{id:'landuse_construction',type:'fill',minzoom:15},{id:'dj-site-use-fill-0',type:'fill'},{id:'road',type:'line'}],added=[],paint=[],ranges=[],sources=new Map(),visibility=new Map();
 const map={getStyle:()=>({layers}),getSource:id=>sources.get(id),addSource:(id,s)=>sources.set(id,s),getLayer:id=>layers.find(l=>l.id===id),addLayer:(l,b)=>{layers.push(l);added.push([l,b]);},setPaintProperty:(...a)=>paint.push(a),setLayerZoomRange:(...a)=>ranges.push(a),getLayoutProperty:id=>visibility.get(id),setLayoutProperty:(id,k,v)=>visibility.set(id,v)};
 const app={dataset:{}};
 installRedevelopment({map,app});
 assert.equal(added.length,3);assert.equal(added[0][0].minzoom,13.2);assert.equal(added[2][0].minzoom,14);assert.equal(added[0][0].paint['fill-color'],'#ebeae5');assert.equal(added[0][1],'dj-site-use-fill-0');
 assert.deepEqual(paint,[['landuse_construction','fill-color',REDEVELOPMENT_STYLE.fill]]);
 assert.deepEqual(ranges,[['landuse_construction',13.2,24]]);
 assert.equal([...sources.values()][0].data,'/data/redevelopment/confirmed-projects-202609.geojson');
 app.dataset.sangdoNight='on';repaintRedevelopment(map,app);assert.ok([...visibility.values()].every(v=>v==='none'));
});
