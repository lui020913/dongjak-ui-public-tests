import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const js=read('src/v860-onboarding.js');
const css=read('src/v860-onboarding.css');
const html=read('index.html');
const language=read('src/v854-language.js');
const readme=read('README_V860_ONBOARDING_20261114.md');
const appVersion=read('src/app-version.js');

test('v8.6.0 provides five factual onboarding screens with the five portrait screenshot slots',()=>{
  assert.match(js,/ONBOARDING_SLIDES=Object\.freeze\(\[/);
  const slideBlock=js.split('export const ONBOARDING_SLIDES=Object.freeze([')[1].split('const ARTWORK')[0];
  assert.equal((slideBlock.match(/key:'(?:welcome|safety|route|discover|account)'/g)||[]).length,5);
  for(const slot of ['map-overview','safety-layers','walking-route','local-discovery','account-favorites']) {
    assert.ok(js.includes(slot),`missing image slot ${slot}`);
    assert.ok(readme.includes(slot),`missing image slot documentation ${slot}`);
  }
  assert.match(js,/ONBOARDING_IMAGE_SLOTS=Object\.freeze\(\[/);
  assert.equal((js.match(/file:'public\/onboarding\/0[1-5]-[a-z-]+\.png'/g)||[]).length,5);
  assert.match(js,/data-image-slot/);
  assert.match(js,/dj860-screen-image/);
  assert.match(js,/ARTWORK\[slide\.key\]/);
});

test('first-run onboarding waits for startup completion and persists only after skip or completion',()=>{
  assert.match(js,/dongjak_onboarding_seen_v860/);
  assert.match(js,/if\(complete\)\{writeSeen\(win\);seenInMemory=true;\}/);
  assert.match(js,/if\(auto&&\(seenInMemory\|\|readSeen\(win\)\)&&!force\)return/);
  assert.match(js,/startupObserver\.observe\(startup,\{attributes:true,attributeFilter:\['hidden'\]\}\)/);
  assert.match(js,/if\(!startup\|\|startup\.hidden\)open\(\{auto:true\}\)/);
});

test('navigation supports swipe, buttons, page dots, keyboard, skip and start actions',()=>{
  for(const token of ['data-dj860-action="prev"','data-dj860-action="next"','dataset.dj860Action=\'dot\'','event.key===\'ArrowRight\'','event.key===\'ArrowLeft\'','event.key===\'Escape\'','Math.abs(dx)>=54']) {
    assert.ok(js.includes(token),`missing interaction ${token}`);
  }
  assert.match(js,/시작하기/);
  assert.match(js,/건너뛰기/);
});

test('onboarding can be reopened from More and the map gesture guide without replacing v8.5.7 UX',()=>{
  assert.match(js,/dj-mobile-utilities/);
  assert.match(js,/dj-mobile-settings/);
  assert.match(js,/map-gesture-guide/);
  assert.match(js,/data-dj860-open/);
  assert.match(css,/\.dj860-more-launch/);
  assert.match(css,/\.dj860-guide-launch/);
  assert.match(html,/src\/v857-requested-ux\.js/);
  assert.match(html,/src\/v860-onboarding\.js/);
  assert.ok(html.indexOf('src="/src/v857-requested-ux.js"')<html.indexOf('src="/src/v860-onboarding.js"'));
  assert.match(html,/dj856-guide-head/);
  assert.match(html,/dj-guide-release-details/);
});

test('closing removes only the owning onboarding click listener and cancels the close timer safely',()=>{
  assert.match(js,/overlay\.addEventListener\('click',onClick,true\)/);
  assert.match(js,/overlay\.removeEventListener\('click',onClick,true\)/);
  assert.doesNotMatch(js,/doc\.addEventListener\('click',onClick\)/);
  assert.match(js,/if\(closeTimer\)win\.clearTimeout\(closeTimer\)/);
  assert.match(css,/\.dj860-onboarding\.is-closing/);
});

test('portrait mobile screenshots use a 9:19.5 viewport and fallback artwork remains available',()=>{
  assert.match(css,/aspect-ratio:9\/19\.5/);
  assert.match(css,/object-fit:contain/);
  assert.match(js,/image\.addEventListener\('error'/);
  assert.match(js,/visual\.innerHTML=ARTWORK\[slide\.key\]/);
  assert.match(readme,/1080 × 2340px/);
});

test('PC/mobile, light/dark and reduced-motion styles are present',()=>{
  assert.match(css,/@media\(max-width:699px\)/);
  assert.match(css,/#app\[data-theme="dark"\]/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css,/touch-action:pan-y/);
});

test('onboarding copy remains in the v8.6.0 release history while public version surfaces stay synchronized',()=>{
  for(const phrase of ['동작구의 길을 더 안전하게','필요한 안전정보만 지도에','도보 경로를 비교하고 안내받기','교통과 생활정보도 함께','로그인하면 즐겨찾기를 이어서','앱 처음부터 둘러보기']) {
    assert.ok(language.includes(phrase),`missing translation: ${phrase}`);
  }
  const currentVersion=JSON.parse(read('package.json')).version;
  assert.ok(appVersion.includes(`APP_VERSION="${currentVersion}"`));
  assert.ok(appVersion.includes('"version": "8.6.0"'));
   assert.ok(html.includes('<title>동작하는 안전지도 · 보행안전 지도</title>'));
   assert.ok(html.includes('id="map-startup-version" aria-label="앱 버전">버전 1.0'));
});
