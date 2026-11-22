import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('release QA parallelizes independent tests in the same spec, with all phone projects',()=>{
 const config=read('playwright.v911-remote.config.mjs'),workflow=read('.github/workflows/mobile-first-overhaul-preview.yml');
 assert.match(config,/fullyParallel:true,workers:1,retries:0/);
 for(const name of ['mobile375','mobile390','mobile430','mobile390-webkit-header']){
  assert.ok(config.includes(name));
  assert.ok(workflow.includes('--project='+name));
 }
 assert.match(workflow,/fail-fast: false\s+max-parallel: 24\s+matrix:\s+shard: \$\{\{ fromJSON\(/);
  assert.ok(workflow.includes("'[1,2,3,4,5,6,7,8,9,10,11,12]'"),'standard release runs 12 smoke shards');
 assert.ok(workflow.includes("'[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24]'"),'full tier must have 24 shards');
 assert.ok(workflow.includes("DONGJAK_FULL_MOBILE_QA: ${{ vars.ENABLE_FULL_MOBILE_QA == 'true' && '1' || '0' }}"));
  assert.ok(workflow.includes("--project=mobile390-webkit-header --workers=1 --shard="));
  assert.ok(workflow.includes("ENABLE_FULL_MOBILE_QA == 'true' && 24 || 12"));
 assert.match(workflow,/name: mobile-only-phone-qa-\$\{\{ github\.run_id \}\}-shard-\$\{\{ matrix\.shard \}\}/);
 assert.match(workflow,/desktop-tablet-qa:/);
 assert.match(workflow,/tests\/install-gate-selection\.spec\.mjs/);
 assert.match(workflow,/needs: \[build, preview, mobile-qa, desktop-tablet-qa, visual-capture, visual-qa, explore-qa\]/);
 assert.match(workflow,/always\(\) && needs\.build\.result == 'success' && needs\.preview\.result == 'success' && needs\.mobile-qa\.result == 'success'/);
  assert.match(workflow,/vars\.ENABLE_GEMINI_QA != 'true' && needs\.visual-qa\.result == 'skipped'/);
  assert.match(workflow,/vars\.ENABLE_GEMINI_QA != 'true' && needs\.explore-qa\.result == 'skipped'/);
 assert.ok(config.includes('grep:fastMobileQA?'));
});

test('six design recordings and Gemini reviews are opt-in without bypassing functional release gates',()=>{
 const w=read('.github/workflows/mobile-first-overhaul-preview.yml');
 assert.match(w,/name: Enforce measured UI evidence without Gemini\s+run: node scripts\/live-qa-release-gate\.mjs qa-artifacts --deterministic/);
 assert.match(w,/visual-capture:\s*\n\s*needs: \[build, preview\]\s*\n\s*# Optional visual recording:[\s\S]*?if: needs\.preview\.result == 'success' && \(vars\.ENABLE_DESIGN_CAPTURE_QA == 'true' \|\| vars\.ENABLE_GEMINI_QA == 'true'\)/);
 // When neither optional mode is enabled, skipped design jobs do not block
 // Production. However an opt-in design failure is never treated as a skip.
 const requiredSkip="vars.ENABLE_DESIGN_CAPTURE_QA != 'true' && vars.ENABLE_GEMINI_QA != 'true' && needs.visual-capture.result == 'skipped'";
 assert.equal(w.split(requiredSkip).length-1,2);
 assert.match(w,/needs\.mobile-qa\.result == 'success'/);
 assert.match(w,/needs\.desktop-tablet-qa\.result == 'success'/);
 assert.match(w,/if: needs\.preview\.result == 'success' && needs\.visual-capture\.result == 'success' && vars\.ENABLE_GEMINI_QA == 'true'/);
 assert.match(w,/if: needs\.preview\.result == 'success' && needs\.visual-qa\.result == 'success' && vars\.ENABLE_GEMINI_QA == 'true'/);
 assert.match(w,/needs\.visual-qa\.result == 'success' \|\| \(vars\.ENABLE_GEMINI_QA != 'true' && needs\.visual-qa\.result == 'skipped'\)/);
 assert.match(w,/needs\.explore-qa\.result == 'success' \|\| \(vars\.ENABLE_GEMINI_QA != 'true' && needs\.explore-qa\.result == 'skipped'\)/);
 const shards=read('scripts/verify-mobile-qa-shards.mjs');
 assert.ok(shards.includes('QA_MODES=[{count:12,full:false},{count:24,full:true}]'));
 assert.match(shards,/i<=count/);
 assert.match(shards,/assert\.deepEqual\(combined\.sort\(\),baseline/);
 assert.ok(shards.includes("DONGJAK_FAST_MOBILE_QA:full?'0':'1'"));
 assert.match(w,/needs\.mobile-qa\.result == 'success'/);
});

test('mobile coverage policy assigns every case explicitly and preserves all functional checks',()=>{
 const config=read('playwright.v911-remote.config.mjs'),spec=read('tests/v911-anonymous-ui.spec.mjs');
 const cases=[...spec.matchAll(/^test\('([^']+)',\{tag:'(@[\w-]+)'\},async\(/gm)].map(m=>({name:m[1],tag:m[2]}));
 assert.equal(cases.length,[...spec.matchAll(/^test\(/gm)].length,'new tests must declare a coverage tag');
 assert.equal(new Set(cases.map(c=>c.name)).size,cases.length);
 const phone=cases.filter(c=>c.tag!=='@non-phone');
 assert.ok(phone.every(c=>['@phone-layout','@phone-common','@phone-platform'].includes(c.tag)));
 assert.equal(cases.filter(c=>c.tag==='@non-phone').length,7);
 for(const prefix of ['phone pilot safety symbols','phone night shortcut waits','phone route comparison uses','phone windows share the opaque']){
  assert.equal(cases.find(c=>c.name.startsWith(prefix))?.tag,'@phone-common');
 }
 for(const prefix of ['compact HUD','transport cards','phone toolbar','phone onboarding copy','phone sheets','phone weather','phone report composer','layer header follows','theme confirmation fades','phone update history fades']){
  assert.equal(cases.find(c=>c.name.startsWith(prefix))?.tag,'@phone-layout');
 }
 assert.equal(cases.find(c=>c.name.startsWith('phone first-run permission intro'))?.tag,'@phone-platform');
 assert.match(config,/mobile375:\/@phone-layout\//);
 assert.match(config,/mobile390:\/@phone-\(\?:layout\|common\|platform\)\//);
 assert.match(config,/mobile430:\/@phone-\(\?:layout\|platform\)\//);
 assert.ok(config.includes('grep:fullMobileQA?allPhoneCases:(fastMobileQA?releasePhoneCoverage[name]:phoneCoverage[name])'));
 assert.match(config,/DONGJAK_FULL_MOBILE_QA==='1'/);
});

test('only opted-in design evidence is required for Production and Preview notification',()=>{
 const workflow=read('.github/workflows/mobile-first-overhaul-preview.yml');
 assert.match(workflow,/visual-capture:\s*\n\s*needs: \[build, preview\]/);
 assert.match(workflow,/visual-qa:\s*\n\s*needs: \[build, preview, visual-capture\]/);
 assert.match(workflow,/max-parallel: 6\s+matrix:\s+lane: \[1, 2, 3, 4, 5, 6\]/);
 const visual=workflow.slice(workflow.indexOf('  visual-qa:'),workflow.indexOf('  explore-qa:'));
 const explore=workflow.slice(workflow.indexOf('  explore-qa:'),workflow.indexOf('  production:'));
 const capture=workflow.slice(workflow.indexOf('  visual-capture:'),workflow.indexOf('  visual-qa:'));
 for(const job of [capture,visual,explore])assert.equal((job.match(/run: node scripts\/live-qa-verify-candidate\.mjs/g)||[]).length,2);
 assert.match(workflow,/run: node scripts\/live-qa-release-gate\.mjs qa-artifacts/);
 assert.match(workflow,/production:\s*\n\s*needs: \[build, preview, mobile-qa, desktop-tablet-qa, visual-capture, visual-qa, explore-qa\]/);
 assert.match(workflow,/notify-preview:\s*\n\s*needs: \[build, preview, mobile-qa, desktop-tablet-qa, visual-capture, visual-qa, explore-qa\]/);
});

test('autonomous exploration is required on exact Preview',()=>{const w=read('.github/workflows/mobile-first-overhaul-preview.yml');assert.match(w,/explore-qa:\s*\n\s*needs: \[build, preview, visual-qa\]/);assert.match(w,/playwright\.live-qa-explore\.config\.mjs/);assert.match(w,/needs\.explore-qa\.result == 'success'/);});

test('when opt-in is enabled, six capture lanes run in parallel; Gemini remains serialized',()=>{const w=read('.github/workflows/mobile-first-overhaul-preview.yml'),capture=w.slice(w.indexOf('  visual-capture:'),w.indexOf('  visual-qa:')),review=w.slice(w.indexOf('  visual-qa:'),w.indexOf('  explore-qa:')),explore=w.slice(w.indexOf('  explore-qa:'),w.indexOf('  production:'));assert.match(capture,/max-parallel: 6/);assert.doesNotMatch(capture,/GEMINI_API_KEY|--vision/);assert.match(capture,/verify-capture\.mjs qa-artifacts --seal/);assert.match(review,/max-parallel: 1/);assert.match(review,/uses: actions\/download-artifact@v4/);assert.match(review,/verify-capture\.mjs qa-artifacts\n/);assert.match(review,/--vision/);assert.match(explore,/needs\.visual-qa\.result == 'success'/);});

test('fast mobile release has fewer tests and full auditing remains available',()=>{
 const config=read('playwright.v911-remote.config.mjs');
 const workflow=read('.github/workflows/mobile-first-overhaul-preview.yml');
 const spec=read('tests/v911-anonymous-ui.spec.mjs');
 const list=config.split('const releaseSmokeNames=[')[1]?.split('];')[0];
 assert.ok(list,'missing fast release case list');
 const selected=[...list.matchAll(/'([^']+)'/g)].map(x=>x[1]);
 assert.equal(selected.length,15);
 const all=[...spec.matchAll(/^test\('([^']+)',\{tag:'(@[\w-]+)'\},async\(/gm)].map(x=>({name:x[1],tag:x[2]}));
 for(const name of selected)assert.equal(all.filter(c=>c.name.includes(name)).length,1,'unmatched or ambiguous smoke case '+name);
 assert.ok(selected.length<all.filter(c=>c.tag!=='@non-phone').length/2);
 assert.ok(config.includes("DONGJAK_FAST_MOBILE_QA==='1'"));
 assert.ok(workflow.includes('DONGJAK_FAST_MOBILE_QA:'));
 assert.ok(workflow.includes('DONGJAK_FULL_MOBILE_QA:'));
 assert.ok(workflow.includes("ENABLE_FULL_MOBILE_QA == 'true' && 24 || 12"));
 assert.ok(workflow.includes("needs.mobile-qa.result == 'success'"));
 assert.ok(workflow.includes('node scripts/verify-release-source.mjs'));
});

test('debug APK releases are immutable by source SHA even when Android versionName stays unchanged',()=>{
 for(const path of ['.github/workflows/android-apk.yml','.github/workflows/android-debug-publish-retry.yml']){
  const workflow=read(path);
  assert.match(workflow,/tag="android-debug-v\$\{VERSION\}-src-\$\{sha:0:12\}"/,'Missing exact Production source in debug release tag: '+path);
  assert.match(workflow,/\[\[ "\$sha" =~ \^\[a-f0-9\]\{40\}\$ \]\]/,'Unverified commit digest: '+path);
  assert.match(workflow,/gh release view "\$tag"/,'Must not replace existing immutable release: '+path);
  assert.match(workflow,/gh release create "\$tag"/,'Must publish that exact source tag: '+path);
  assert.match(workflow,/unzip -p "\$apk" assets\/public\/release-source\.json/,'Missing embedded provenance comparison: '+path);
  assert.match(workflow,/apksigner" verify --print-certs/,'APK certificate verification is mandatory: '+path);
 }
});

test('released phone dark buildings never override the chosen translucent map with opaque old values',()=>{
 const patch=read('scripts/apply-mobile-17-followup.mjs');
 const regression=read('frontend/production/mobile-followup-build.test.mjs');
 const next=read('frontend/production/mobile-next-build.test.mjs');
 assert.ok(patch.includes('MOBILE_DARK_BUILDING_PALETTE=BUILDING_VISUAL_PALETTE.dark'));
 assert.ok(!patch.includes('nearOpacity:0.98'));
 assert.ok(!patch.includes('farOpacity:0.96'));
 assert.ok(regression.includes("buildingExtrusionAppearance('dark',10).opacity,0.58"));
 assert.ok(regression.includes("buildingExtrusionAppearance('dark',30).opacity,0.50"));
 assert.ok(next.includes('--djNext-surface:#2c343d'));
});

test('release workflow Node versions remain valid YAML scalars',()=>{
 const workflow=read('.github/workflows/mobile-first-overhaul-preview.yml');
 const entries=workflow.split('\n').filter(line=>line.includes('node-version:'));
 assert.ok(entries.length>=4,'Expected all checkout/build/browser Node setup versions');
 for(const line of entries)assert.match(line,/^\s+node-version:\s*'(22|24)'\s*$/,'Invalid YAML node-version scalar: '+line);
});
