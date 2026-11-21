import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const compact=value=>value.replace(/\s+/g,'').toLowerCase();

test('the shared mobile-first shell loads after the preserved mobile interaction fixes',()=>{
  const main=read('src/main.js');
  const mobile=main.indexOf("import './v914-mobile-ux-fixes.css';");
  const shared=main.indexOf("import './mobile-first-layout.css';");
  assert.ok(mobile>=0&&shared>mobile);
  assert.equal(main.includes('v913-pc-design-system.css'),false);
  assert.equal(main.includes('v881-tablet-workspace.css'),false);
});

test('POI toolbar edges have no gradient or blur and never block category-chip taps',()=>{
  const css=compact(read('src/v914-mobile-ux-fixes.css'));
  assert.match(css,/\.dj831-edge-blur\{[^}]*width:12px!important/);
  assert.match(css,/\.dj831-edge-blur\{[^}]*pointer-events:none!important/);
  assert.match(css,/scroll-padding-inline:12px!important/);
  assert.equal(css.includes('linear-gradient('),false);
  assert.equal(css.includes('backdrop-filter:blur('),false);
  assert.ok(css.includes('background:none!important'));
  assert.ok(css.includes('pointer-events:none!important'));
  assert.ok(css.includes('.dj831-edge-blur-left'));
  assert.ok(css.includes('.dj831-edge-blur-right'));
});

test('MapLibre scale keeps its geographic width ratio while reducing chrome',()=>{
  const css=compact(read('src/v914-mobile-ux-fixes.css'));
  const match=css.match(/#map\.maplibregl-ctrl-scale\{([^}]*)\}/);
  assert.ok(match,'scale selector exists');
  assert.ok(match[1].includes('border-bottom:2pxsolid#315c50!important'));
  assert.ok(match[1].includes('font:65010px/1.15'));
  assert.ok(!/(^|;)width:/.test(match[1]),'scale width must remain MapLibre-calculated');
});

test('More sheet header is compact while the close button retains a 44px hit target',()=>{
  const prior=compact(read('src/v870-mobile-ui.css'));
  const css=compact(read('src/v914-mobile-ux-fixes.css'));
  assert.ok(prior.includes('min-height:70px!important'));
  assert.match(css,/dj-mobile-utilities>\.dj854-more-head\{[^}]*min-height:56px!important/);
  assert.match(css,/dj-mobile-utilities#dj-mobile-utilities-close\{[^}]*min-width:44px!important/);
});

test('Subway line badge removes the duplicate pointer ring but preserves keyboard focus visibility',()=>{
  const css=compact(read('src/v914-mobile-ux-fixes.css'));
  assert.match(css,/\.dj-metro-line-selector:focus:not\(:focus-visible\)\{[^}]*outline:none!important/);
  assert.match(css,/\.dj-metro-line-selector:focus-visible\{[^}]*outline:2pxsolid#16856d!important/);
  assert.match(css,/\.dj-metro-line-selector\[aria-pressed="true"\]\{[^}]*outline:2pxsolidvar\(--dj800-accent,#16856d\)!important[^}]*box-shadow:none!important/);
});

test('Subway compact header targets the actual four live controls',()=>{
  const css=compact(read('src/v914-mobile-ux-fixes.css'));
  const html=read('index.html');
  const transport=read('src/transport-map.js');
  assert.match(html, /class="transport-selection-box">\s*<div class="transport-selection-actions">/);
  assert.match(transport, /const actionsRow=panel\?\.querySelector\?\.\('\.transport-selection-actions'\)/);
  assert.match(transport, /actionsRow\.after\(favoritesRow\)/);
  assert.ok(css.includes('.dj-news-transport-actions{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important'));
  assert.ok(css.includes('.dj-news-transport-actions>button{'));
  assert.ok(css.includes('@layerrequest-completion{'));
});
test('Bocha switch state has one theme-aware owner at every viewport',()=>{
  const css=compact(read('src/v914-mobile-ux-fixes.css'));
  assert.ok(css.includes('#sangdo-bocha-toggle[aria-pressed="true"].dj-feature-state::before{transform:translatex(17px)!important;'));
  assert.ok(css.includes('#sangdo-bocha-toggle[aria-pressed="false"].dj-feature-state{background:#1a3435!important'));
});
