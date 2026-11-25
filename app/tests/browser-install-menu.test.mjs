
import test from 'node:test';import assert from 'node:assert/strict';import {installEnvironment,safeDownloadUrl,installChoices,androidReleaseAsset,androidInstallGuidance} from '../src/browser-install-menu.mjs';
test('only browser shows menu',()=>{assert.equal(installEnvironment({navigator:{userAgent:'iPhone'}}).mode,'browser');assert.equal(installEnvironment({navigator:{standalone:true}}).mode,'pwa');assert.equal(installEnvironment({Capacitor:{getPlatform:()=> 'android'}}).mode,'native');assert.equal(installEnvironment({location:{protocol:'capacitor:'}}).mode,'native');});
test('iOS priority',()=>{assert.deepEqual(installChoices('ios'),['web','ios','android','pwa']);assert.equal(installEnvironment({navigator:{platform:'MacIntel',maxTouchPoints:5}}).platform,'ios');});
test('download URL validation',()=>{assert.equal(safeDownloadUrl('javascript:alert(1)','android'),null);assert.equal(safeDownloadUrl('https://example.org/unsigned.ipa','ios'),null);assert.equal(safeDownloadUrl('https://testflight.apple.com/join/ABC','ios'),'https://testflight.apple.com/join/ABC');});
test('only matching verified non-draft APK',()=>{const sha='a'.repeat(40),v='9.1.2',name='Dongjak-Safety-Map-v'+v+'-release.apk',url='https://github.com/lui020913/dongjak-ui-public-tests/releases/download/android-v'+v+'/'+name;const m={application_version:v,source_commit:sha,release_status:'DEPLOYED_PRODUCTION'},r={tag_name:'android-v'+v,target_commitish:sha,draft:false,prerelease:false,assets:[{name,browser_download_url:url,state:'uploaded'}]};assert.equal(androidReleaseAsset(m,r),url);assert.equal(androidReleaseAsset({...m,application_version:'9.1.3'},r),null);assert.equal(androidReleaseAsset(m,{...r,draft:true}),null);assert.equal(androidReleaseAsset({...m,release_status:'CANDIDATE_PREVIEW_NOT_PRODUCTION'},r),null);});

test('browser welcome uses a full viewport instead of a floating card',async()=>{const {readFileSync}=await import('node:fs');const css=readFileSync(new URL('../src/browser-install-menu.css',import.meta.url),'utf8');const js=readFileSync(new URL('../src/browser-install-menu.mjs',import.meta.url),'utf8');assert.match(css,/dialog#dj-install-menu\{[^}]*position:fixed!important;inset:0!important;width:100%!important;height:100%!important;height:100dvh!important;max-width:none!important;max-height:none!important/);assert.match(css,/dialog#dj-install-menu:not\(\[open\]\)\{display:none!important\}/);assert.match(css,/\.dj-install-content\{[^}]*min-height:100%/);assert.match(js,/env\.mode!=='browser'/);assert.match(js,/doc\.createElement\(blocked\?'section':'dialog'\)/);});

test('welcome always uses the original white safety-map icon and iPhone uses a device glyph',async()=>{const {readFileSync}=await import('node:fs');const source=readFileSync(new URL('../src/browser-install-menu.mjs',import.meta.url),'utf8');assert.match(source,/logo\.src='\/icons\/dongjak-light-512\.png'/);assert.match(source,/ios:'<rect x="6" y="2" width="12" height="20" rx="3"\/>/);assert.doesNotMatch(source,/logo\.src=.*dongjak-dark/);});

test('paused iOS action is disabled, ignores configured download URLs and keeps the future-update label',async()=>{const {readFileSync}=await import('node:fs');const js=readFileSync(new URL('../src/browser-install-menu.mjs',import.meta.url),'utf8');assert.match(js,/key==='ios'\?'추후 업데이트 예정'/);assert.match(js,/if\(key==='ios'\)\{b\.disabled=true;b\.dataset\.installPaused='true'/);assert.match(js,/if\(key==='ios'\)return;/);assert.doesNotMatch(js,/data\.ios/);assert.doesNotMatch(js,/for\(const key of \['android','ios'\]\)buttons\.get\(key\)/);});

test('PWA home-screen action advertises both operating systems while native iOS stays paused',async()=>{const {readFileSync}=await import('node:fs');const js=readFileSync(new URL('../src/browser-install-menu.mjs',import.meta.url),'utf8');assert.match(js,/key==='pwa'\?'iOS · Android 지원'/);assert.match(js,/if\(key==='pwa'\)status\.classList\.add\('dj-install-platforms'\)/);assert.match(js,/if\(key==='pwa'\)\{if\(blocked\)\{[^}]*return;\}showInfo\(steps\(win\.navigator\.userAgent\)\)/);});

test('public debug APK is exact current Production and a verified matching release asset',()=>{const sha='b'.repeat(40),v='9.2.4',name='Dongjak-Safety-Map-v'+v+'-debug.apk',tag='android-debug-v'+v,url='https://github.com/lui020913/dongjak-ui-public-tests/releases/download/'+tag+'/'+name;const m={application_version:v,source_commit:sha,release_status:'DEPLOYED_PRODUCTION'},r={tag_name:tag,target_commitish:sha,draft:false,prerelease:false,assets:[{name,browser_download_url:url,state:'uploaded'}]};assert.equal(androidReleaseAsset(m,r,'debug'),url);assert.equal(androidReleaseAsset(m,r),null);assert.equal(androidReleaseAsset({...m,source_commit:'c'.repeat(40)},r,'debug'),null);assert.equal(androidReleaseAsset(m,{...r,assets:[]},'debug'),null);});

test('external APK guide keeps security controls optional and offers web access',()=>{const guide=androidInstallGuidance();assert.match(guide.intro,/Google Play/);assert.ok(guide.steps.some(s=>s.includes('출처를 알 수 없는 앱 설치')));assert.ok(guide.steps.some(s=>s.includes('보안 위험 자동 차단')));assert.ok(guide.steps.some(s=>s.includes('다시 해제')&&s.includes('Play Protect는 켜')));assert.match(guide.notice,/위험 경고가 나오면 설치하지 마세요/);assert.equal(new URL(guide.help).hostname,'www.samsungsvc.co.kr');});

test('install actions have touch press and fine-pointer hover feedback without animating disabled choices or reduced motion',async()=>{
 const {readFileSync}=await import('node:fs');
 const css=readFileSync(new URL('../src/browser-install-menu.css',import.meta.url),'utf8');
 assert.match(css,/@media \(hover:hover\) and \(pointer:fine\)\{[\s\S]*?:not\(:disabled\):hover\{box-shadow:/);
 assert.match(css,/:not\(:disabled\):active\{box-shadow:/);
 assert.doesNotMatch(css,/:not\(:disabled\):(?:hover|active)\{[^}]*transform:/);
 assert.match(css,/@media \(prefers-reduced-motion:reduce\)\{[\s\S]*?transition:none!important/);
 assert.match(css,/\.dj-install-prompt:focus-visible\{outline:/);
});

test('blocked gate has one heading and neutral equal choices; no false desktop PWA prompt',async()=>{const {readFileSync}=await import('node:fs');const css=readFileSync(new URL('../src/browser-install-menu.css',import.meta.url),'utf8');const js=readFileSync(new URL('../src/browser-install-menu.mjs',import.meta.url),'utf8');assert.doesNotMatch(css,/\.dj-install-choice:first-child/);assert.match(css,/\.dj-mobile-only-message>h1[^}]+display:none!important/);assert.match(js,/모바일 전용/);assert.match(js,/if\(key==='pwa'\)\{if\(blocked\)/);});

test('large-screen install typography is scoped to the blocked gate',async()=>{const {readFileSync}=await import('node:fs');const css=readFileSync(new URL('../src/browser-install-menu.css',import.meta.url),'utf8');assert.match(css,/#dj-mobile-only-screen #dj-install-menu h2\{font-size:clamp\(28px,3vw,38px\)/);assert.match(css,/#dj-mobile-only-screen #dj-install-menu \.dj-install-label\{font-size:clamp\(17px,1\.65vw,21px\)/);assert.match(css,/#dj-mobile-only-screen #dj-install-menu \.dj-install-status\{font-size:clamp\(13px,1\.25vw,16px\)/);});

test('device illustration remains visible and QR belongs exclusively to the PWA choice',async()=>{const {readFileSync}=await import('node:fs');const css=readFileSync(new URL('../src/browser-install-menu.css',import.meta.url),'utf8');const js=readFileSync(new URL('../src/browser-install-menu.mjs',import.meta.url),'utf8');assert.match(css,/\.dj-mobile-only-devices\{display:block!important/);assert.match(js,/if\(key==='pwa'\)\{if\(blocked\)\{showPwaQr\(\);return;/);assert.equal((js.match(/add\('img','dj-install-qr'/g)||[]).length,1);assert.match(css,/transition:background-color 70ms ease-out,box-shadow 70ms ease-out/);assert.match(js,/add\('ol','dj-install-guide-steps'/);});


test('installation choices expose one persistent selected state and Android always explains external APK security',async()=>{
 const {readFileSync}=await import('node:fs');
 const js=readFileSync(new URL('../src/browser-install-menu.mjs',import.meta.url),'utf8');
 const css=readFileSync(new URL('../src/browser-install-menu.css',import.meta.url),'utf8');
 const guide=androidInstallGuidance();
 assert.match(js,/setSelected=key=>/);
 assert.match(js,/aria-pressed/);
 assert.match(js,/dj-install-selected/);
 assert.match(js,/showAndroidGuide\(url\)/);
 assert.match(css,/\.dj-install-choice\[aria-pressed="true"\]/);
 assert.match(guide.intro,/Google Play 스토어 외부/);
 assert.match(guide.intro,/테스트용 APK/);
 assert.match(guide.notice,/Google Play 스토어 외부/);
 assert.match(guide.notice,/Play Protect/);
 assert.match(guide.notice,/설치하지 마세요/);
});


test('Android debug release accepts main target_commitish only when the actual tag points to the Production SHA',()=>{
 const sha='d'.repeat(40),v='9.2.14',name='Dongjak-Safety-Map-v'+v+'-debug.apk',url='https://github.com/lui020913/dongjak-ui-public-tests/releases/download/android-debug-v'+v+'/'+name;
 const marker={application_version:v,source_commit:sha,release_status:'DEPLOYED_PRODUCTION'};
 const release={tag_name:'android-debug-v'+v,target_commitish:'main',draft:false,prerelease:false,assets:[{name,browser_download_url:url,state:'uploaded'}]};
 assert.equal(androidReleaseAsset(marker,release,'debug',sha),url);
 assert.equal(androidReleaseAsset(marker,release,'debug','e'.repeat(40)),null);
 assert.equal(androidReleaseAsset(marker,release,'debug'),null);
});

test('browser welcome lists provisional smartphone minimum and recommended devices without a device gate',async()=>{const {readFileSync}=await import('node:fs');const js=readFileSync(new URL('../src/browser-install-menu.mjs',import.meta.url),'utf8');for(const value of ['S20급','S23급 이상','아이폰','WebView','잠정 기준','미달 기기도 이용','태블릿 모드'])assert.ok(js.includes(value));assert.ok(js.includes("['아이폰','11','13 이상']"));});
