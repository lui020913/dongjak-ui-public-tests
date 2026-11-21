import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const parse=p=>JSON.parse(read(p));

test('version and in-app update history are synchronized across every build surface',()=>{
  const pkg=parse('package.json');
  const lock=parse('package-lock.json');
  const log=parse('src/app-release-log.json');
  const publicVersion=parse('public/version.json');
  const buildInfo=parse('src/build-info.json');
  const version=pkg.version;
  assert.match(version,/^\d+\.\d+\.\d+$/);
  assert.equal(lock.version,version);
  assert.equal(lock.packages[''].version,version);
  assert.equal(log.releases[0].version,version);
  assert.equal(publicVersion.version,version);
  assert.equal(buildInfo.version,version);
  assert.match(read('src/app-version.js'),new RegExp(`APP_VERSION="${version.replaceAll('.','\\.')}"`));
   for(const marker of ['<title>동작하는 안전지도 · 보행안전 지도</title>','id="dj-guide-latest-version">분류별 내역','id="version-history-trigger"','id="map-startup-version" aria-label="앱 버전">버전 1.0']){
    assert.ok(read('index.html').includes(marker),marker);
  }
   assert.ok(read('src/v7120-settings.js').includes('id="dj-about-version-number">1.0'));
  assert.equal(log.releases.filter(x=>x.version===version).length,1);
  assert.ok(log.releases[0].items.length>=1);
  const integrated=log.releases.find(x=>x.previousVersion==='8.2.16');
  assert.ok(integrated?.originalItems.length>=7,'v8.2.16 integrated change history must remain intact');
  assert.ok(log.releases.some(x=>x.previousVersion==='8.2.15'),'previous release must remain available');
});

test('original NEWS metro transit fix is kept while five UI corrections are merged',()=>{
  const html=read('index.html');
  assert.match(html,/v8215-news-transit-sticky-redesign\.css/);
  assert.match(html,/v8215-news-metro-compact-header\.js/);
  const svg=html.match(/<button[^>]*data-tab="map"[^>]*>[\s\S]*?<\/button>/)?.[0]||'';
  assert.match(svg,/<circle cx="12" cy="12" r="10"\/>/);
  assert.match(read('src/v815-map-product.js'),/mineBody\?\.appendChild\(myBox\)/);
  assert.match(read('src/v711-experience.js'),/if\(target\.id!=='theme-toggle'\)return/);
  assert.match(read('src/v8215-news-transit-sticky-redesign.css'),/position:sticky!important/);
  assert.match(read('src/v831-swipe-feature-toolbar.js'),/Math\.max\(70,Math\.min\(cap,pixels\+46\)\)/);
});
