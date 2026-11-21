import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const onboarding=read('src/v860-onboarding.js');
const auth=read('src/v824-favorites-cloud.js');
const mapControls=read('src/mobile-map-controls.js');
const shell=read('src/v840-coordinated-ui.js');
const marquee=read('src/v854-tip-marquee.js');
const flowCss=read('src/v863-onboarding-flow.css');
const html=read('index.html');

test('guest onboarding respects completed-tour persistence on sign-out',()=>{
  assert.match(auth,/djAuthState='checking'/);
  assert.match(auth,/authApp\.dataset\.djAuthState=authenticated\?'signed-in':'signed-out'/);
  assert.ok(onboarding.includes("if((authState==='signed-out'||pendingGuestOnboarding)&&!readSeen(win))"));
  assert.match(onboarding,/open\(\{auto:true,force:true\}\)/);
  assert.match(onboarding,/if\(auto&&\(seenInMemory\|\|readSeen\(win\)\)&&!force\)return/);
});

test('the guest tour is a full-screen mobile surface without the old brand or English footer labels',()=>{
  assert.match(onboarding,/<header class="dj860-head"><button/);
  assert.doesNotMatch(onboarding,/<div class="dj860-brand"/);
  assert.doesNotMatch(onboarding,/dj860-visual-foot|dj860-visual-label|dj860-swipe-hint/);
  assert.doesNotMatch(onboarding,/slide\.kicker/);
  assert.match(flowCss,/width:100vw!important;height:100dvh!important/);
  assert.match(flowCss,/touch-action:pan-y!important/);
  assert.match(onboarding,/overlay\.addEventListener\('pointerdown',onPointerDown\)/);
  assert.match(onboarding,/overlay\.addEventListener\('pointerup',onPointerUp\)/);
  // Pointer capture on the whole modal used to swallow native button clicks on desktop.
  assert.doesNotMatch(onboarding,/overlay\.setPointerCapture\?\.\(event\.pointerId\)/);
  assert.match(flowCss,/font-size:15px!important/);
  assert.match(flowCss,/font-size:13\.5px!important/);
});

test('the Start action closes the tour first and then opens the map gesture guide once',()=>{
  assert.match(onboarding,/index===ONBOARDING_SLIDES\.length-1\)close\(\{afterClose:showMapGuide\}\)/);
  assert.match(onboarding,/function showMapGuide\(\)/);
  assert.match(onboarding,/dongjak:open-map-guide/);
  assert.doesNotMatch(onboarding,/trigger\.click\(\)/);
  assert.match(onboarding,/if\(typeof afterClose==='function'\)afterClose\(\)/);
  assert.match(mapControls,/if\(app\?\.dataset\?\.dj860OnboardingOpen==='true'\)\{markAutoShown\(\);return;\}/);
  assert.match(onboarding,/markGuideAutoShown\(\);/);
});

test('map guide iPhone and TIP accordions start collapsed and use one matching chevron',()=>{
  assert.match(shell,/guideToggle\.setAttribute\('aria-expanded','false'\)/);
  assert.match(shell,/guideList\.hidden=true/);
  assert.match(shell,/tipGuide\.classList\.add\('is-collapsed'\)/);
  assert.match(html,/<summary aria-expanded="false"><span>iPhone에서 앱처럼 사용하기<\/span><span class="dj852-tip-chevron"/);
  assert.doesNotMatch(html,/<details class="dj803-ios-install-help[^>]*open/);
  assert.match(flowCss,/details\.dj803-ios-install-help\[open\]>summary \.dj852-tip-chevron/);
  assert.match(flowCss,/dj841-guide-tips\.is-collapsed \.dj852-tip-chevron/);
  assert.match(flowCss,/min-height:38px!important/);
  assert.match(flowCss,/padding:4px 10px!important/);
  assert.doesNotMatch(html,/Safari에서 이 지도를 연 다음 공유 버튼/);
});

test('TIP text is isolated from the fixed TIP label and retains inner edge padding',()=>{
  assert.match(shell,/dj840-tip-copy-viewport/);
  assert.match(shell,/tipViewport\.append\(tipText\);label\.append\(tipMark,tipViewport\)/);
  assert.match(marquee,/querySelector\('\.dj840-tip-copy'\)/);
  assert.match(marquee,/viewport\.clientWidth-padding/);
  assert.match(flowCss,/padding:0 6px!important/);
  assert.match(flowCss,/gap:8px!important;padding:7px 12px!important/);
  assert.match(flowCss,/margin:0 5px 0 0!important/);
});
