import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {estimateRoutePriExposure,compareCompositePriRoutes} from '../src/pri-route-exposure.mjs';

const A=[126.95,37.5],B=[126.9505,37.5];
const C=[126.95,37.5003],D=[126.9505,37.5003];
const segment=(id,coords,safety)=>({
 id,geometry:{type:'LineString',coordinates:coords},
 scores:{lighting:safety,accidents:safety,protectionGap:null,speed:null,crossing:null,sharedRoad:null},
 evidence:{}
});
const bundle={segments:[segment('high',[A,B],10),segment('low',[C,D],90)]};
const routes={standard:{coords:[A,B]},gentle:{coords:[C,D]}};

test('lower composite PRI risk is recommended only for geographically matched distinct candidate routes',()=>{
 const comparison=compareCompositePriRoutes(routes,bundle);
 assert.equal(comparison.recommendation,'gentle');
 assert.equal(comparison.reason,'observed-comparison');
 assert.ok(comparison.standard.coverage>=0.95);
 assert.ok(comparison.gentle.coverage>=0.95);
 assert.equal(comparison.standard.risk,90);
 assert.equal(comparison.gentle.risk,10);
 assert.equal(comparison.gentle.observedFactorsMean,2);
});
test('unmatched paths stay unknown instead of being assigned a zero-danger score',()=>{
 const remote={coords:[[127.01,37.55],[127.0105,37.55]]};
 const comparison=compareCompositePriRoutes({standard:remote,gentle:routes.gentle},bundle);
 assert.equal(comparison.recommendation,null);
 assert.equal(comparison.standard.risk,null);
 assert.ok(comparison.standard.coverage<0.01);
});
test('missing observed factors and duplicate routes never create a false preferred route',()=>{
 const incomplete={segments:[segment('incomplete',[A,B],null),segment('other',[C,D],null)]};
 assert.equal(compareCompositePriRoutes(routes,incomplete).recommendation,null);
 const same=compareCompositePriRoutes({standard:routes.standard,gentle:routes.standard},bundle);
 assert.equal(same.recommendation,null);
 assert.equal(same.reason,'same-route');
});
test('routes shorter than useful assessment distance or without actual linework cannot be scored',()=>{
 assert.equal(estimateRoutePriExposure({coords:[A,A]},{grid:new Map()}),null);
 const comparison=compareCompositePriRoutes({standard:{coords:[A,[126.95008,37.5]]},gentle:routes.gentle},bundle);
 assert.equal(comparison.recommendation,null);
});
test('route UI explains that PRI is partial and never treats unknown roads as safe',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const css=readFileSync(new URL('../src/v841-route-and-tips.css',import.meta.url),'utf8');
 assert.match(main,/evaluateCompositePriRouteCandidates\(\{standard,gentle\}\)/);
 const worker=readFileSync(new URL('../src/workers/pri-route-worker.mjs',import.meta.url),'utf8');
 assert.match(worker,/compareCompositePriRoutes\(routes,bundle\)/);
 assert.match(main,/미평가 도로는 안전한 도로로 계산하지 않습니다/);
 assert.match(main,/comparison\?\.recommendation&&!priVariantChosenManually/);
 assert.match(css,/\.dj-pri-route-advice:not\(\[hidden\]\)/);
});
