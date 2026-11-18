import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const css=read('src/v809-precision-polish.css');
const js=read('src/v809-precision-polish.js');
const motion=read('src/v806-unified-ui.js');
const html=read('index.html');

test('v809 styles and module are loaded after v807 in both platforms',()=>{
 assert.ok(html.indexOf('v809-precision-polish.css')>html.indexOf('v807-ui-refine.css'));
 assert.ok(html.indexOf('v809-precision-polish.js')>html.indexOf('v807-ui-refine.js'));
});
test('desktop left rail and outer search shell are opaque/single-layer',()=>{
 assert.match(css,/#bottom-nav\{[\s\S]*?background:#fff!important/);
 assert.match(css,/#map-quick-search\{[\s\S]*?background:transparent!important/);
 assert.match(css,/#map-quick-search::before/);
 assert.match(css,/#bottom-nav>\.nav-tab \.nav-icon svg/);
});
test('metro copy +1px, bus cards preserve independent two-column layout',()=>{
 assert.match(css,/transport-sheet\[data-kind="subway"\]/);
 assert.match(css,/font-size:calc\(1em \+ 1px\)/);
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/transport-arrivals>\.transport-arrival-row/);
});
test('mobile nav uses a common label row and shadow; search is one point bolder/larger',()=>{
 assert.match(css,/grid-template-rows:29px 24px/);
 assert.match(css,/#bottom-nav>\.nav-tab>span:last-child/);
 assert.match(css,/box-shadow:0 -6px 20px/);
 assert.match(css,/dj807-search-copy/);
 assert.match(css,/font-weight:850!important/);
});
test('mobile motion owner retains entrance effects while X uses native dismiss',()=>{
 assert.match(motion,/clipPath:vertical\?'inset\(88% 0 0 0 round 22px\)'/);
 assert.match(motion,/on\(doc,'click',schedule,false\)/);
 assert.match(motion,/duration:phone\(\)\?410:260/);
 assert.match(motion,/on\(doc,'click',nativeDismiss,true\)/);
});
test('Help release shortcut is removed safely without removing the version history feature',()=>{
 assert.match(js,/releaseButton\.remove\(\)/);
 assert.match(js,/if\(releaseButton\)/);
 assert.match(html,/id="version-history-trigger"/);
});
