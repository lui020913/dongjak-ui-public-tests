/**
 * Verify release notes, historical SemVer migration, and package metadata.
 * Usage: node scripts/check-release-note-bump.mjs <previous-git-ref>
 */
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {releaseKindBetween} from './lib/semver-release.mjs';

const MIGRATION='2026-11-18-app-release-semver-audit';
const base=process.argv[2]||process.env.DONGJAK_VERSION_BASE_REF;
if(!base)throw new Error('Previous Git ref is required for release note audit');
const show=p=>JSON.parse(execFileSync('git',['show',base+':'+p],{encoding:'utf8'}));
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const prior=show('src/app-release-log.json').releases;
const next=read('src/app-release-log.json').releases;
const p=read('package.json');
const lock=read('package-lock.json');
if(!Array.isArray(prior)||!prior.length||!Array.isArray(next)||!next.length)throw new Error('Missing release history');

const hasNotes=entry=>Array.isArray(entry.items)&&entry.items.length>0&&
  entry.items.every(item=>typeof item==='string'&&item.trim());

if(p.version!==next[0].version||lock.version!==p.version||lock.packages?.['']?.version!==p.version)
  throw new Error('Package, lockfile and newest release notes must use the same version.');
if(new Set(next.map(x=>x.version)).size!==next.length)throw new Error('Duplicate operational version.');
if(!hasNotes(next[0]))throw new Error('Newest release must contain concrete change notes.');

function assertReleaseSequence(baseline, releases){
  let previous=baseline;
  for(const entry of releases.slice().reverse()){
    if(releaseKindBetween(previous,entry.version)!==entry.scale)
      throw new Error('Invalid version increment '+previous+' -> '+entry.version);
    if(!hasNotes(entry))throw new Error('Release notes must include real change entries for '+entry.version);
    previous=entry.version;
  }
}

const migrationStart=next.findIndex(x=>x.historyMigration===MIGRATION);
if(!prior.some(x=>x.historyMigration===MIGRATION)&&migrationStart>=0){
  const newReleases=next.slice(0,migrationStart);
  const current=newReleases.at(-1), migrated=next.slice(migrationStart);
  if(!current)throw new Error('Historical migration must include a new reviewed release.');
  if(migrated.length!==prior.length)throw new Error('Historical migration changed the number of preserved releases.');
  for(let i=0;i<prior.length;i++){
    const old=prior[i], item=migrated[i];
    if(item.historyMigration!==MIGRATION||item.previousVersion!==old.version||item.date!==old.date)
      throw new Error('Historical order, source version or date changed at '+old.version);
    if(JSON.stringify(item.originalItems)!==JSON.stringify(old.items))
      throw new Error('Original release notes were not preserved for '+old.version);
    if(!hasNotes(item))throw new Error('Migrated release has no display notes: '+old.version);
  }
  const chronological=migrated.slice().reverse();
  for(let i=1;i<chronological.length;i++){
    const previous=chronological[i-1], entry=chronological[i];
    if(releaseKindBetween(previous.version,entry.version)!==entry.scale)
      throw new Error('Invalid historical increment '+previous.version+' -> '+entry.version);
  }
  if(current.previousVersion!==migrated[0].version)
    throw new Error('New PR release does not reference the reclassified history.');
  if(!current.classification||current.classification.scope!==current.scale)
    throw new Error('New release scope review is missing or inconsistent.');
  assertReleaseSequence(migrated[0].version,newReleases);
  console.log('Historical SemVer migration validated: '+prior.length+' originals preserved; latest '+migrated[0].version+' -> '+p.version);
  process.exit(0);
}

const i=next.findIndex(x=>x.version===prior[0].version);
if(i===0){
  if(JSON.stringify(next)!==JSON.stringify(prior))throw new Error('Update notes changed but version did not. Use npm run version:patch|minor|major.');
  console.log('Release notes unchanged.');process.exit(0);
}
if(i<0)throw new Error('Previous current release removed from history.');
if(JSON.stringify(next.slice(i))!==JSON.stringify(prior))throw new Error('Historical releases altered: append a new release instead.');
assertReleaseSequence(prior[0].version,next.slice(0,i));
console.log('Version and release notes aligned: '+prior[0].version+' -> '+p.version);
