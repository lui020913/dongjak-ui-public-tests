/**
 * npm run version:major -- "호환성 변경"
 * npm run version:minor -- "신규 기능"
 * npm run version:patch -- "오류 수정"
 * Legacy alias: npm run version:next (equivalent to minor).
 * A release command must be explicitly selected; the script never guesses
 * breaking changes from source text.
 */
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {bumpVersion,normalizeReleaseKind,releaseKindBetween} from './lib/semver-release.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const file=p=>resolve(root,p);
const usage='Usage: npm run version:major|version:minor|version:patch -- "변경사항" ["추가 변경사항"]';
let kind;
try{kind=normalizeReleaseKind(process.argv[2]);}
catch{console.error(usage);process.exit(1);}
const items=process.argv.slice(3).map(s=>s.trim()).filter(Boolean);
if(!items.length){console.error(usage);process.exit(1);}
const read=async p=>JSON.parse(await readFile(file(p),'utf8'));
const write=async(p,obj)=>writeFile(file(p),JSON.stringify(obj,null,2)+'\n');
const pkg=await read('package.json');
const lock=await read('package-lock.json');
const log=await read('src/app-release-log.json');
if(!Array.isArray(log.releases)||!log.releases.length)throw new Error('Release log is empty');
if(pkg.version!==lock.version||pkg.version!==lock.packages?.['']?.version||pkg.version!==log.releases[0].version){
  throw new Error('Version drift: package.json, package-lock.json, and latest release log must match. Run npm run check:release.');
}
if(log.releases.some((entry,i)=>i>0&&entry.version===pkg.version))throw new Error('Duplicate release version in history');
const version=bumpVersion(pkg.version,kind);
if(log.releases.some(entry=>entry.version===version))throw new Error(`Release ${version} already exists`);
if(log.releases.length>1){
  const inferred=releaseKindBetween(log.releases[1].version,pkg.version);
  if(inferred&&inferred!==log.releases[0].scale){
    throw new Error('Current release scale does not match previous version increment');
  }
}
pkg.version=lock.version=lock.packages[''].version=version;
log.releases.unshift({version,date:new Date().toISOString().slice(0,10),scale:kind,items});
await write('package.json',pkg);
await write('package-lock.json',lock);
await write('src/app-release-log.json',log);
const run=spawnSync(process.execPath,[file('scripts/stamp-version.mjs')],{stdio:'inherit',cwd:root});
if(run.status!==0)process.exit(run.status||1);
console.log(`[${kind.toUpperCase()}] Release advanced to v${version}: ${items.length} change note(s).`);
