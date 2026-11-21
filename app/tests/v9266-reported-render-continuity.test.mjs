import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';

const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('tour retains opaque old artwork and text until the next decoded image exists',()=>{
  const js=read('src/v860-onboarding.js');
  const css=read('src/v860-onboarding.css');
  assert.match(js,/function holdOutgoingSlide\(\)/);
  assert.match(js,/\[visualPane,overlay\.querySelector\('\.dj860-content'\)\]/);
  assert.match(js,/source\.cloneNode\(true\)/);
  assert.match(js,/ghost\.setAttribute\('aria-hidden','true'\)/);
  assert.match(js,/ghost\.querySelectorAll\('\[id\]'\)/);
  assert.match(js,/preload\.decode\(\)/);
  assert.match(js,/render\(target,direction,false\)/);
  assert.match(js,/clearSlideGhosts\(\)/);
  assert.match(css,/@keyframes dj9266-retained-slide-out/);
  assert.doesNotMatch(js,/node\.style\.setProperty\('opacity','0','important'\)/);
});

test('primary pages never fade out their own opaque background on tab entry',()=>{
  const css=read('src/mobile-primary-fullscreen.css');
  assert.match(css,/\.page-panel:not\(\[hidden\]\):not\(\[data-dj810-animating\]\)/);
  assert.match(css,/animation:none!important;\s*opacity:1!important/);
  assert.doesNotMatch(css,/@keyframes dj-primary-page-enter/);
  assert.match(css,/#bottom-nav:not\(\[hidden\]\) \.nav-tab:not\(\[hidden\]\)/);
  assert.match(css,/visibility:visible!important/);
});

test('community composer and feed use one native-status-matched primary surface',()=>{
  const css=read('src/mobile-primary-fullscreen.css');
  const controller=existsSync(new URL('../src/mobile-17-followup.js',import.meta.url))
    ?read('src/mobile-17-followup.js')
    :read('../frontend/production/mobile-17-followup.js');
  assert.match(css,/--dj-primary-page-bg:#edf3ef/);
  assert.match(controller,/background:'var\(--dj-primary-page-bg,#edf3ef\)'/);
  assert.doesNotMatch(controller,/background:'var\(--mf-surface-solid,#fff\)'/);
});

test('iOS modal top edge blends into the native color, including native dialog backdrops',()=>{
  const css=read('src/mobile-pwa-status-tone-v793.css');
  assert.match(css,/:has\(#dj860-onboarding:not\(\[hidden\]\),#map-gesture-guide:not\(\[hidden\]\)\)/);
  assert.match(css,/z-index:25000!important/);
  assert.match(css,/#dj-ai-search-modal\[open\]::backdrop/);
  assert.match(css,/background-image:var\(--dj-pwa-bridge-gradient\)!important/);
  assert.match(css,/#djNext-layer-panel:not\(\[hidden\]\)::backdrop/);
});

test('weather detail, observation and action row have consistent horizontal padding',()=>{
  const css=read('src/mobile-first-layout.css');
  assert.match(css,/\.dj854-weather-detail\s*\{\s*margin: 8px 18px 16px !important/);
  assert.match(css,/\.dj854-weather-actions\s*\{\s*margin: 0 18px 18px !important/);
  assert.match(css,/\.dj854-weather-observed\s*\{\s*margin: 10px 18px !important/);
});
