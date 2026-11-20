import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,copyFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {bumpVersion,releaseKindBetween,normalizeReleaseKind} from '../scripts/lib/semver-release.mjs';

const read=async file=>JSON.parse(await readFile(file,'utf8'));
const scriptRoot=new URL('../scripts/',import.meta.url);
async function fixture(){
  const root=await mkdtemp(join(tmpdir(),'dj-semver-'));
  for(const path of ['scripts/lib','src','public'])await mkdir(join(root,path),{recursive:true});
  for(const filename of ['bump-app-version.mjs','stamp-version.mjs'])
    await copyFile(new URL(filename,scriptRoot),join(root,'scripts',filename));
  await copyFile(new URL('lib/semver-release.mjs',scriptRoot),join(root,'scripts/lib/semver-release.mjs'));
  const write=(name,data)=>writeFile(join(root,name),typeof data==='string'?data:JSON.stringify(data,null,2)+'\n');
  await write('package.json',{name:'fixture',version:'2.3.4',type:'module'});
  await write('package-lock.json',{version:'2.3.4',packages:{'':{version:'2.3.4'}}});
  await write('src/app-release-log.json',{releases:[
    {version:'2.3.4',scale:'patch',date:'2026-11-13',items:['previous fix']},
    {version:'2.3.3',scale:'patch',date:'2026-11-12',items:['older fix']}
  ]});
  await write('index.html','<title>동작하는 안전지도 · 보행안전 지도 v2.3.4</title><button id="version-history-trigger">v2.3.4</button><strong id="dj-guide-latest-version">v2.3.4</strong><span id="map-startup-version">v2.3.4</span>');
  await write('src/v7120-settings.js','<strong id="dj-about-version-number">v2.3.4</strong>');
  return root;
}
for(const [kind,expected] of [['major','3.0.0'],['minor','2.4.0'],['patch','2.3.5'],['next','2.4.0']]){
  test(`version:${kind} updates all release surfaces, notes and type`,async()=>{
    const root=await fixture();
    try{
      const result=spawnSync(process.execPath,[join(root,'scripts/bump-app-version.mjs'),kind,'추가 기능','오류 수정'],{cwd:root,encoding:'utf8'});
      assert.equal(result.status,0,result.stderr||result.stdout);
      assert.equal((await read(join(root,'package.json'))).version,expected);
      assert.equal((await read(join(root,'package-lock.json'))).packages[''].version,expected);
      const log=(await read(join(root,'src/app-release-log.json'))).releases;
      assert.equal(log[0].version,expected);
      assert.equal(log[0].scale,normalizeReleaseKind(kind));
      assert.deepEqual(log[0].items,['추가 기능','오류 수정']);
      assert.equal(log.length,3);
      assert.equal((await read(join(root,'public/version.json'))).version,expected);
      assert.equal((await read(join(root,'src/build-info.json'))).version,expected);
      assert.match(await readFile(join(root,'index.html'),'utf8'),new RegExp(`version-history-trigger">v${expected.replaceAll('.','\\.')}`));
      assert.ok((await readFile(join(root,'index.html'),'utf8')).includes(`id="map-startup-version">v${expected}</span>`));
      assert.match(await readFile(join(root,'src/v7120-settings.js'),'utf8'),new RegExp(`number">v${expected.replaceAll('.','\\.')}`));
      assert.ok((await readFile(join(root,'src/app-version.js'),'utf8')).includes(`APP_VERSION="${expected}"`));
    }finally{await rm(root,{recursive:true,force:true});}
  });
}

test('SemVer transitions reject malformed versions and non-adjacent increments',()=>{
  assert.equal(bumpVersion('8.2.16','major'),'9.0.0');
  assert.equal(bumpVersion('8.2.16','minor'),'8.3.0');
  assert.equal(bumpVersion('8.2.16','patch'),'8.2.17');
  assert.equal(releaseKindBetween('8.2.16','8.3.0'),'minor');
  assert.equal(releaseKindBetween('8.2.16','9.0.0'),'major');
  assert.equal(releaseKindBetween('8.2.16','8.4.0'),null);
  assert.throws(()=>bumpVersion('08.2.16','patch'));
  assert.throws(()=>bumpVersion('8.2.16','unspecified'));
});

test('manual version changes cannot be silently published as patch releases',async()=>{
  const root=await fixture();
  try{
    const pkg=await read(join(root,'package.json'));
    pkg.version='3.0.0';
    await writeFile(join(root,'package.json'),JSON.stringify(pkg,null,2)+'\n');
    const result=spawnSync(process.execPath,[join(root,'scripts/stamp-version.mjs')],{cwd:root,encoding:'utf8'});
    assert.notEqual(result.status,0);
    assert.match(result.stderr,/Version drift/);
    assert.equal((await read(join(root,'src/app-release-log.json'))).releases[0].version,'2.3.4');
  }finally{await rm(root,{recursive:true,force:true});}
});

test('the update history labels release types explicitly and keeps archived records',async()=>{
  const renderer=await readFile(new URL('../src/version-history-v7.js',import.meta.url),'utf8');
  const history=await readFile(new URL('../src/version-history.js',import.meta.url),'utf8');
  assert.match(renderer,/주요 구조 개편/);
  assert.match(renderer,/기능 추가·개선/);
  assert.match(renderer,/수정·안정화/);
  assert.match(renderer,/buildGenerationCatalog\(releases,\s*releaseEdition\)/);
  assert.match(renderer,/displayVersion/);
  assert.match(renderer,/이전 개발 기록/);
  assert.match(renderer,/isOperational/);
  assert.doesNotMatch(renderer,/release===currentRelease\?'현재 빌드: '/);
  assert.match(history,/\.\.\.RENUMBERED_VERSION_HISTORY/);
});
