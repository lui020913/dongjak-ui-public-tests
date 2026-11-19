import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../src/v829-mobile-layout-system.css',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const has=value=>assert.ok(css.includes(value),`Missing mobile layout invariant: ${value}`);
test('mobile layout restricted to phone widths',()=>{
  assert.ok(css.startsWith('/* Dongjak v8.2.9'));
  assert.match(css,/@media\s*\(max-width:699px\)/);
  assert.doesNotMatch(css,/@media\s*\(min-width:1080px\)/);
});
test('canonical safe-area offsets align header / tool row / dock / panels',()=>{
  for(const x of ['--dj829-top','--dj829-tools-top','--dj829-nav-bottom','--dj829-panel-bottom','safe-area-inset-top','safe-area-inset-bottom'])has(x);
});
test('mobile toolbar active states never expand width',()=>{
  has('.dj-v794-tool[data-active="true"]');has('flex:0 0 clamp(38px,11vw,44px)!important');
  has('#dj-v794-toolbar > #dj800-type-trigger');
});
test('bottom navigation keeps 5 equal cells',()=>{has('grid-template-columns:repeat(5,minmax(0,1fr))!important');});
test('transport modes preserve independently limited sheet heights',()=>{
  has('min(43dvh,390px');has('min(50dvh,475px');
  has('#transport-sheet[data-kind="bus"]');has('#transport-sheet[data-kind="subway"]');
});
test('route heading has normal-flow close button',()=>{
  has('display:flex!important;flex-flow:row nowrap!important');
  has('flex:0 0 44px!important;order:3!important;margin-left:auto!important');
});
test('hidden surface stays noninteractive and invisible',()=>{
  has('visibility:hidden!important;pointer-events:none!important');
  has('#transport-sheet,#route-panel,#mine-panel,#news-panel,#participation-panel');
});
test('navigation and immersive modes remain respected',()=>{
  has('.route-guiding #bottom-nav');has('.map-immersive #bottom-nav');
  has('.dj-hide-map-tools .map-actions');
});
test('search placeholder remains readable',()=>{has('#map-quick-search-query::placeholder');has('opacity:1!important;visibility:visible!important');});
test('new CSS link loads after previous layout and release is consistent',()=>{
  const prior=html.indexOf('/src/v824-mobile-sheet-and-keyboard.css');
  const latest=html.indexOf('/src/v829-mobile-layout-system.css');
  assert.ok(prior>0 && latest>prior);assert.ok(pkg.version.localeCompare('8.2.9',undefined,{numeric:true})>=0);
  assert.ok(html.includes(`v${pkg.version}`));
});
