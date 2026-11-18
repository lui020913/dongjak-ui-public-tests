import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {newsImageMetadata,enrichNewsImage,parseDongjakGoogleNewsRss} from '../server/dongjak-news.mjs';
import {CIVIC_POI_TYPES,civicFilter} from '../src/civic-facility-layer.js';
import {createMapStartupLoader} from '../src/map-startup-loader.js';

const read=p=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
test('RSS item without media enclosure gets a verified original photo link',async()=>{
  const item={title:'정비사업 열린상담실',url:'https://www.khan.co.kr/article/202611011142001',imageUrl:''};
  const resolved=await enrichNewsImage(item,{fetchImpl:()=>{throw Error('network unavailable')}});
  assert.match(resolved.imageUrl,/^https:\/\/img\.khan\.co\.kr\/news\/2026\/11\/01\//);
  assert.equal(item.imageUrl,'');
});
test('publisher og:image parser handles either attribute order and HTTPS images',async()=>{
  const img='https://img.khan.co.kr/path/to/pic.webp';
  assert.equal(newsImageMetadata(`<meta content="${img}" property="og:image">`),img);
  assert.equal(newsImageMetadata(`<meta property="twitter:image" content="${img}">`),img);
  assert.equal(newsImageMetadata('<meta property="og:image" content="http://localhost/test.png">'),'');
  const out=await enrichNewsImage({url:'https://www.khan.co.kr/article/202611021234567'},
    {fetchImpl:async()=>({ok:true,headers:{get:()=> 'text/html'},text:async()=>`<meta property="og:image" content="${img}">`})});
  assert.equal(out.imageUrl,img);
});
test('POI filter uses Dongjak boundary for schools, public services, and recreation',()=>{
  const bounds={type:'Polygon',coordinates:[[[126.9,37.48],[127,37.48],[127,37.53],[126.9,37.53],[126.9,37.48]]]};
  for(const type of ['school','civic','sports']){
    const filter=civicFilter(type,bounds);
    assert.equal(filter[0],'all');
    assert.deepEqual(filter.find(x=>Array.isArray(x)&&x[0]==='within'),['within',bounds]);
  }
  assert.ok(CIVIC_POI_TYPES.civic.includes('police'));
  assert.ok(CIVIC_POI_TYPES.sports.includes('stadium'));
  assert.match(read('src/main.js'),/installCivicFacilities/);
});
test('provided landmark and branding assets are packaged and referenced',()=>{
  for(const file of ['public/logos/seoul-memorial.png','public/logos/dongjak-gu.png','public/logos/dongjak-safety.png','public/logos/dongjak-symbol-20261108.png']){
    assert.ok(statSync(new URL(`../${file}`,import.meta.url)).size>1000);
  }
  assert.match(read('index.html'),/icons\/dongjak-light-192.png/);
  assert.match(read('src/landmark-layer.js'),/no-image-tile/);
  assert.doesNotMatch(read('src/landmark-layer.js'),/createElement\('img'\)/);
});
test('only extreme wide-area zoom hides rail lines and visible map is not blocked by live transit',()=>{
  const s=read('src/transport-map.js');
  assert.match(s,/minzoom:METRO_MARKER_MIN_ZOOM/);
  assert.match(read('src/map-startup-loader.js'),/timeoutMs=8500/);
  assert.doesNotMatch(read('src/map-startup-loader.js'),/if\(!done\.transport\)/);
});
