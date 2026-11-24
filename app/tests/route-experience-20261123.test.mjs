import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {routeComparisonItems,sameRoute} from '../src/v804-route-comparison.js';
import {routePriColorGeometry} from '../src/pri-route-exposure.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('route module retains real native search/PRI/GPS owners and removes extra details screen',()=>{
 const html=read('index.html'),js=read('src/route-experience-20261123.js');
 assert.equal(html.split('src="/src/route-experience-20261123.js"').length,2);
 for(const id of ['route-gps-start','route-guide-start','nav-stop','route-variants','route-search-start','route-search-end'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(js,/dongjak:route-swap/);
 assert.match(js,/native\.click\(\)/);
 assert.match(js,/topBanner\.append\(instruction\)/);
 assert.match(js,/No standalone "route details" page/);
 assert.doesNotMatch(js,/fetchPedestrianRoute\(/);
 assert.doesNotMatch(js,/watchPosition\(/);
});

test('one or two only actually computed walking paths can be compared',()=>{
 const standard={coords:[[126.95,37.5],[126.951,37.501]],seconds:600,kilometers:.19};
 const gentle={coords:[[126.95,37.5],[126.949,37.501]],seconds:800,kilometers:.22};
 const items=routeComparisonItems({standard,gentle});
 assert.deepEqual(items.map(x=>x.id),['standard','gentle']);
 assert.equal(sameRoute(standard,gentle),false);
 assert.equal(sameRoute(standard,{...standard}),true);
 assert.equal(routeComparisonItems({standard:null,gentle:null}).length,0);
});

test('PRI risk visual is a truthful subset of the real calculated route, unknown is gray',()=>{
 const p=[126.95,37.5],q=[126.951,37.5],coords=[p,q];
 const unknown=routePriColorGeometry({coords},{grid:new Map()});
 assert.ok(unknown.features.length>0);
 assert.ok(unknown.features.every(f=>f.properties.tone==='unknown'&&f.properties.color==='#8c969c'));
 const xFactor=111320*Math.cos(37.5*Math.PI/180),yFactor=111320;
 const a=[p[0]*xFactor,p[1]*yFactor],b=[q[0]*xFactor,q[1]*yFactor];
 const line={a,b,length:Math.hypot(b[0]-a[0],b[1]-a[1]),risk:86,coverage:6,id:'one-observed-road'};
 const grid=new Map();
 for(let x=Math.floor(a[0]/50)-1;x<=Math.floor(b[0]/50)+1;x++)
  for(let y=Math.floor(a[1]/50)-1;y<=Math.floor(a[1]/50)+1;y++)grid.set(x+','+y,[line]);
 const high=routePriColorGeometry({coords},{grid});
 assert.ok(high.features.some(f=>f.properties.tone==='severe'&&f.properties.color==='#d84b4e'));
 assert.deepEqual(high.features[0].geometry.coordinates[0],p);
 assert.deepEqual(high.features.at(-1).geometry.coordinates.at(-1),q);
});

test('PRI score remains conservative and red means danger not safety',()=>{
 const js=read('src/route-experience-20261123.js'),main=read('src/main.js');
 const css=read('src/route-experience.css'),risk=read('src/pri-route-exposure.mjs');
 assert.match(js,/entry\.coverage<\.65/);
 assert.match(js,/PRI 미평가/);
 assert.match(js,/risk>=70\?'high'/);
 assert.match(js,/실제 안전을 보장하지 않습니다/);
 assert.match(css,/#d84b4e/);
 assert.match(js,/회색 실선: 미평가/);
 assert.match(main,/walking-route-pri-unknown/);
 assert.match(main,/walking-route-pri-colors/);
 assert.match(main,/installSolidMapLines\(map\)/);
 assert.match(risk,/matchedRisk\(sample,heading,observedLines\.grid\)/);
 assert.match(risk,/result\.reason='excessive-detour'/);
});
test('GPS guide has only original end button interactive until guide stops',()=>{
 const js=read('src/route-experience-20261123.js'),css=read('src/route-experience.css');
 assert.match(js,/app\.classList\.contains\('route-guiding'\)/);
 assert.match(js,/e\.target\?\.closest\?\.\('#nav-stop'\)/);
 assert.match(js,/stopImmediatePropagation/);
 assert.match(js,/'touchstart','touchmove'/);
 assert.match(js,/type==='keydown'&&e\.key==='Tab'/);
 assert.ok(js.indexOf("if(e.type==='keydown'&&e.key==='Tab')") <
   js.indexOf("if(e.target?.closest?.('#nav-stop'))"),'Tab must be trapped before allowing the already-focused stop button');
 assert.match(js,/on\(win,'keydown',intercept/);
 assert.match(css,/#dj-walk-guidance-lock/);
 assert.match(css,/#nav-live-card \.nav-live-actions > :not\(#nav-stop\)/);
 assert.match(css,/display:none!important;pointer-events:none!important/);
});
test('one input/editor and no standalone third route-details page',()=>{
 const js=read('src/route-experience-20261123.js'),css=read('src/route-experience.css');
 assert.match(js,/choices\.setAttribute\('aria-label','계산된 도보 경로 비교'\)/);
 assert.match(js,/topBanner=add\('section','dj-route-turn-banner'\)/);
 assert.match(css,/data-dj-route-stage="input"/);
 assert.match(css,/data-dj-route-stage="search"/);
 assert.match(css,/data-dj-route-stage="preview"/);
 assert.match(css,/data-dj-route-stage="guiding"/);
 assert.doesNotMatch(js,/dj-route-pri-detail/);
});


test('release mobile-next patch targets the current route source and avoids unscored alternatives',()=>{
 const main=read('src/main.js');
 const raw="paint:{'line-color':'#87939b','line-width'";
 const transformed="paint:{'line-color':['match',['get','kind'],'standard','#3978c8'";
 // The source checkout must contain exactly one raw adapter anchor.
 // Protected release transforms that very anchor into the route-kind match
 // before it runs this same test in an isolated app-only tree.
 const adapter=new URL('../../scripts/apply-mobile-next.mjs',import.meta.url);
 if(existsSync(adapter)){
   const release=readFileSync(adapter,'utf8');
   assert.equal(main.split(raw).length-1,1,'source adapter anchor occurs once');
   assert.equal(main.split(transformed).length-1,0,'source checkout must not be prepatched');
   assert.ok(release.includes(raw),'source release adapter matches current walking-route line');
   assert.ok(release.includes(transformed),'adapter must keep release-specific alternative route style');
 }else{
   assert.equal(main.split(raw).length-1,0,'the isolated release should already be transformed');
   assert.equal(main.split(transformed).length-1,1,'exact released alternative line match occurs once');
   assert.match(main,/walking-route-pri-colors/,'release retains observed PRI colors');
   assert.match(main,/walking-route-pri-unknown/,'release retains unknown gray segments');
 }
 assert.match(main,/enabled\|\|navMode\?'none':'visible'/);
});

test('only preview and guidance dock positions, preview GPS and turn text contrast change',()=>{
 const css=read('src/route-experience.css');
 assert.equal(css.split('bottom:calc(env(safe-area-inset-bottom,0px) + 4px)!important;').length-1,2);
 assert.match(css,/data-dj-route-stage="preview"\] \.map-actions/);
 assert.match(css,/bottom:calc\(min\(44dvh,342px\) \+ env\(safe-area-inset-bottom,0px\) \+ 22px\)!important;/);
 assert.match(css,/#dj-route-turn-banner #nav-instruction[\s\S]*?color:#f7fffc!important;/);
 assert.match(css,/data-dj-route-stage="input"/);
 assert.match(css,/data-dj-route-stage="search"/);
});
