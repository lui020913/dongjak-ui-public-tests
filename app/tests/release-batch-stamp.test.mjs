import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';

test('historical replay defers only derived stamping; every semver/log increment stays identical',()=>{
 const folder=mkdtempSync(join(tmpdir(),'dongjak-bump-'));
 const src=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
 const put=(path,contents)=>{
  const target=join(folder,path);
  mkdirSync(join(target,'..'),{recursive:true});
  writeFileSync(target,contents);
 };
 try{
  put('package.json',JSON.stringify({name:'release-test',type:'module',version:'8.26.1'}));
  put('package-lock.json',JSON.stringify({name:'release-test',version:'8.26.1',packages:{'':{name:'release-test',version:'8.26.1'}}}));
  put('src/app-release-log.json',JSON.stringify({releases:[
   {version:'8.26.1',scale:'patch',date:'2026-11-18',items:['one']},
   {version:'8.26.0',scale:'minor',date:'2026-11-18',items:['prior']}
  ]}));
  put('scripts/bump-app-version.mjs',src('scripts/bump-app-version.mjs'));
  put('scripts/lib/semver-release.mjs',src('scripts/lib/semver-release.mjs'));
  const cmd=join(folder,'scripts/bump-app-version.mjs');
  for(let i=1;i<=4;i++){
   const result=spawnSync(process.execPath,[cmd,'patch','unchanged release note '+i],{
    env:{...process.env,DONGJAK_BATCH_RELEASE_STAMP:'1'},cwd:folder,encoding:'utf8'
   });
   assert.equal(result.status,0,result.stderr);
   const pkg=JSON.parse(readFileSync(join(folder,'package.json'),'utf8'));
   const lock=JSON.parse(readFileSync(join(folder,'package-lock.json'),'utf8'));
   const log=JSON.parse(readFileSync(join(folder,'src/app-release-log.json'),'utf8'));
   assert.equal(pkg.version,'8.26.'+(i+1));
   assert.equal(lock.version,pkg.version);
   assert.equal(log.releases[0].version,pkg.version);
   assert.deepEqual(log.releases[0].items,['unchanged release note '+i]);
  }
  assert.equal(existsSync(join(folder,'src/app-version.js')),false,
   'derived files must not be stamped once per historical entry');
 }finally{rmSync(folder,{recursive:true,force:true});}
});

test('release replay sets the internal defer guard before every bump and stamps exactly once',()=>{
 const build=readFileSync(new URL('../../scripts/build-mobile-first-overhaul.sh',import.meta.url),'utf8');
 const guard=build.indexOf('export DONGJAK_BATCH_RELEASE_STAMP=1');
 const firstBump=build.indexOf('node scripts/bump-app-version.mjs');
 const unset=build.indexOf('unset DONGJAK_BATCH_RELEASE_STAMP');
 const stamp=build.indexOf('node scripts/stamp-version.mjs >/dev/null');
 const validation=build.indexOf('jq -e --arg version "$APP_VERSION"');
 assert.ok(guard>=0 && guard<firstBump,'defer must start before all replay bumps');
 assert.ok(unset>firstBump && stamp>unset && validation>stamp,
  'final stamp must happen after all bumps and before release metadata checks');
 assert.equal((build.match(/node scripts\/stamp-version\.mjs/g)||[]).length,1);
 assert.ok(build.includes('cp "$GITHUB_WORKSPACE/scripts/build-mobile-first-overhaul.sh" "$RUNNER_TEMP/scripts/build-mobile-first-overhaul.sh"'),
  'isolated build must mirror the release shell for app-side regression');
 assert.ok(build.includes('cp "$GITHUB_WORKSPACE/scripts/verify-release-monotonic.mjs" "$RUNNER_TEMP/scripts/verify-release-monotonic.mjs"'),
  'isolated build must mirror the monotonic gate for app-side regression');
 const bump=readFileSync(new URL('../scripts/bump-app-version.mjs',import.meta.url),'utf8');
 assert.match(bump,/if\(process\.env\.DONGJAK_BATCH_RELEASE_STAMP!=='1'\)/);
 assert.match(bump,/spawnSync\(process\.execPath/);
});
