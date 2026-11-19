import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isReachDataset,trimReach,annotateVisibility,analyzeOcclusion,occlusionLineFeatures,classifySample,distanceMeters} from '../src/night-occlusion.js';
const root=new URL('../',import.meta.url);
const read=p=>readFileSync(new URL(p,root),'utf8');
test('the precomputed source has exactly the supplied 419 light locations and model metadata',()=>{
 const data=JSON.parse(read('public/data/sangdo1-night/occlusion-light-reach.geojson'));
 assert.ok(isReachDataset(data,419));
 assert.ok(data.metadata.buildingCount>1000);
 assert.ok(data.metadata.sourceInsideBuildingCount>0);
 assert.equal(data.metadata.terrain,'not considered');
 assert.equal(data.features.filter(f=>f.properties.insideBuilding).length,data.metadata.sourceInsideBuildingCount);
});
test('a max-40m reach mask is correctly trimmed when radius changes',()=>{
 const o={type:'FeatureCollection',metadata:{model:'planar-2.5d-direct-ray-v1',radiusMaxM:40},features:[{
   properties:{idx:0},geometry:{type:'Polygon',coordinates:[[[126.95,37.5],[126.9504,37.5],[126.95,37.5001],[126.95,37.5]]]}}]};
 const lights=[{lat:37.5,lon:126.95}];
 const out=trimReach(o,lights,10);
 assert.equal(out.features.length,1);
 const p=out.features[0].geometry.coordinates[0][1];
 assert.ok(distanceMeters({lon:p[0],lat:p[1]},lights[0])<=10.01);
 assert.ok(distanceMeters({lon:p[0],lat:p[1]},lights[0])>=9.9);
});
test('candidate light within radius blocked by building is not labelled lit',()=>{
 const p={x:0,y:0,lat:37.5,lon:126.95,inScope:true,d:12,dClear:null,dUncertain:null};
 assert.equal(classifySample(p,20),'blocked');
 assert.equal(classifySample({...p,d:25},20),'outside');
 assert.equal(classifySample({...p,dClear:15},20),'clear');
 assert.equal(classifySample({...p,dUncertain:10},20),'uncertain');
});
test('a 5m sampled road preserves all classified lengths with category changes counted uncertain',()=>{
 const pts=[0,5,10,15,20,25,30].map((x,i)=>({x,y:0,lat:37.5+i*.000045,lon:126.95,inScope:true,
   d:10,dClear:i<=2?10:null,dUncertain:null}));
 const out=analyzeOcclusion([{id:1,tags:{highway:'residential',name:'테스트 도로'},samples:pts}],20,10);
 assert.equal(out.totalLen,30);
 assert.equal(out.totals.clear,10);
 assert.equal(out.totals.uncertain,5);
 assert.equal(out.totals.blocked,15);
 const g=occlusionLineFeatures(out.segments);
 assert.ok(g.features.some(f=>f.properties.category==='blocked'));
});
test('the MapLibre view fixes building occlusion and removes the analysis-mode selector',()=>{
 const html=read('index.html'),map=read('src/night-visibility-map.js');
 assert.doesNotMatch(html,/name="night-analysis-mode"/);
 assert.match(html,/건물 차폐 반영/);
 assert.match(map,/const requestedOcclusion=\(\)=>true/);
 assert.match(map,/const isOcclusion=\(\)=>true/);
 assert.doesNotMatch(map,/현재는 기존 거리 기반 분석만 표시합니다/);
 assert.match(map,/occlusion-light-reach\.geojson/);
 assert.match(map,/occlusion-road-samples\.json/);
 assert.match(map,/fetchSangdoRoads\(lights\)/);
 assert.match(map,/analyzeOcclusion\(selected,currentRadius/);
});
