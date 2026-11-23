import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {routeComparisonItems,sameRoute} from '../src/v804-route-comparison.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('route UI is loaded once after legacy controls; native engine still owns routes',()=>{
 const html=read('index.html'),script=read('src/route-experience-20261123.js');
 assert.match(html,/src\/route-experience-20261123\.js/);
 assert.equal(html.split('src="/src/route-experience-20261123.js"').length,2);
 assert.match(script,/native\.click\(\)/);
 assert.match(script,/dongjak:route-swap/);
 assert.match(html,/id="route-gps-start"/);
 assert.match(script,/nav-instruction/);
 assert.doesNotMatch(script,/fetchPedestrianRoute\(/);
 assert.doesNotMatch(script,/watchPosition\(/);
});
test('only actual, distinct walking route options can be presented',()=>{
 const standard={coords:[[126.95,37.5],[126.951,37.501]],seconds:600,kilometers:.19};
 const gentle={coords:[[126.95,37.5],[126.949,37.501]],seconds:800,kilometers:.22};
 const items=routeComparisonItems({standard,gentle});
 assert.deepEqual(items.map(x=>x.id),['standard','gentle']);
 assert.equal(sameRoute(standard,gentle),false);
 assert.equal(sameRoute(standard,{...standard}),true);
 assert.equal(routeComparisonItems({standard:null,gentle:null}).length,0);
});
test('PRI labels distinguish missing evaluation from measured risk and preserve high-risk red',()=>{
 const css=read('src/route-experience.css'),script=read('src/route-experience-20261123.js');
 assert.match(script,/entry\.coverage<0\.65/);
 assert.match(script,/PRI 미평가/);
 assert.match(script,/risk>=70\?'high'/);
 assert.match(css,/\.dj-route-choice-pri\[data-tone="high"\]/);
 assert.match(css,/#b32424/);
 assert.match(script,/실제 안전을 보장하지 않습니다/);
 const base=read('src/pri-route-exposure.mjs');
 assert.match(base,/compareCompositePriRoutes/);
 assert.match(base,/result\.reason='excessive-detour'/);
});
test('one map route-choice owner and separate navigation banner; native controls remain',()=>{
 const old=read('src/v825-navigation-experience.js');
 const module=read('src/route-experience-20261123.js');
 const index=read('index.html');
 assert.doesNotMatch(old,/dj825-route-options/);
 assert.match(module,/choices\.id='dj-route-choice-list'/);
 assert.match(module,/topBanner\.id='dj-route-turn-banner'/);
 for(const id of ['route-guide-start','nav-stop','nav-voice','route-variants','route-search-start','route-search-end'])
  assert.match(index,new RegExp('id="'+id+'"'));
});
test('search results select origin/destination directly, but waypoints still require map confirmation',()=>{
 const main=read('src/main.js');
 const fn=main.slice(main.indexOf('function chooseSearchResult(place){'),main.indexOf('async function runRouteSearch('));
 assert.match(fn,/if\(which==='waypoint'\)/);
 assert.match(fn,/showTransitRouteConfirmation/);
 assert.match(fn,/setRouteLocation\(which/);
 assert.match(fn,/navigate\('route'\)/);
 assert.match(main,/dongjak:route-pri-ready/);
});
test('route input overrides legacy fullscreen pages and bottom tab dock with a real CTA',()=>{
 const css=read('src/route-experience.css');
 const owner=read('src/v910-request-completion.js');
 const marker='v9.2.124 phone hotfix';
 assert.match(css,/v9\.2\.124 phone hotfix/);
 const patch=css.slice(css.indexOf(marker));
 assert.match(patch,/#app#app#app#app#app#app#app\[data-dj-route-stage="input"\]/);
 assert.match(patch,/max-height:calc\(100dvh - var\(--dj910-dock-bottom,88px\)/);
 assert.match(patch,/> #dj910-route-footer \{/);
 assert.match(patch,/bottom:calc\(var\(--dj910-dock-bottom,88px\) \+ 12px\)!important/);
 assert.match(patch,/#route-calc \{[\s\S]*?min-height:52px!important/);
 assert.match(owner,/'data-dj-route-stage'/);
 assert.match(owner,/n\.top>0&&n\.height>0/);
});
