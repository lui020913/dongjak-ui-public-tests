import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');

test('one theme stylesheet; native iOS status refresh only after explicit choice',()=>{
  const html=read('index.html');
  const main=read('src/main.js');
  const env=read('src/ui-environment.js');
  const old=read('src/manual-pwa-theme-reload.js');
  assert.ok(html.includes('/src/theme-contract.js'));
  assert.equal(html.includes('/src/theme-contract-v9275.js'),false);
  assert.doesNotMatch(html,/var pending=null;/);
  assert.doesNotMatch(html,/data-dj-reload-splash="true"/);
  assert.doesNotMatch(main,/installManualThemeReload\(\{/);
  assert.match(old,/win\.location\.reload\(\)/);
  assert.match(old,/isInstalledIosPhone\(win\)/);
  assert.match(old,/MANUAL_THEME_RELOAD_KEY/);
  assert.doesNotMatch(env,/requestIosThemeRefresh/);
  assert.match(env,/displayTheme\(\{notify:true\}\)/);
  assert.ok(env.includes('createThemeState(getInitialTheme())'));
  assert.doesNotMatch(env,/suppressPreferenceSave|showThemeTransition|themeFlash/);
  assert.ok(env.includes('const changed=app.dataset.theme!==next'));
  const clickBlock=env.split("toggle?.addEventListener('click',()=>{")[1]?.split('const setTemporaryTheme=')[0]||'';
  assert.doesNotMatch(clickBlock,/map\.(?:jumpTo|flyTo|setStyle|setCenter)|location\.reload|new maplibregl\.Map/);
  assert.equal(existsSync(new URL('../src/theme-contract-v9275.js',import.meta.url)),false);
});

test('night mode does not click theme button or override saved manual choice',()=>{
  const night=read('src/night-visibility-map.js');
  const env=read('src/ui-environment.js');
  assert.doesNotMatch(night,/themeBeforeNight/);
  assert.match(night,/applyTemporaryTheme\('dark'\)/);
  assert.match(night,/applyTemporaryTheme\(null\)/);
  assert.doesNotMatch(night,/themeToggle\.click\(/);
  assert.match(env,/themeState\.override\(next\)/);
  assert.match(env,/safeStorageSet\(THEME_KEY,themeState\.preference\)/);
});

test('guest onboarding reappears on a new signed-out session',()=>{
  const tour=read('src/v860-onboarding.js');
  assert.ok(tour.includes("if(authState==='signed-out'||pendingGuestOnboarding)"));
  assert.ok(tour.includes("if(!auto)overlay.dataset.dj860Manual='true'"));
});

test('shared color tokens protect legacy dark selectors and leave safety semantics',()=>{
  const css=read('src/theme-contract.css');
  const isolated=new URL('../src/mobile-next.css',import.meta.url);
  const prod=readFileSync(existsSync(isolated)?isolated:new URL('../../frontend/production/mobile-next.css',import.meta.url),'utf8');
  const layout=read('src/mobile-first-layout.css');
  const material=read('src/button-material.css');
  for(const c of ['#22282e','#2c343d','#35404a','#f1f4f6','#bec8d2','#79dec5','#285b50'])assert.ok(css.includes(c),c);
  for(const token of ['--dj-theme-bg','--dj-theme-surface','--dj-theme-ink','--dj-theme-muted','--dj-theme-line','--dj-theme-accent'])assert.ok(css.includes(token));
  assert.ok(prod.includes('--dj9272-surface:var(--dj-theme-surface'));
  assert.ok(prod.includes('--dj-v4-selected:var(--dj-theme-selected'));
  assert.ok(layout.includes('var(--dj-theme-surface,#2c343d)'));
  assert.ok(material.includes('--djNext-tool-selected-face:var(--dj-theme-selected'));
  assert.ok(css.includes('never paint route-line, warning, PRI or transport'));
});

test('iOS PWA status controller owns the status-area meta rather than two writers',()=>{
  const controller=read('src/theme-contract.js');
  const ios=read('src/mobile-pwa-status-tone-v793.js');
  assert.ok(controller.includes('isIosHomeScreenPhone(win)'));
  assert.ok(controller.includes('!isIosHomeScreenPhone(win)'));
  assert.ok(ios.includes("themeMeta.setAttribute('content',color)"));
  assert.equal(JSON.parse(read('public/manifest-dark.webmanifest')).theme_color,'#22282e');
  assert.equal(JSON.parse(read('public/manifest-light.webmanifest')).theme_color,'#edf3ef');
});

test('mobile full-height primary pages retain the charcoal status-edge base',()=>{
  const css=read('src/mobile-primary-fullscreen.css');
  const contract=read('src/theme-contract.css');
  assert.match(css,/--dj-primary-page-bg:#22282e/);
  assert.match(contract,/--dj-theme-bg:#22282e/);
  assert.match(contract,/--dj-primary-page-bg:#22282e!important/);
});

test('dark phone actions use readable selected text and route disabled colors',()=>{
 const contract=read('src/theme-contract.css');
 assert.match(contract,/#news-panel \.dongjak-news-tabs > button\.active/);
 assert.match(contract,/#participation-panel :is\(/);
 assert.match(contract,/\.community-post-category,\.community-location-link/);
 assert.match(contract,/#route-panel #route-calc:disabled/);
 assert.match(contract,/background:#404a54!important/);
 assert.match(contract,/color:#17232c!important/);
});

test('MapLibre labels stay readable in dark mode, while PRI TIP is hidden and route footer hugs dock',()=>{
  const env=read('src/ui-environment.js');
  const pri=read('src/pri-map.js');
  const contract=read('src/theme-contract.css');
  const isolated=new URL('../src/mobile-next.css',import.meta.url);
  const ui=readFileSync(existsSync(isolated)?isolated:new URL('../../frontend/production/mobile-next.css',import.meta.url),'utf8');
  const html=read('index.html');
  assert.match(env,/mapLabelTextPaint=Object\.freeze/);
  assert.ok(env.includes("color:'#f1f4f6'"));
  assert.ok(env.includes("halo:'rgba(18,25,32,0.97)'"));
  assert.ok(env.includes("map.on('styledata',scheduleMapLabelContrast)"));
  assert.ok(env.includes("supplementalLabelBaseline"));
  assert.ok(env.includes("'text-halo-width':mapLabelTextPaint.width"));
  assert.ok(env.includes("themeState.value==='dark'"));
  assert.ok(pri.includes("doc.documentElement.dataset.djPriActive=id?'true':'false'"));
  assert.ok(ui.includes('html[data-dj-pri-active="true"]'));
  assert.ok(ui.includes("padding-bottom:var(--dj910-dock-bottom"));
  assert.ok(ui.includes("#route-panel #route-calc"));
  assert.ok(contract.includes("body > .dj-pri-dialog"));
  assert.ok(contract.includes("color:#f1f4f6!important"));
  assert.ok(html.includes("var displayTheme=themeReload ? themeReload.theme : 'light'"));
  assert.ok(!html.includes("localStorage.getItem('dongjak_safety_color_theme_v1')"));
});
