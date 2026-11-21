import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css=readFileSync(new URL('../src/v890-mobile-dock-ai-night.css',import.meta.url),'utf8');
const js=readFileSync(new URL('../src/v890-mobile-ai-orb.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('all new mobile UI changes are isolated and loaded after old mobile CSS',()=>{
  assert.match(html,/v875-mobile-stability\.css[\s\S]*v890-mobile-dock-ai-night\.css/);
  assert.match(html,/v890-mobile-ai-orb\.js/);
  assert.match(css,/@media \(max-width:699px\)/);
  assert.match(css,/#participation-panel/);
  assert.match(css,/#route-panel/);
  assert.match(css,/#dj840-map-tip/);
  assert.match(css,/--dj890-dock-gap:30px/);
  assert.match(css,/--dj890-pill-gap:35px/);
  assert.match(css,/:not\(\.dj871-sheet-expanded\)/);
});

test('AI orb is functional and native night theme pipeline stays in place',()=>{
  assert.match(css,/#dj890-ai-orb/);
  assert.match(css,/#dj887-ai-quick-entry/);
  assert.match(css,/@keyframes dj890-ai-green-cycle/);
  assert.match(js,/getElementById\('dj887-ai-quick-entry'\)/);
  assert.match(js,/dongjak:explicit-ai-open/);
  assert.match(js,/startedOnOrb/);
  assert.doesNotMatch(js,/modal\.showModal\(/);
  assert.match(js,/insertBefore\(orb,theme\)/);
  assert.match(js,/media\.addEventListener/);
  assert.match(js,/media\.removeEventListener/);
  assert.match(html,/id="theme-toggle"/); // kept for night-mode programmatic calls
});

test('night analysis only removes blur from its own backdrop and reload splash',()=>{
  assert.match(css,/#dj833-night-modal/);
  assert.match(css,/#night-visibility-float/);
  assert.match(css,/-webkit-backdrop-filter:none!important/);
  assert.match(css,/html\[data-dj-reload-mode="night"\]/);
  assert.doesNotMatch(css,/\*\s*\{\s*backdrop-filter:none/);
});
