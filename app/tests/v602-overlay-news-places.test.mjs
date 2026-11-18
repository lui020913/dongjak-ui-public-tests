import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {importantPlaceFromFeatures,importantPlaceNearPoint,IMPORTANT_PLACES} from '../src/important-place-click.js';
import {newsImageMetadata,resolveNewsPublisherUrl,enrichNewsImage} from '../server/dongjak-news.mjs';
const read=p=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
test('v6.0.2: desktop overview never overlays news or other non-map content',()=>{
  const css=read('src/v602-fixes.css');
  assert.match(css,/data-tab]:not\(\[data-tab="map"\]\)/);
  assert.match(css,/overview-sheet/);
  assert.match(css,/display:none!important/);
  assert.match(read('src/main.js'),/if\(tab!=='map'\)\{overview.hidden=true/);
});
test('v7.0.29: first-run instruction card is centered and does not follow the ? button',()=>{
  const js=read('src/mobile-map-controls.js');
  const css=read('src/v720-ui-consistency.css');
  assert.doesNotMatch(js,/show.getBoundingClientRect\(\)/);
  assert.match(js,/guide.classList.add\('dj-guide-centered'\)/);
  assert.match(js,/watchTab.disconnect\(\)/);
  assert.match(css,/#app #map-gesture-guide:not\(\[hidden\]\)/);
  assert.match(css,/transform:translate\(-50%,-50%\)!important/);
});
test('v6.0.2: known civic and university locations remain selectable without boundary fetch',()=>{
  const src=read('src/main.js');
  assert.match(src,/placeDistrictCheck=/);
  assert.match(src,/installLandmarks\(\{map,maplibregl,isDongjak:placeDistrictCheck\}\)/);
  assert.match(src,/installEducationLayer\(\{map,maplibregl,isDongjak:placeDistrictCheck\}\)/);
  assert.ok(IMPORTANT_PLACES.length>=5);
  assert.equal(importantPlaceFromFeatures([{properties:{name:'국립서울현충원'}}]).type,'기념시설');
  assert.equal(importantPlaceFromFeatures([{properties:{name:'동작구청'}}]).type,'공공기관');
  const p=IMPORTANT_PLACES[0],map={getZoom:()=>15,project:coords=>({x:140+(coords[0]-p.lng)*10000,y:200+(coords[1]-p.lat)*10000})};
  assert.equal(importantPlaceNearPoint(map,{x:141,y:205})?.name,p.name);
  assert.equal(importantPlaceNearPoint(map,{x:400,y:400}),null);
});
test('v6.0.2: news fallback distinguishes RSS missing preview from no original photo',()=>{
  const view=read('src/dongjak-news.js');
  assert.doesNotMatch(view,/기사 사진 미리보기 불가/);
  assert.match(view,/dongjak-news-no-image/);
  assert.doesNotMatch(view,/원문 사진 미제공/);
});
test('v6.0.2: original publisher metadata resolves on trusted publisher redirect',async()=>{
  const src='https://news.google.com/rss/articles/abc';
  const article='https://weekly.hankooki.com/news/articleView.html?idxno=123';
  const image='https://cdn.hankooki.com/photo.png';
  const fetchImpl=async(url,opts)=>{
    if(url===src)return {ok:false,status:302,headers:{get:(k)=>k==='location'?article:null}};
    assert.equal(url,article);assert.equal(opts.redirect,'error');
    return {ok:true,headers:{get:()=> 'text/html; charset=utf-8'},text:async()=>`<meta property="og:image" content="${image}">`};
  };
  assert.equal(await resolveNewsPublisherUrl(src,{fetchImpl}),article);
  const result=await enrichNewsImage({url:src,imageUrl:''},{fetchImpl});
  assert.equal(result.imageUrl,image);
});
test('v6.0.2: JSON-LD article imagery can be extracted safely',()=>{
  const page='<script type="application/ld+json">{"@type":"NewsArticle","image":{"url":"https://publisher.example/article.png"}}</script>';
  assert.equal(newsImageMetadata(page),'https://publisher.example/article.png');
  assert.equal(newsImageMetadata('<meta property="og:image" content="http://localhost/icon.png">'),'');
});
