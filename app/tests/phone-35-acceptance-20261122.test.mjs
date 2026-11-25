import {readPrimaryPhoneCss} from './helpers/primary-phone-css.mjs';
/**
 * The owner's November 22 mobile correction acceptance contract.
 * These 35 checks are implementation-level guardrails, NOT a substitute for
 * actual iOS/Android paint, gesture, API/network and battery measurements.
 * Keep the source code and matching browser tests mandatory in protected QA.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {observedFactorScore} from '../src/pri-data.mjs';
import {buildingExtrusionAppearance,buildingZoomOpacityExpression,nightOcclusionBuildingPaint} from '../src/map-appearance.js';
import {weeklyWeatherUrl} from '../src/v854-weather-desktop.js';
import {trainLaneOffset} from '../src/features/liveTransit/train-lanes.js';
import {featuredPlaceStyle} from '../src/featured-place-labels.js';
import {PUBLIC_APP_VERSION} from '../src/public-release-display.js';

const src=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const root=file=>readFileSync(new URL('../../'+file,import.meta.url),'utf8');
const contains=(content,...fragments)=>{for(const fragment of fragments)assert.ok(content.includes(fragment),'missing required behavior: '+fragment);};

const checks=[
 ['A01','bottom tabs synchronously reveal opaque destination without map flash',()=>{
   contains(src('src/bottom-tab-navigation.js'),'start(button)','page.hidden=true','clearEntrance()');
   contains(src('src/mobile-ux-energy.css'),'visibility:hidden!important','background-color:var(--dj-primary-page-bg');
 }],
 ['A02','public light-only UI has no active manual theme refresh, night visibility remains temporary',()=>{
   const html=src('index.html'),theme=src('src/ui-environment.js');
   contains(html,"var displayTheme='light'");
   assert.doesNotMatch(html,/id="theme-toggle"/);
   assert.doesNotMatch(theme,/requestIosThemeRefresh\(/);
   contains(theme,'themeState.override(next)');
 }],
 ['A03','closing another sheet cannot reopen the AI modal accidentally',()=>{
   contains(src('src/v880-supabase-safety-ai.js'),'transportDismissedAt','guardTransportDismiss','pointerStart','onExplicitEntryClick','event.isTrusted');
 }],
 ['A04','five bottom navigation buttons remain centered above safe area',()=>{
   const s=src('src/mobile-first-layout.css');
   contains(s,'#bottom-nav:not([hidden])','left: 50% !important','grid-template-columns: repeat(5,minmax(0,1fr))','safe-area-inset-bottom');
 }],
 ['A05','metro quota failure is a persistent inline status, not repeated toasts',()=>{
   contains(src('src/features/liveTransit/integrate.js'),'METRO_QUOTA_NOTICE','persistent inline status already explains the quota','Never spam a toast');
 }],
 ['A06','modeled but unobserved accident score is never interpreted as measured safety',()=>{
   assert.equal(observedFactorScore({scores:{accidents:100},evidence:{accidents:{modeled:true}}},'accidents'),null);
   assert.equal(observedFactorScore({scores:{accidents:40},evidence:{accidents:{modeled:false}}},'accidents'),40);
 }],
 ['A07','charcoal theme and light on dark typography use separate palette',()=>{
   const s=src('src/theme-contract.css');
   contains(s,'--dj-theme-bg:#22282e','--dj-theme-surface:#2c343d','--dj-theme-ink:#f1f4f6');
 }],
 ['A08','iOS reload restores camera tab and active vulnerability layer',()=>{
   const s=src('src/manual-pwa-theme-reload.js');
   contains(s,'camera','zoom','pitch','bearing','tab','priMode','MANUAL_THEME_RELOAD_KEY');
   contains(src('src/main.js'),'themeReloadState?.priMode','themeReloadState?.camera');
 }],
 ['B01','native iOS status surface matches first-run and theme surfaces',()=>{
   const s=src('src/mobile-pwa-status-tone-v793.js');
   contains(s,'--dj-pwa-status-color','const onboarding=visible','themeMeta.setAttribute');
   contains(src('src/mobile-pwa-status-tone-v793.css'),'#dj-ios-pwa-status-sample');
 }],
 ['B02','all map labels have dark text bright halo in light and vice versa',()=>{
   const s=src('src/ui-environment.js');
   contains(s,"mapLabelTextPaint=Object.freeze({color:'#f1f4f6',halo:'rgba(18,25,32,0.97)'","mapLabelLightPaint=Object.freeze({color:'#26352f',halo:'rgba(255,255,255,0.97)'");
   assert.equal(featuredPlaceStyle('light').text,'#6d817b');
   assert.equal(featuredPlaceStyle('dark').text,'#cbd6d3');
 }],
 ['B03','active and disabled buttons retain distinct surface, text and border colors',()=>{
   const s=src('src/theme-contract.css');
   contains(s,'--dj-brand-mint-selected:#285b50','--dj-brand-mint:#79dec5','#route-panel #route-calc:disabled');
   contains(src('src/mobile-ux-energy.css'),'.dj-pri-button:disabled');
 }],
 ['B04','icon-only close controls receive full-size 44px touch and focus targets',()=>{
   const s=src('src/theme-contract.css').split('Shared accessible glass-like icon controls')[1]||'';
   contains(s,'min-width:44px!important','min-height:44px!important',':focus-visible','touch-action:manipulation');
 }],
 ['B05','consistent close buttons have soft material elevation without blur',()=>{
   const s=src('src/theme-contract.css').split('Shared accessible glass-like icon controls')[1]||'';
   contains(s,'.dj854-weather-close','.dj-sheet-chrome-close','.djNext-close','.dj-ai-close','border-radius:999px!important','box-shadow:0 2px 9px','backdrop-filter:none!important');
 }],
 ['B06','native and DOM window backdrops remain undimmed while body transitions stay local',()=>{
   contains(src('src/theme-contract.css'),'User-facing window policy: no native browser dialog backdrop dimming','background-color:transparent!important','opacity:0!important');
   contains(src('src/bottom-tab-navigation.js'),'contentReveal:260','mapReturn:220','same JS tick');
 }],
 ['C01','PRI entry uses the requested walking-vulnerability naming',()=>{
   const s=src('src/pri-map.js');
   contains(s,'보행 취약도 평가자료','보행 취약도','PRI 위험점수 · 야간+사고 평균');
 }],
 ['C02','protection gap clearly documents 300m and two-factor 50:50 (no width)',()=>{
   const s=src('src/pri-map.js');
   contains(s,'상도1동 참고 행정경계 내부 도로만 표시','보호시설 9곳의 300m 거리','적용 가능 시 각 50%','도로폭은 제외합니다');
   const manifest=JSON.parse(src('public/data/pri/manifest.json'));
   assert.ok(manifest.patches.some(p=>p.includes('2factor')));
   assert.ok(!manifest.patches.some(p=>p.includes('3source')));
 }],
 ['C03','unassessed, modeled and out-of-range segments stay gray and outside score means',()=>{
   contains(src('src/pri-data.mjs'),'observedFactorScore','modeled===true');
   contains(src('src/pri-map.js'),"UNKNOWN_COLOR='#9CA3AF'",'회색: 미평가·미선정 (평균 제외)');
 }],
 ['C04','PRI legend has three source-derived risk classes and high risk means red',()=>{
   const s=src('src/pri-map.js');
   for(const t of ['저위험 (0~39)','주의 (40~69)','고위험 (70~100)','각 지수는 100점 만점(높을수록 위험)',"70,'#CF4248'"])contains(s,t);
   contains(src('src/pri-map.css'),'grid-template-columns:repeat(3,minmax(0,1fr))');
 }],
 ['C05','PRI road thickness and opacity vary continuously with zoom',()=>{
   const s=src('src/pri-map.js');
   contains(s,"15,2.35","['get','evaluated'],.88,.78");
 }],
 ['C06','opening PRI removes floating TIP and obstructing map scale',()=>{
   contains(src('src/pri-map.js'),'syncPriHud(Boolean(id))',"node.style.setProperty('display','none','important')");
   contains(src('src/map-scale-docking.js'),"app.dataset.djPriVisible==='true'");
 }],
 ['C07','dark 3D buildings are nearly opaque close-up and fade smoothly at distance',()=>{
   const near=buildingExtrusionAppearance('dark',10),far=buildingExtrusionAppearance('dark',30);
   assert.ok(near.opacity>=.9&&far.opacity>=.85);
   assert.deepEqual(buildingZoomOpacityExpression(far.opacity),['interpolate',['linear'],['zoom'],13,0,15,far.opacity]);
   assert.ok(nightOcclusionBuildingPaint(near,true).opacity>near.opacity);
 }],
 ['D01','route compares only computed pedestrian candidates and labels unknown PRI honestly',()=>{
   const s=root('tests/v911-anonymous-ui.spec.mjs');
   const ux=src('src/route-experience-20261123.js');
   contains(s,'phone route comparison uses actual pedestrian graph','#dj-route-choice-list','평가 자료 부족');
   contains(ux,'routeComparisonItems(latest)','평가 자료 부족','native.click()');
   assert.doesNotMatch(ux,/data-comparison="balanced"/);
 }],
 ['D02','route guidance supports GPS turns, destinations, and visible route map',()=>{
   const s=src('src/main.js');
   contains(s,'route-start-label','route-end-label','nav-voice');
   const spec=root('tests/v911-anonymous-ui.spec.mjs');
   contains(spec,'#route-map-card');
 }],
 ['D03','weather provides fixed-size seven-day source forecast with working place selection',()=>{
   const url=new URL(weeklyWeatherUrl());
   assert.equal(url.searchParams.get('forecast_days'),'7');
   assert.equal(url.searchParams.get('timezone'),'Asia/Seoul');
   const s=src('src/v854-weather-desktop.js');
   contains(s,"sheet.dataset.djFixedSize='true'","weeklyWeatherUrl(requestedPlace.latitude,requestedPlace.longitude)",'weekCacheKey===requestedKey','7일 예보');
 }],
 ['D04','live buses and metro have independent real-location overlays',()=>{
   const s=src('src/features/liveTransit/index.js');
   contains(s,'LIVE_METRO_LAYER','LIVE_BUS_LAYER','metroMinZoom','attachLayers','source.setData(display)');
 }],
 ['D05','1 line trains run on left, other lines right, facing via radial glow',()=>{
   assert.equal(trainLaneOffset('1호선','right',true),-12);
   assert.equal(trainLaneOffset('7호선','right',true),12);
   const renderer=src('src/features/liveTransit/index.js');
   contains(renderer,'trainBeamImageId','trainLaneOffsetExpression');assert.doesNotMatch(renderer,/withTrainHeadlights/);
 }],
 ['D06','AI search is explicit, respects profile preferences and does not scroll to last answer',()=>{
   const s=src('src/v880-supabase-safety-ai.js');
   contains(s,"child:'어린이'","senior:'어르신'","onExplicitEntryClick","event.isTrusted",'Preserve the viewport at the submitted question');
 }],
 ['D07','transport and facility information retain sourced fallback without fabricated directions',()=>{
   const s=src('src/transport-map.js');
   contains(s,'STATION_MASTER_URL','withinMetroRadius','adjacentStationNames','officialStaticBusPlaces');
 }],
 ['E01','map and walking settings are merged into one fullscreen phone setting screen',()=>{
   const s=src('src/v877-mobile-settings.js');
   contains(s,'도보 설정','음성 길안내','진행방향 보기');
   assert.ok(!s.includes('지도 디자인 설정'));
   contains(src('src/mobile-ui/current.css'),'#app #dj-map-settings');
 }],
 ['E02','release history shows public 1.0 while operational versions stay internal',()=>{
   assert.equal(PUBLIC_APP_VERSION,'1.0');
   contains(src('src/public-release-display.js'),'CHANGE_TYPE_GROUPS','PUBLIC_LOADING_VERSION');
   contains(src('src/version-history-v7.js'),'releaseEdition','syncPublicVersion');
 }],
 ['E03','community is a full-height opaque screen with nonoverlapping composer',()=>{
   const s=readPrimaryPhoneCss();
   contains(s,'#participation-panel','dj9256-composing','height:100dvh!important','#community-compose-close');
 }],
 ['E04','signed-out sessions see onboarding, except native theme refresh restoration',()=>{
   const s=src('src/v860-onboarding.js');
   contains(s,"authState==='signed-out'||pendingGuestOnboarding","seenInMemory=isNativeThemeRefresh");
   contains(src('src/mobile-pwa-status-tone-v793.js'),'const onboarding=visible');
 }],
 ['E05','My Info and account preferences remain linked to real login and favorites',()=>{
   const html=src('index.html');
   contains(html,'id="mine-panel"');
   contains(src('src/v880-supabase-safety-ai.js'),"q('#mine-panel [data-dj834-action=\"profile\"]')");
   contains(src('src/v877-mobile-settings.js'),'native.dispatchEvent');
 }],
 ['E06','mobile-first screens honor safe areas, reduced motion and touch navigation',()=>{
   contains(src('src/mobile-first-layout.css'),'safe-area-inset-bottom','grid-template-columns: repeat(5,minmax(0,1fr))');
   contains(src('src/bottom-tab-navigation.js'),'prefers-reduced-motion:reduce','pointerdown','pointerup');
 }],
 ['E07','battery heat budget and fast/full mobile CI preserve essential QA',()=>{
   const s=src('src/adaptive-phone-map-budget.mjs');
   contains(s,'nextBudget','visibilitychange','map.stop?.()');
   contains(src('src/map-scale-docking.js'),'phoneRenderOwner()');
   const w=root('.github/workflows/mobile-first-overhaul-preview.yml');
   contains(w,"ENABLE_FULL_MOBILE_QA == 'true' && 24 || 12","needs.mobile-qa.result == 'success'");
 }]
];
assert.equal(checks.length,35,'owner checklist must not lose any item');
for(const [code,title,check] of checks)test(code+' '+title,check);
