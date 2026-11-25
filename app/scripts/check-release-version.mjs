import {readFileSync} from 'node:fs';
import {isDeepStrictEqual} from 'node:util';
import {APP_RELEASES,APP_VERSION} from '../src/app-version.js';
import {VERSION_HISTORY,RENUMBERED_VERSION_HISTORY,LATEST_APP_RELEASE} from '../src/version-history.js';
import {LEGACY_VERSION_HISTORY} from '../src/version-history-legacy.js';
import {REBUILT_RELEASES} from '../src/release-semver.js';
import {releaseKindBetween,RELEASE_KINDS} from './lib/semver-release.mjs';
import {PUBLIC_APP_VERSION,PUBLIC_LOADING_VERSION} from '../src/public-release-display.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const version=JSON.parse(read('package.json')).version;
const expected=LATEST_APP_RELEASE.version.slice(1);
const releaseLog=JSON.parse(read('src/app-release-log.json')).releases;
const newest=releaseLog[0];
const prior=releaseLog[1];
const html=read('index.html');
const settings=read('src/v7120-settings.js');
const checks=[
  ['Package',version===expected],
  ['Release log latest',newest?.version===version],
  ['Release scales valid',releaseLog.every(entry=>RELEASE_KINDS.includes(entry.scale))],
  ['No duplicate operational versions',new Set(releaseLog.map(entry=>entry.version)).size===releaseLog.length],
  ['Latest release increment matches scale',!prior||releaseKindBetween(prior.version,newest.version)===newest.scale],
  ['Package lock',JSON.parse(read('package-lock.json')).version===expected],
  ['Package lock root',JSON.parse(read('package-lock.json')).packages[''].version===expected],
  ['Public version',JSON.parse(read('public/version.json')).version===expected],
  ['Build info',JSON.parse(read('src/build-info.json')).version===expected],
  ['Generated app version',APP_VERSION===version],
  ['Generated release notes',isDeepStrictEqual(APP_RELEASES,releaseLog.map(entry=>({...entry,version:'v'+entry.version})))],
  ['HTML document title',html.includes('<title>동작하는 안전지도 · 보행안전 지도</title>')],
  ['Retired update button absent',!html.includes('id="version-history-trigger"')],
  ['Retired guide update slot absent',!html.includes('id="dj-guide-latest-version"')],
  ['Startup public version',html.includes(`id="map-startup-version" aria-label="앱 버전">${PUBLIC_LOADING_VERSION}</span>`)],
  ['Settings version',settings.includes(`id="dj-about-version-number">${PUBLIC_APP_VERSION}</strong>`)],
  ['New history rendered',read('src/version-history.js').includes('...RENUMBERED_VERSION_HISTORY')],
  ['Latest operational release comes first',LATEST_APP_RELEASE.version===`v${version}`],
  ['First release is v1.0.0',RENUMBERED_VERSION_HISTORY.at(-1).version==='v1.0.0'],
  ['Historical note preservation',RENUMBERED_VERSION_HISTORY.length===VERSION_HISTORY.length+LEGACY_VERSION_HISTORY.length+REBUILT_RELEASES.length],
];
for(const [name,ok] of checks)console.log(`[${ok?'OK':'FAIL'}] ${name}`);
if(checks.some(([,ok])=>!ok))process.exitCode=1;
else console.log(`All checks passed: v${expected} / ${RENUMBERED_VERSION_HISTORY.length} releases`);
