import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=readFileSync(new URL('../src/mobile-primary-fullscreen.css',import.meta.url),'utf8');
const status=readFileSync(new URL('../src/mobile-pwa-status-tone-v793.js',import.meta.url),'utf8');

test('all four primary mobile pages use the same theme surface from header through content and footer',()=>{
  assert.match(css,/:is\(#route-panel,#participation-panel,#news-panel,#mine-panel\)\.page-panel:not\(\[hidden\]\)/);
  assert.match(css,/--dj-primary-page-bg:#edf3ef/);
  assert.match(css,/--dj-primary-page-bg:#252b32/);
  assert.match(css,/background:var\(--dj-primary-page-bg,#edf3ef\)!important/);
  for(const element of ['.dj-sheet-chrome','.dj836-sheet-body','#dj910-route-footer']){
    assert.ok(css.includes(element),element+' should be included in primary surface rules');
  }
  assert.doesNotMatch(css,/background:var\(--mf-surface-solid,#fff\)!important/);
  assert.doesNotMatch(css,/background:#191b1f!important/);
});

test('PWA native edge samples the same colors as light/dark primary pages',()=>{
  assert.match(status,/#edf3ef/);
  assert.match(status,/#252b32/);
  assert.match(css,/--dj-primary-page-ink:#203e34/);
  assert.match(css,/--dj-primary-page-ink:#f1f4f6/);
});
