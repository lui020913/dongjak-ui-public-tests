import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
// The sealed release carries the copied CSS at src/mobile-next.css.
const readPhoneCss=()=>existsSync(new URL('../src/mobile-next.css',import.meta.url))
  ?read('src/mobile-next.css'):read('../frontend/production/mobile-next.css');

test('empty mobile search focus leaves results hidden only when there is no history or query',()=>{
  const js=read('src/map-quick-search.js');
  assert.match(js,/const phoneSearch=\(\)=>window\.matchMedia/);
  assert.match(js,/if\(phoneSearch\(\)&&term\.length<2&&!recentPlaces\(\)\.length&&!recentSearchQueries\(\)\.length\)\{close\(\);return;\}/);
  assert.match(js,/if\(term\.length<2\)\{show\(\);render\(\[\],true\)/); // Explicit empty submit still offers suggestions.
});

test('opening search does not collapse or disable the independent AI entry',()=>{
  const css=readPhoneCss();
  assert.doesNotMatch(css,/:is\(\[data-search-open="true"\],\[data-dj-voice-feedback="true"\]\) \.topbar>\.header-tools:has\(#dj890-ai-orb\)/);
  assert.doesNotMatch(css,/:is\(\[data-search-open="true"\],\[data-dj-voice-feedback="true"\]\) \.topbar #dj890-ai-orb/);
  assert.match(css,/\.topbar>\.header-tools:has\(#dj890-ai-orb\)\{[^}]*width:62px!important/);
});

test('microphone and search-results layout remain stable during keyboard use',()=>{
  const css=readPhoneCss();
  assert.match(css,/#djNext-mic\{[^}]*min-width:36px!important;max-width:36px!important/);
  assert.match(css,/#djNext-mic\{[^}]*visibility:visible!important;opacity:1!important/);
  assert.match(css,/#map-quick-search-dropdown:not\(\[hidden\]\)\{[^}]*border-radius:22px!important/);
  const keyboard=read('src/v884-mobile-search-keyboard.js');
  assert.match(keyboard,/--dj884-search-room/);
});
