import test from 'node:test';
import assert from 'node:assert/strict';
import {applyMobileOnlyGate,isMobilePhoneContext} from '../scripts/apply-mobile-only-gate.mjs';

test('phone-only detector allows iPhone and Android phone browsers',()=>{
  assert.equal(isMobilePhoneContext({userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148 Safari/604.1',width:390}),true);
  assert.equal(isMobilePhoneContext({userAgent:'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/140.0 Mobile Safari/537.36',width:430}),true);
  assert.equal(isMobilePhoneContext({userAgent:'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/140.0 Safari/537.36',userAgentDataMobile:true,width:430}),true);
  assert.equal(isMobilePhoneContext({userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148 Safari/604.1',width:844}),false);
});

test('tablet and desktop contexts are blocked',()=>{
  assert.equal(isMobilePhoneContext({userAgent:'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Safari/604.1',platform:'iPad',width:820}),false);
  assert.equal(isMobilePhoneContext({userAgent:'Mozilla/5.0 (Linux; Android 15; SM-X900) AppleWebKit/537.36 Chrome/140.0 Safari/537.36',width:800}),false);
  assert.equal(isMobilePhoneContext({userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0 Safari/537.36',width:390}),false);
  assert.equal(isMobilePhoneContext({userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148 Safari/604.1',width:1200}),false);
});

test('build patch displays the mobile-only notice and stops non-phone map startup',()=>{
  const indexHtml='<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0" /><link rel="stylesheet" href="/src/v815-pc-visual-fixes.css" /><link rel="stylesheet" href="/src/v853-pc-responsive-fixes.css" /><link rel="stylesheet" href="/src/v872-pc-onboarding-weather.css" /></head><body><script type="module" src="/src/v854-weather-desktop.js"></script><script type="module" src="/src/v862-pc-mobile-separation.js"></script><script type="module" src="/src/v876-desktop-final.js"></script><div id="app"></div></body></html>';
  const mainJs="import {installDesktopSafetyRail} from './v713-desktop-rail.js';\nimport './v726-desktop-polish.css';\nimport './v729-pc-consistency.css';\nimport './v881-desktop-ui.css';\nimport './v881-portrait-zoom-responsive.css';\nimport './v881-tablet-workspace.css';\nimport './v881-tablet-header-unified.css';\nimport './v881-tablet-tool-rail.js';\nimport './v913-pc-design-system.css';\nmaplibregl.setWorkerUrl(workerUrl);\ninstallDesktopSafetyRail({app});\nstartApp();\n";
  const platformEntry="if(target==='ios-pwa')await import('./ios-pwa/entry.js');\nelse if(target==='android')await import('./android/entry.js');\nelse await import('./pc-chromium/entry.js');\n// Mobile sheet presentation has its own entry, separate from desktop/MapLibre.\nif(target==='ios-pwa'||target==='android')await import('./shared/mobile-panel-layout.js');\nexport {target};\n";
  const result=applyMobileOnlyGate({indexHtml,mainJs,platformEntry});
  assert.match(result.indexHtml,/dj-mobile-only-gate-bootstrap/);
  assert.match(result.indexHtml,/모바일로 접속해 주세요/);
  assert.match(result.indexHtml,/dj-mobile-only-screen/);
  assert.doesNotMatch(result.indexHtml,/v854-weather-desktop\.js|v862-pc-mobile-separation\.js|v876-desktop-final\.js/);
  assert.doesNotMatch(result.mainJs,/v713-desktop-rail|v726-desktop-polish|v729-pc-consistency|v881-desktop-ui|v881-tablet|v913-pc-design-system/);
  assert.match(result.mainJs,/data-djMobileOnly !== 'blocked'/);
  assert.match(result.platformEntry,/data-djMobileOnly!=='blocked'/);
  assert.doesNotMatch(result.platformEntry,/else await import\('\.\/pc-chromium\/entry\.js'\);\n\/\/ Mobile sheet/);
});
