import {defineConfig} from '@playwright/test';

const iphone='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const android='Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36';
const screens=[
  ['mobile375',375,812,iphone],
  ['mobile390',390,844,iphone],
  ['mobile430',430,932,android]
];
// Run shared feature journeys once on the reference phone. The narrow/wide
// screens still exercise dimension-sensitive UI; Android also checks permission flow.
// Set the full-coverage override for exceptional cross-device audits.
const journeyQA=process.env.DONGJAK_QA_JOURNEY==='1';
const fullMobileQA=process.env.DONGJAK_FULL_MOBILE_QA==='1';
const fastMobileQA=!journeyQA && process.env.DONGJAK_FAST_MOBILE_QA==='1' && !fullMobileQA;
// A small functional release gate. Full regression remains opt-in, not deleted.
// Names are checked by tests/mobile-qa-parallel.test.mjs for exact selection.
const releaseSmokeNames=[
 'compact HUD and visible motion',
 'phone nearby safety opens',
 'phone first-run permission intro',
 'phone route comparison uses',
 'phone weather single window',
 'phone windows share the opaque',
 'layer header follows a real pointer',
 'ordinary light-only startup has no manual theme dialog; night visibility remains available',
 'phone search returns a visible',
 'primary tabs reveal content',
 'phone browser install choices',
 'iOS PWA status edge stays flat',
 'bottom dock swipes change',
 'AI full-screen conversation',
 'community tab opens a usable feed',
 'phone production settings, cards and nearby overlays follow rendered geometry',
 'phone verified protection-gap menu contains SHP audit and NULL middle-school review',
 'phone speed limit risk is selectable with PDF thresholds and real source links',
 'phone six-indicator vulnerability and bottom-docked wide sheets match visible dock geometry',
 'walking vulnerability remains neutral'
];
const releaseSmokeGrep=new RegExp(releaseSmokeNames.join('|'));
const phoneCoverage={
  mobile375:/@phone-layout/,
  mobile390:/@phone-(?:layout|common|platform)/,
  mobile430:/@phone-(?:layout|platform)/
};
const allPhoneCases=/@phone-(?:layout|common|platform)/;
// Project tag coverage AND curated release-case names, not OR.
// Keep a dedicated WebKit pointer/transition case in the fast tier.
const releasePhoneCoverage={};
for(const [name,tagGrep] of Object.entries(phoneCoverage)){
 releasePhoneCoverage[name]=new RegExp('(?=[\\s\\S]*'+tagGrep.source+')(?=[\\s\\S]*(?:'+releaseSmokeGrep.source+'))');
}
export default defineConfig({
  outputDir:process.env.DONGJAK_LIVE_QA_DIR?process.env.DONGJAK_LIVE_QA_DIR+'/playwright-results':'test-results',testDir:'tests',testMatch:journeyQA?'live-qa-journeys.spec.mjs':'v911-anonymous-ui.spec.mjs',timeout:journeyQA?360000:180000,expect:{timeout:20000},
  // Each test has a fresh anonymous Playwright browser context. Permit tests
  // from the same spec to be sharded across isolated runners. One browser
  // worker per runner avoids software-WebGL contention during frame sampling.
  fullyParallel:true,workers:1,retries:0,reporter:[['list'],['html',{open:'never'}],...(process.env.DONGJAK_LIVE_QA_DIR?[['./scripts/live-qa-reporter.mjs']]:[])],
  use:{baseURL:process.env.DONGJAK_TARGET_URL,browserName:'chromium',screenshot:'only-on-failure',trace:'off',video:process.env.DONGJAK_LIVE_QA_DIR?'on':'off',launchOptions:{args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}},
  projects:journeyQA?[{name:'mobile390',grep:/@journey-[1-6]$/,use:{viewport:{width:390,height:844},isMobile:true,hasTouch:true,userAgent:iphone}}]:[...screens.map(([name,width,height,userAgent])=>({name,grep:fullMobileQA?allPhoneCases:(fastMobileQA?releasePhoneCoverage[name]:phoneCoverage[name]),use:{viewport:{width,height},isMobile:true,hasTouch:true,userAgent}})),{name:'mobile390-webkit-header',grep:fastMobileQA?/layer header follows a real pointer/:/layer header follows a real pointer|phone update history fades in place|iOS PWA dimmed status edge/,use:{browserName:'webkit',viewport:{width:390,height:844},isMobile:true,hasTouch:true,userAgent:iphone,launchOptions:{args:[]}}}]
});
