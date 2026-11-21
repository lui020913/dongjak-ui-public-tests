import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const mobileCss=()=>{
  try{return read('src/mobile-next.css');}
  catch(error){if(error?.code!=='ENOENT')throw error;return read('../frontend/production/mobile-next.css');}
};
test('mobile search keeps AI orb visible while search suggestions are open',()=>{
  const css=mobileCss();
  assert.doesNotMatch(css,/:is\(\[data-search-open="true"\],\[data-dj-voice-feedback="true"\]\) \.topbar>\.header-tools:has\(#dj890-ai-orb\)/);
  assert.doesNotMatch(css,/:is\(\[data-search-open="true"\],\[data-dj-voice-feedback="true"\]\) \.topbar #dj890-ai-orb/);
  assert.match(css,/\[data-dj-voice-feedback="true"\] \.topbar>\.header-tools:has\(#dj890-ai-orb\)/);
});
test('search suggestion panel anchors to actual pill and never spans beneath AI orb',()=>{
  const ui=read('src/map-quick-search.js');
  const css=mobileCss();
  assert.match(ui,/const anchor=shell\.getBoundingClientRect\(\)/);
  assert.match(ui,/--dj871-search-left/);
  assert.match(ui,/--dj871-search-width/);
  assert.match(css,/left:var\(--dj871-search-left,10px\)!important/);
  assert.match(css,/width:var\(--dj871-search-width,calc\(100vw - 20px\)\)!important/);
  assert.match(css,/border-radius:22px!important/);
});
