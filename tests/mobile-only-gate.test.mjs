import test from 'node:test';
import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import {applyMobileOnlyGate,isMobilePhoneContext} from '../scripts/apply-mobile-only-gate.mjs';

test('phone-only detector allows iPhone and Android phone browsers, including landscape',()=>{
  assert.equal(isMobilePhoneContext({userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148 Safari/604.1',width:390}),true);
  assert.equal(isMobilePhoneContext({userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148 Safari/604.1',width:844}),true);
  assert.equal(isMobilePhoneContext({userAgent:'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/140.0 Mobile Safari/537.36',width:430}),true);
  assert.equal(isMobilePhoneContext({userAgent:'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/140.0 Safari/537.36',userAgentDataMobile:true,width:430}),true);
  assert.equal(isMobilePhoneContext({userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148 Safari/604.1',width:1200}),false);
});

test('tablet and desktop contexts are blocked regardless of narrow viewport width',()=>{
  assert.equal(isMobilePhoneContext({userAgent:'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Safari/604.1',platform:'iPad',width:820}),false);
  assert.equal(isMobilePhoneContext({userAgent:'Mozilla/5.0 (Linux; Android 15; SM-X900) AppleWebKit/537.36 Chrome/140.0 Safari/537.36',width:800}),false);
  assert.equal(isMobilePhoneContext({userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0 Safari/537.36',width:390}),false);
});

test('build patch adds accessible mobile-only device notice and preserves desktop/tablet source and startup',()=>{
  const indexHtml=`<!doctype html>
<html><head>
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="stylesheet" href="/src/v815-pc-visual-fixes.css" />
    <link rel="stylesheet" href="/src/v853-pc-responsive-fixes.css" />
    <link rel="stylesheet" href="/src/v872-pc-onboarding-weather.css" />
</head>
<body>
    <script type="module" src="/src/v854-weather-desktop.js"></script>
    <script type="module" src="/src/v862-pc-mobile-separation.js"></script>
    <script type="module" src="/src/v876-desktop-final.js"></script>
    <div id="app"></div>
</body></html>`;
  const mainJs="import {installDesktopSafetyRail} from './v713-desktop-rail.js';\nimport './v726-desktop-polish.css';\nimport './v729-pc-consistency.css';\nimport './v881-desktop-ui.css';\nimport './v881-portrait-zoom-responsive.css';\nimport './v881-tablet-workspace.css';\nimport './v881-tablet-header-unified.css';\nimport './v881-tablet-tool-rail.js';\nimport './v913-pc-design-system.css';\nmaplibregl.setWorkerUrl(workerUrl);\ninstallDesktopSafetyRail({app});\nstartApp();\n";
  const platformEntry="if(target==='ios-pwa')await import('./ios-pwa/entry.js');\nelse if(target==='android')await import('./android/entry.js');\nelse await import('./pc-chromium/entry.js');\n// Mobile sheet presentation has its own entry, separate from desktop/MapLibre.\nif(target==='ios-pwa'||target==='android')await import('./shared/mobile-panel-layout.js');\nexport {target};\n";
  const result=applyMobileOnlyGate({indexHtml,mainJs,platformEntry});
  assert.match(result.indexHtml,/dj-mobile-only-gate-bootstrap/);
  assert.match(result.indexHtml,/dj-mobile-only-screen/);
  assert.match(result.indexHtml,/<main id="dj-mobile-only-screen" role="main" aria-labelledby="dj-mobile-only-title">/);
  assert.match(result.indexHtml,/<svg class="dj-mobile-only-devices"[^>]*aria-hidden="true"/);
  assert.match(result.indexHtml,/<h1 id="dj-mobile-only-title">모바일로 접속해 주세요<\/h1>/);
  assert.match(result.indexHtml,/<p>동작하는 안전지도는 모바일 웹사이트와 모바일 앱에서 이용할 수 있습니다\.<\/p>/);
  assert.match(result.indexHtml,/<footer class="dj-mobile-only-credit">동작구 아이디어리그 안전팀<\/footer>/);
  assert.ok(result.indexHtml.includes('@media(min-width:600px){#dj-mobile-only-screen p{white-space:nowrap}}'));
  assert.ok(result.indexHtml.includes('width:min(920px,100%)'));
  assert.match(result.indexHtml,/모바일로 접속해 주세요/);
  assert.match(result.indexHtml,/모바일 웹사이트와 모바일 앱/);
  assert.match(result.indexHtml,/background:#fff!important/);
  assert.ok(result.indexHtml.includes('font-size:clamp(22px,2.45vw,32px);font-weight:800'));
  assert.ok(result.indexHtml.includes('font-size:clamp(14px,1.65vw,21px);line-height:1.65'));
  assert.ok(result.indexHtml.includes('body>:not(#dj-mobile-only-screen){display:none!important}'));
  assert.equal(result.indexHtml.includes('\\n'),false);
  assert.match(result.indexHtml,/v815-pc-visual-fixes\.css/);
  assert.match(result.indexHtml,/v854-weather-desktop\.js/);
  assert.equal(result.mainJs,mainJs);
  assert.equal(result.platformEntry,platformEntry);
});


test('iPad standalone and browser are both blocked at all viewport sizes; phones remain allowed',()=>{
  const desktopUA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15';
  const cases=[
    [{userAgent:desktopUA,platform:'MacIntel',maxTouchPoints:5,width:820,standalone:true},false],
    [{userAgent:desktopUA,platform:'MacIntel',maxTouchPoints:5,width:1366,standalone:true},false],
    [{userAgent:desktopUA,platform:'MacIntel',maxTouchPoints:5,width:820,standalone:false},false],
    [{userAgent:desktopUA,platform:'MacIntel',maxTouchPoints:0,width:820,standalone:true},false],
    [{userAgent:'iPad',platform:'iPad',width:1024,standalone:true},false],
    [{userAgent:'iPad',platform:'iPad',width:1024,standalone:false},false],
    [{userAgent:'Android tablet',width:820,standalone:true},false],
    [{userAgent:desktopUA,platform:'MacIntel',maxTouchPoints:5,width:390,standalone:true},false],
    [{userAgent:'iPad',platform:'iPad',width:390,standalone:true},false],
    [{userAgent:'iPhone',platform:'iPhone',width:390,standalone:true},true],
    [{userAgent:'iPhone',platform:'iPhone',width:390,standalone:false},true],
    [{userAgent:'Android Mobile',width:430,standalone:true},true],
  ];
  const {indexHtml}=applyMobileOnlyGate({indexHtml:'<html><head><meta name="viewport" content="width=device-width" /></head><body></body></html>',mainJs:'',platformEntry:''});
  const code=indexHtml.split('<script id="dj-mobile-only-gate-bootstrap">')[1].split('</script>')[0];
  for(const [context,expected] of cases){
    assert.equal(isMobilePhoneContext(context),expected);
    const document={documentElement:{dataset:{},clientWidth:context.width},readyState:'loading'};
    const window={navigator:{userAgent:context.userAgent,platform:context.platform,maxTouchPoints:context.maxTouchPoints,standalone:context.standalone},innerWidth:context.width,matchMedia:()=>({matches:false}),addEventListener(){}};
    runInNewContext(code,{document,window});
    assert.equal(document.documentElement.dataset.djMobileOnly,expected?'allowed':'blocked');
    window.navigator.standalone=false;
    window.matchMedia=()=>({matches:context.standalone});
    runInNewContext(code,{document,window});
    assert.equal(document.documentElement.dataset.djMobileOnly,expected?'allowed':'blocked');
  }
});
