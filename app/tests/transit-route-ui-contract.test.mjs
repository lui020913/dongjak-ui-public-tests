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
 assert.ok(main.includes('selectTransitWalk(result,preferPri,signal)'));
 assert.ok(read('transit-route-comparison.js').includes('tr-pri-preference'));
 assert.ok(detail.includes('value.coverage<.65'));
 assert.ok(detail.includes('String(data.arsId)===String(detail.arsId)'));
 assert.ok(detail.includes('String(x.routeId)===String(detail.routeId)'));
 assert.ok(detail.includes('승하차 단계는 직접 전환합니다'));
});

test('all transit cards show automatic walking review and no redundant global disclaimer',()=>{
 const code=read('transit-route-comparison.js');
 assert.doesNotMatch(code,/class="tr-review"|slice\(0,3\)|위험도 우열 미확정|일부 버스 정보 조회 불가/);
 assert.match(code,/groupsOf\(\)\.all\.filter/);
 assert.match(code,/formatTransitReview\(reviewed\.get\(plan\),reviewed\.has\(plan\)\)/);
 assert.match(code,/void reviewCandidates\(\)/);
 for(const file of ['transit-route-comparison.js','transit-route-detail.js','route-screen-v3.js'])assert.match(read(file),/WALK_ICON_PATH/);
});

test('transit cancellation reaches the PRI worker and does not cancel an unrelated active request',async()=>{
 const original=globalThis.Worker,instances=[];
 globalThis.Worker=class {constructor(){instances.push(this);}postMessage(data){this.last=data;}terminate(){this.terminated=true;}};
 try{
  const {evaluateCompositePriRouteCandidates:evaluate}=await import('../src/pri-route-client.js');
  const a=new AbortController(),b=new AbortController();
  const first=evaluate({},{signal:a.signal}),second=evaluate({},{signal:b.signal});
  a.abort();await assert.rejects(first,{name:'AbortError'});assert.ok(!instances[0].terminated);
  b.abort();await assert.rejects(second,{name:'AbortError'});assert.equal(instances[0].terminated,true);
  const c=new AbortController();const third=evaluate({},{signal:c.signal});assert.equal(instances.length,2);
  c.abort();await assert.rejects(third,{name:'AbortError'});
 }finally{if(original===undefined)delete globalThis.Worker;else globalThis.Worker=original;}
});

test('transit badge uses actual map route palette as a filled pill and search/detail surfaces fade',()=>{
 const css=read('transit-route-comparison.css'),js=read('transit-route-comparison.js'),detail=read('transit-route-detail.js'),entry=read('route-screen-v3.js');
 const rule=css.match(/\.tr-line-badge\{[^}]+\}/)[0];
 assert.match(rule,/background:var\(--line-color\)/);assert.match(rule,/color:#fff/);assert.match(rule,/border-radius:999px/);
 assert.match(js,/badge.style.setProperty\('--line-color',leg.kind==='bus'\?busRouteColor\(leg.routeType\):subwayLineColor/);
 assert.match(entry,/revealSurface\(searchScreen/);assert.match(entry,/exitSurface\(searchScreen/);
 assert.match(detail,/revealSurface\(root\)/);assert.match(detail,/exitSurface\(root,finish\)/);
});
test('shared map names use station font and zoom curve without writing style during movement',()=>{
 const code=read('ui-environment.js');
 assert.match(code,/const stationFont=\['Noto Sans Bold','Noto Sans Regular','Open Sans Semibold','Open Sans Regular'\]/);
 assert.match(code,/named\?stationSize:original.size/);
 assert.match(code,/if\(map.isMoving\?\.\(\)\)\{scheduleMapLabelContrast\(\);return;\}/);
 assert.match(code,/signature===labelStyleSignature/);
 assert.match(code,/map.on\('moveend',scheduleMapLabelContrast\)/);
});
