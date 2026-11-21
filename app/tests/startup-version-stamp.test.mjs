import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,mkdir,copyFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
test('startup footer shows stamped package version before the app script runs',async()=>{
 const root=await mkdtemp(join(tmpdir(),'dj-startup-version-'));
 try{
  for(const dir of ['src','scripts','public'])await mkdir(join(root,dir));
  const version='9.2.50';
  await writeFile(join(root,'package.json'),JSON.stringify({version}));
  await writeFile(join(root,'src/app-release-log.json'),JSON.stringify({releases:[{version,scale:'patch',items:['test']}]}));
  await writeFile(join(root,'src/v7120-settings.js'),'<strong id="dj-about-version-number">v8.26.1</strong>');
  await copyFile(new URL('../index.html',import.meta.url),join(root,'index.html'));
  await copyFile(new URL('../scripts/stamp-version.mjs',import.meta.url),join(root,'scripts/stamp-version.mjs'));
  await copyFile(new URL('../src/public-release-display.js',import.meta.url),join(root,'src/public-release-display.js'));
  execFileSync(process.execPath,[join(root,'scripts/stamp-version.mjs')]);
  const html=await readFile(join(root,'index.html'),'utf8');
  assert.match(html,/<span[^>]*id="map-startup-version"[^>]*>버전 1\.0<\/span>/);
  assert.equal((html.match(/id="map-startup-version"/g)||[]).length,1);
  assert.equal(JSON.parse(await readFile(join(root,'public/version.json'),'utf8')).version,version);
  assert.match(html,/>업데이트<\/button>/);
  assert.match(html,/id="dj-guide-latest-version">분류별 내역<\/strong>/);
 }finally{await rm(root,{recursive:true,force:true});}
});
