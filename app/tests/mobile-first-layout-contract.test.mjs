import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const main = read('../src/main.js');
const html = read('../index.html');
const toolbar = read('../src/mobile-toolbar-v794.js');
const swipe = read('../src/v831-swipe-feature-toolbar.js');
const coordinator = read('../src/mobile-ui-coordinator.js');
const layout = read('../src/mobile-first-layout.css');

test('one shared layout stylesheet is the app shell authority', () => {
  assert.match(main, /import ['"]\.\/mobile-first-layout\.css['"]/);
  assert.doesNotMatch(main, /import ['"]\.\/mobile-first-overhaul\.css['"]/);
});

test('desktop and tablet layout trees are not mounted', () => {
  for (const legacy of [
    'v713-desktop-rail.js',
    'v881-tablet-workspace.css',
    'v881-tablet-header-unified.css',
    'v881-tablet-tool-rail.js',
    'v881-desktop-ui.css',
    'v881-portrait-zoom-responsive.css',
    'v912-desktop-poi.css',
    'v913-pc-design-system.css'
  ]) assert.equal(main.includes(legacy), false, legacy);
  assert.doesNotMatch(main, /installDesktopSafetyRail\s*\(/);
  assert.doesNotMatch(html, /src="\/src\/(?:v862-pc-mobile-separation|v876-desktop-final)\.js"/);
});

test('the same toolbar and swipe rail mount at every viewport width', () => {
  assert.match(toolbar, /matchMedia\('\(min-width:\s*0px\)'\)/);
  assert.match(swipe, /matchMedia\('\(min-width:\s*0px\)'\)/);
  assert.match(html, /mobile-toolbar-v794\.js/);
  assert.match(html, /v831-swipe-feature-toolbar\.js/);
});

test('shared chrome metrics are not gated to phone or tablet widths', () => {
  assert.doesNotMatch(coordinator, /window\.innerWidth\s*<=\s*1079/);
  assert.match(coordinator, /--dj-header-h/);
  assert.match(coordinator, /--dj-mobile-nav-h/);
});

test('one five-item bottom dock replaces desktop and tablet side rails', () => {
  assert.match(layout, /#bottom-nav:not\(\[hidden\]\)\s*\{[\s\S]*?position:\s*fixed\s*!important/);
  assert.match(layout, /grid-template-columns:\s*repeat\(5,\s*minmax\(0,1fr\)\)/);
  assert.match(layout, /#dj-desktop-safety-rail/);
  assert.match(layout, /#dj-tablet-utility-group/);
  assert.match(layout, /#bottom-nav\s*>\s*\.nav-tab/);
});

test('search, toolbar, map actions and panels use the shared floating-app geometry', () => {
  assert.match(layout, /\.topbar\s*\{[\s\S]*?position:\s*fixed\s*!important/);
  assert.match(layout, /#dj-v794-toolbar\s*\{[\s\S]*?position:\s*fixed\s*!important/);
  assert.match(layout, /\.map-actions\s*\{[\s\S]*?position:\s*fixed\s*!important/);
  assert.match(layout, /#route-panel,#participation-panel,#news-panel,#mine-panel/);
  assert.match(layout, /#map-safety-controls,#map-advanced-controls/);
});
