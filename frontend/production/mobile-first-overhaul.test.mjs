import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=readFileSync(new URL('./mobile-first-overhaul.css',import.meta.url),'utf8');

test('mobile-first design tokens and dark theme are defined',()=>{
  for(const token of ['--mf-surface:','--mf-text:','--mf-brand:','--mf-border:','--mf-radius-sheet:','--mf-touch:']) {
    assert.ok(css.includes(token), 'Missing '+token);
  }
  assert.match(css,/#app\[data-theme="dark"\]/);\n  assert.match(css,/html\[data-theme="dark"\] #app/);
});

test('phone layout uses safe areas and map-first navigation',()=>{
  assert.match(css,/@media \(max-width: 699px\)/);
  assert.match(css,/env\(safe-area-inset-top/);
  assert.match(css,/env\(safe-area-inset-bottom/);
  assert.match(css,/#dj-v794-toolbar/);
  assert.match(css,/#bottom-nav/);
  assert.match(css,/mask-image: linear-gradient/);\n  assert.match(css,/#weather-label/);\n  assert.match(css,/#theme-toggle/);\n  assert.match(css,/#version-history-trigger/);
});

test('tablet and desktop share the same visual tokens',()=>{
  assert.match(css,/@media \(min-width: 700px\) and \(max-width: 1079px\)/);
  assert.match(css,/@media \(min-width: 1080px\)/);
  assert.match(css,/var\(--mf-surface\)/);
  assert.match(css,/var\(--mf-brand-soft\)/);
});

test('all main app surfaces receive the common sheet system',()=>{
  for(const selector of ['#route-panel','#participation-panel','#news-panel','#mine-panel','#transport-sheet','#detail-sheet','#entry-sheet']) {
    assert.ok(css.includes(selector),'Missing '+selector);
  }
  assert.match(css,/prefers-reduced-motion: reduce/);
});
