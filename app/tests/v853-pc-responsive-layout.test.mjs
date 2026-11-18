import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const css = read('src/v853-pc-responsive-fixes.css');
const rail = read('src/v713-desktop-rail.js');
const place = read('src/place-details.js');
const transit = read('src/transport-map.js');
const uxCss = read('src/v857-requested-ux.css');

test('PC topbar assigns the app icon, search and tools to explicit responsive grid areas', () => {
  assert.match(css, /@media\s*\(min-width:\s*1080px\)/);
  assert.doesNotMatch(css, /@media\s*\(min-width:\s*700px\) and \(max-width:\s*1079px\)/);
  assert.match(css, /grid-template-areas:\s*'brand search tools'/);
  assert.match(css, /grid-template-columns:\s*56px\s+minmax\(0,1fr\)\s+auto/);
  assert.match(css, /#dj-about-pc\s*\{[\s\S]*?grid-area:brand/);
  assert.match(css, /#dj-settings-mobile\{display:none/);
  assert.match(css, /#map-quick-search-dropdown\{[\s\S]*?left:-80px/);
});

test('PC-only safety workspace keeps a two-column workbench and moves road-width control into the safety group', () => {
  assert.match(css, /#map-safety-controls\{[\s\S]*?grid-template-columns:clamp\(142px,16vw,184px\) minmax\(0,1fr\)/);
  assert.match(rail, /minWidth=1080/);
  assert.match(rail, /#dj-safety-actions \.dj-safety-group-body/);
  assert.match(rail, /roadWidthSlot\.parentNode\.insertBefore\(roadWidth,roadWidthSlot\.nextSibling\)/);
  assert.match(css, /\.dj-pc-road-width-slot/);
});

test('PC news toolbar is separated from the sticky header and hides the scrollbar', () => {
  assert.match(css, /#news-panel > header\.dj-sheet-chrome\{[\s\S]*?position:sticky/);
  assert.match(css, /#news-panel \.dongjak-news-toolbar\{[\s\S]*?margin:12px 0 16px/);
  assert.match(css, /#news-panel\.page-panel:not\(\[hidden\]\)::?-webkit-scrollbar/);
});

test('PC transport sheet removes the mobile grip, keeps the header sticky, and uses larger route actions', () => {
  assert.match(css, /@media \(min-width:1080px\)\{[\s\S]*?#transport-sheet\.dj-news-transit-fixed>\.handle\{display:none/);
  assert.match(css, /#transport-sheet\.dj-news-transit-fixed \.transport-panel-head\{[\s\S]*?position:sticky/);
  assert.match(css, /\.dj-news-transport-quick-button\{[\s\S]*?font-size:16px/);
  assert.match(css, /\.dj-news-transport-bookmark\{[\s\S]*?width:44px/);
  assert.match(css, /\.metro-neighbor-row :is\([\s\S]*?box-shadow:none/);
});

test('PC facility detail keeps a sticky header, five-action row and hidden-until-saved folder', () => {
  assert.match(css, /\.dj-place-detail-popup \.maplibregl-popup-content\{[\s\S]*?scrollbar-width:none/);
  assert.match(css, /\.dj-place-detail-popup \.dj-place-desktop-header\{[\s\S]*?position:sticky/);
  assert.match(uxCss, /\.dj-place-header-actions\{[\s\S]*?display:flex/);
  assert.match(place, /const desktopDetail=Boolean\(window\.matchMedia\?\.\('\(min-width:1080px\)'\)\?\.matches\)/);
  assert.match(place, /folderWrap\.hidden=desktopDetail&&!isPlaceSaved\(p\)/);
  assert.match(place, /if\(desktopDetail\)folderWrap\.hidden=!result\.saved/);
  assert.match(place, /shareButton\.className='dj856-place-share'/);
  assert.match(place, /headerActions\.append\(routeActions\)/);
  assert.match(place, /headerActions\.append\(personalActions\)/);
  assert.match(place, /header\.append\(edge,titleGroup,headerActions\)/);
  assert.match(place, /dj-place-header-close/);
});

test('stale selected-place pins are hidden outside active facility or transport detail views', () => {
  assert.match(css, /#app#app:not\(:has\(\.dj-place-detail-popup\)\):not\(:has\(#transport-sheet:not\(\[hidden\]\)\)\)/);
  assert.match(css, /#map \.maplibregl-marker:has\(\.dj807-facility-pin\)/);
});

test('PC bus-stop pictograms are larger and both device classes have clearance below labels', () => {
  assert.match(transit, /16\.4,0\.34,18\.2,0\.42,20,0\.49/);
  assert.match(transit, /desktop\?\[0,2\.25\]:\[0,1\.85\]/);
  assert.match(transit, /desktop\?\[0,2\.1\]:\[0,1\.85\]/);
  assert.doesNotMatch(css, /@media\s*\(max-width:\s*699px\)/);
});


test('v8.5.2 mobile UX stylesheet and module remain loaded alongside PC-only overrides', () => {
  const html = read('index.html');
  assert.match(html, /v852-mobile-ux\.css/);
  assert.match(html, /v853-pc-responsive-fixes\.css/);
  assert.match(html, /v852-mobile-ux\.js/);
  assert.ok(html.indexOf('v852-mobile-ux.css') < html.indexOf('v853-pc-responsive-fixes.css'));
});

test('declining the night-visibility confirmation restores the inactive PC shortcut label', () => {
  const source = read('src/v831-swipe-feature-toolbar.js');
  assert.match(source, /data-choice="no"[\s\S]*?min-width:1080px/);
  assert.match(source, /quickOff\.setAttribute\('aria-pressed','false'\)/);
  assert.match(source, /quickOff\.setAttribute\('aria-label','야간 시야 켜기'\)/);
  assert.match(source, /label\.textContent='야간 시야'/);
});
