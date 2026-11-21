import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=readFileSync(new URL('./mobile-first-overhaul.css',import.meta.url),'utf8');

test('mobile-first design tokens and dark theme are defined',()=>{
  for(const token of ['--mf-surface:','--mf-text:','--mf-brand:','--mf-border:','--mf-radius-sheet:','--mf-touch:']) {
    assert.ok(css.includes(token), 'Missing '+token);
  }
  assert.match(css,/#app(?:#app){0,4}\[data-theme="dark"\]/);
  assert.match(css,/html\[data-theme="dark"\] #app/);
  assert.ok(css.includes('--mf-surface: #191b1f'));
});

test('phone layout uses safe areas and map-first navigation',()=>{
  assert.match(css,/@media \(max-width: 699px\)/);
  assert.match(css,/env\(safe-area-inset-top/);
  assert.match(css,/env\(safe-area-inset-bottom/);
  assert.match(css,/#dj-v794-toolbar/);
  assert.match(css,/#app#app#app#app#app#app \.topbar > #dj-settings-mobile/);
  assert.match(css,/#bottom-nav/);
  assert.ok(css.includes('mask-image: none !important;'));
  assert.equal(css.includes('mask-image: linear-gradient'),false);
  assert.match(css,/#weather-label/);
  assert.match(css,/#theme-toggle/);
  assert.match(css,/#version-history-trigger/);
  assert.match(css,/flex-basis: 52px/);
  assert.match(css,/bottom: max\(0px, env\(safe-area-inset-bottom/);
  assert.ok(css.includes('backdrop-filter: none !important;'));
  assert.equal(css.includes('backdrop-filter: blur(5px)'),false);
  assert.match(css,/@layer request-completion/);
});

test('the overhaul stylesheet is mobile-only',()=>{
  assert.match(css,/^@media \(max-width: 699px\) \{/);
  assert.doesNotMatch(css,/@media \(min-width:/);
  assert.match(css,/var\(--mf-surface\)/);
  assert.match(css,/var\(--mf-brand-soft\)/);
});

test('all main app surfaces receive the common sheet system',()=>{
  for(const selector of ['#route-panel','#participation-panel','#news-panel','#mine-panel','#transport-sheet','#detail-sheet','#entry-sheet']) {
    assert.ok(css.includes(selector),'Missing '+selector);
  }
  assert.match(css,/prefers-reduced-motion: reduce/);
});

test('mobile news source toolbar uses one opaque page tone instead of a white slab',()=>{
  const css=readFileSync(new URL('./mobile-next.css',import.meta.url),'utf8');
  const news=css.split('#news-panel .dongjak-news-toolbar{').at(-1)?.split('}')[0]||'';
  assert.match(news,/background:var\(--dj-primary-page-bg,#edf3ef\)!important/);
  assert.match(news,/border:0!important/);
  assert.match(news,/box-shadow:none!important/);
  const tabs=css.split('#news-panel .dongjak-news-tabs{').at(-1)?.split('}')[0]||'';
  assert.match(tabs,/background:var\(--djNext-raised,#e6f1e9\)!important/);
  assert.match(tabs,/border-radius:999px!important/);
});

test('mobile layer drawer stays scrollable and clears the final shortcut above the iOS inset',()=>{
  const css=readFileSync(new URL('./mobile-next.css',import.meta.url),'utf8');
  const scrollRules=css.split('#djNext-layer-panel .djNext-layer-scroll{').slice(1).map(rule=>rule.split('}')[0]);
  assert.ok(scrollRules.some(rule=>/padding-bottom:calc\(52px \+ env\(safe-area-inset-bottom,0px\)\)!important/.test(rule)),'No safe-area padding in layer scroll CSS');
  assert.ok(scrollRules.some(rule=>/scroll-padding-bottom:52px!important/.test(rule)),'Final list items may be clipped');
  const lastBody=css.split('#djNext-layer-panel .djNext-modal-body{').at(-1)?.split('}')[0]||'';
  assert.match(lastBody,/height:min\(56dvh,calc\(100dvh - env\(safe-area-inset-top,0px\)/);
});
