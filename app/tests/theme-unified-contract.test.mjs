import {readPrimaryPhoneCss} from './helpers/primary-phone-css.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');

test('one theme stylesheet with light-only public UI',()=>{
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
  assert.doesNotMatch(env,/requestIosThemeRefresh\(/);
  assert.match(html,/var displayTheme='light'/);
  assert.doesNotMatch(html,/id="theme-toggle"/);
  assert.match(html,/\.map-startup-overlay\{display:none!important;\}/);
  assert.doesNotMatch(env,/setTemporaryTheme/);
  assert.ok(env.includes("const theme='light'"));
  assert.doesNotMatch(env,/suppressPreferenceSave|showThemeTransition|themeFlash/);
  assert.ok(env.includes('app.dataset.theme=theme'));
  const clickBlock=env.split("toggle?.addEventListener('click',()=>{")[1]?.split('const setTemporaryTheme=')[0]||'';
  assert.doesNotMatch(clickBlock,/map\.(?:jumpTo|flyTo|setStyle|setCenter)|location\.reload|new maplibregl\.Map/);
  assert.equal(existsSync(new URL('../src/theme-contract-v9275.js',import.meta.url)),false);
});

test('retired night mode cannot be activated from the public theme controller',()=>{
  const env=read('src/ui-environment.js');
  assert.doesNotMatch(env,/themeState\.override|setTemporaryTheme/);
  assert.match(env,/return 'light';/);
  assert.doesNotMatch(env,/safeStorageSet\(THEME_KEY/);
});

test('guest onboarding reappears on a new signed-out session',()=>{
  const tour=read('src/v860-onboarding.js');
  assert.ok(tour.includes("if(authState==='signed-out'||pendingGuestOnboarding)"));
  assert.ok(tour.includes('seenInMemory=isNativeThemeRefresh'));
  assert.ok(tour.includes("if(!auto)overlay.dataset.dj860Manual='true'"));
});

test('shared light color tokens preserve safety semantics',()=>{
  const css=read('src/theme-contract.css');
  const isolated=new URL('../src/mobile-next.css',import.meta.url);
  const prod=readFileSync(isolated,'utf8');
  const layout=read('src/mobile-first-layout.css');
  const material=read('src/button-material.css');
  for(const c of ['#edf3ef','#ffffff','#e9f2ed','#20312e','#53675e','#0d8875','#e1ecec'])assert.ok(css.includes(c),c);
  assert.doesNotMatch(css,/data-theme="dark"|color-scheme:dark/);
  for(const token of ['--dj-theme-bg','--dj-theme-surface','--dj-theme-ink','--dj-theme-muted','--dj-theme-line','--dj-theme-accent'])assert.ok(css.includes(token));
  assert.ok(prod.includes('--dj9272-surface:#f5faf7'));
  assert.ok(css.includes('--dj-v4-selected:#e1ecec'));
  assert.ok(layout.includes('--mf-surface: #ffffff'));
  assert.ok(material.includes('--djNext-tool-selected-face:#dcf3e8'));
  assert.ok(css.includes('never paint route-line, warning, PRI or transport'));
});

test('iOS PWA status controller owns the status-area meta rather than two writers',()=>{
  const controller=read('src/theme-contract.js');
  const ios=read('src/mobile-pwa-status-tone-v793.js');
  assert.ok(controller.includes('isIosHomeScreenPhone(win)'));
  assert.ok(controller.includes('!isIosHomeScreenPhone(win)'));
  assert.ok(ios.includes("themeMeta.setAttribute('content',color)"));
  assert.equal(existsSync(new URL('../public/manifest-dark.webmanifest',import.meta.url)),false);
  assert.equal(JSON.parse(read('public/manifest-light.webmanifest')).theme_color,'#edf3ef');
});

test('mobile full-height primary pages retain the light status-edge base',()=>{
  const css=readPrimaryPhoneCss();
  const contract=read('src/theme-contract.css');
  assert.match(css,/--dj-primary-page-bg:#edf3ef/);
  assert.match(contract,/--dj-theme-bg:#edf3ef/);
  assert.match(contract,/--dj-primary-page-bg:#edf3ef!important/);
});

test('light phone actions keep the selected news and disabled route states',()=>{
 const mobile=read('src/mobile-next.css');
 const contract=read('src/theme-contract.css');
 assert.match(mobile,/#news-panel \.dongjak-news-tabs \[data-news-source\]\.active\{background:var\(--djNext-active\)!important;color:#fff!important/);
 assert.match(mobile,/#route-panel #route-calc:disabled\{opacity:\.52!important;cursor:not-allowed!important;box-shadow:none!important/);
 assert.match(contract,/--djNext-active:#0d8875!important/);
 assert.doesNotMatch(contract,/data-theme="dark"/);
});

test('MapLibre labels stay readable in light mode, while PRI TIP is hidden and route footer hugs dock',()=>{
  const env=read('src/ui-environment.js');
  const pri=read('src/pri-map.js');
  const contract=read('src/theme-contract.css');
  const isolated=new URL('../src/mobile-next.css',import.meta.url);
  const ui=readFileSync(isolated,'utf8');
  const html=read('index.html');
  assert.match(env,/mapLabelLightPaint=Object\.freeze/);
  assert.ok(env.includes("color:'#26352f'"));
  assert.ok(env.includes("halo:'rgba(255,255,255,0.97)'"));
  assert.ok(env.includes("map.on('styledata',scheduleMapLabelContrast)"));
  assert.ok(env.includes("supplementalLabelBaseline"));
  assert.ok(env.includes("'text-halo-width':mapLabelLightPaint.width"));
  assert.doesNotMatch(env,/themeState\.value/);
  assert.ok(pri.includes("doc.documentElement.dataset.djPriActive=id?'true':'false'"));
  assert.ok(ui.includes('html[data-dj-pri-active="true"]'));
  assert.ok(ui.includes("padding-bottom:var(--dj910-dock-bottom"));
  assert.ok(ui.includes("#route-panel #route-calc"));
  assert.ok(contract.includes("body > :is(#dj-pri-dialog,.dj-pri-dialog)"));
  assert.ok(contract.includes("color:#20312e!important"));
  assert.ok(html.includes("var displayTheme='light'"));
  assert.ok(!html.includes("localStorage.getItem('dongjak_safety_color_theme_v1')"));
});

test('light buildings retain their approved near and far opacity and smooth zoom fade',async()=>{
 const {BUILDING_VISUAL_PALETTE,buildingExtrusionAppearance,buildingZoomOpacityExpression}=await import('../src/map-appearance.js');
 assert.deepEqual(Object.keys(BUILDING_VISUAL_PALETTE),['light']);
 assert.equal(BUILDING_VISUAL_PALETTE.light.nearOpacity,.38);
 assert.equal(BUILDING_VISUAL_PALETTE.light.farOpacity,.22);
 assert.equal(buildingExtrusionAppearance('dark',10).opacity,.38);
 assert.equal(buildingExtrusionAppearance('dark',30).opacity,.22);
 assert.deepEqual(buildingZoomOpacityExpression(.22),['interpolate',['linear'],['zoom'],13,0,15,.22]);
});

test('native dialog and AI backdrops remain transparent while floating cards keep shadows',()=>{
 const css=read('src/theme-contract.css');
 const tail=css.split('User-facing window policy: no native browser dialog backdrop dimming')[1]||'';
 assert.ok(tail.includes('::backdrop'));
 assert.match(tail,/background-color:transparent!important/);
 assert.match(tail,/backdrop-filter:none!important/);
 assert.match(tail,/opacity:0!important/);
 assert.match(css,/box-shadow:0 8px 22px rgba/);
});
