import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const phoneCss=()=>{
  try{return read('src/mobile-next.css');}
  catch(error){if(error?.code!=='ENOENT')throw error;return read('../frontend/production/mobile-next.css');}
};

test('empty mobile search focus leaves results hidden until a query exists',()=>{
  const js=read('src/map-quick-search.js');
  assert.match(js,/const phoneSearch=\(\)=>window\.matchMedia/);
  assert.match(js,/if\(phoneSearch\(\)&&term\.length<2\)\{close\(\);return;\}/);
  assert.match(js,/if\(term\.length<2\)\{show\(\);render\(\[\],true\)/); // Explicit empty submit still offers suggestions.
});

test('opening search does not collapse or disable the independent AI entry',()=>{
  const css=phoneCss();
  assert.doesNotMatch(css,/:is\(\[data-search-open="true"\],\[data-dj-voice-feedback="true"\]\) \.topbar>\.header-tools:has\(#dj890-ai-orb\)/);
  assert.doesNotMatch(css,/:is\(\[data-search-open="true"\],\[data-dj-voice-feedback="true"\]\) \.topbar #dj890-ai-orb/);
  assert.match(css,/\.topbar>\.header-tools:has\(#dj890-ai-orb\)\{[^}]*width:62px!important/);
});

test('microphone and search-results layout remain stable during keyboard use',()=>{
  const css=phoneCss();
  assert.match(css,/#djNext-mic\{[^}]*min-width:36px!important;max-width:36px!important/);
  assert.match(css,/#djNext-mic\{[^}]*visibility:visible!important;opacity:1!important/);
  assert.match(css,/#map-quick-search-dropdown:not\(\[hidden\]\)\{[^}]*border-radius:22px!important/);
  const keyboard=read('src/v884-mobile-search-keyboard.js');
  assert.match(keyboard,/--dj884-search-room/);
});
