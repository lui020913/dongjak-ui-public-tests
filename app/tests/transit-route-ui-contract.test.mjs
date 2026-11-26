import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../src/'+path,import.meta.url),'utf8');
test('transit is a separate mode and reuses existing route UI and motion',()=>{
 const entry=read('route-screen-v3.js'),compare=read('transit-route-comparison.js'),css=read('transit-route-comparison.css'),detail=read('route-experience-20261123.js');
 assert.ok(entry.includes('mountTransitComparison'));
 assert.ok(entry.includes('if(transit.active())transit.search();else legacyCalc.click()'));
 assert.ok(compare.includes('surface-motion-fallback.js'));
 assert.ok(compare.includes('requestController.abort()'));
 assert.ok(compare.includes('dongjak:transit-return-comparison'));
 assert.ok(css.includes('prefers-reduced-motion:reduce'));
 assert.ok(css.includes('border-radius:999px'));
 assert.ok(detail.includes('mountTransitDetail'));
});
test('PRI and transit arrival are scoped to verified walking legs and matching route id',()=>{
 const main=read('main.js'),detail=read('transit-route-detail.js');
 assert.ok(main.includes('evaluateCompositePriRouteCandidates(candidates'));
 assert.ok(main.includes('chooseTransitWalk(candidates,assessment'));
 assert.ok(main.includes('selectTransitWalk(result,preferPri)'));
 assert.ok(read('transit-route-comparison.js').includes('tr-pri-preference'));
 assert.ok(detail.includes('value.coverage<.65'));
 assert.ok(detail.includes('String(data.arsId)===String(detail.arsId)'));
 assert.ok(detail.includes('String(x.routeId)===String(detail.routeId)'));
 assert.ok(detail.includes('승하차 단계는 직접 전환합니다'));
});
