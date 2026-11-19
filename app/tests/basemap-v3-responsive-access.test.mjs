import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {filterDistrictAccessibility,entranceNumber,parsePublicExitArcGIS} from '../src/station-accessibility.js';
import {parseMetroExits} from '../server/station-accessibility-data.mjs';
import {rssImageUrl,parseDongjakGoogleNewsRss} from '../server/dongjak-news.mjs';
import {fetchStationTimetables} from '../server/metro-timetable-common.mjs';
const source=readFileSync(new URL('../src/transport-map.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/style.css',import.meta.url),'utf8');
const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const ui=readFileSync(new URL('../src/dongjak-news.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const pt=(lng,lat,type,number='')=>({type:'Feature',properties:{type,number},geometry:{type:'Point',coordinates:[lng,lat]}});
test('동작구 외 지역 출구와 교통약자 시설 모두 제외',()=>{
 const data=[pt(126.949,37.503,'exit','1'),pt(126.95,37.502,'elevator'),pt(126.92,37.56,'exit','2'),pt(126.92,37.56,'stairs')];
 assert.deepEqual(filterDistrictAccessibility(data,(lng,lat)=>lat<37.52),data.slice(0,2));
});
test('실측 출구번호는 1·3-1 같은 표현만 사용하고 빈 번호를 추측하지 않는다',()=>{
 assert.equal(entranceNumber('1번출구'),'1');
 assert.equal(entranceNumber('3-1번 출입구'),'3-1');
 assert.equal(entranceNumber('출입구'),'');
 const result=parsePublicExitArcGIS({features:[{geometry:{x:126.95,y:37.51},attributes:{entrc_nm:'2번 출입구',stn_nm:'노량진'}}]});
 assert.equal(result.features[0].properties.number,'2');
 const serverResult=parseMetroExits({features:[{geometry:{x:126.95,y:37.51},attributes:{entrc_nm:'5번 출구',stn_nm:'노량진'}}]});
 assert.equal(serverResult.features[0].properties.number,'5');
});
test('폰트는 공식 Pretendard 웹폰트를 기본으로 하고 카드 텍스트를 바꾼다',()=>{
 assert.match(html,/pretendardvariable-dynamic-subset.min.css/);
 assert.match(css,/:root\{font-family:'Pretendard Variable'/);
 assert.doesNotMatch(css,/fonts.googleapis.com\/css2\?family=Noto/);
});
test('역 원형 배지는 원래 지리 좌표에 중심 정렬한다',()=>{
 assert.match(source,/map.addSource\(stationSource,\{type:'geojson'/);
 assert.match(source,/icon-offset':\['get','iconOffset'\]/);
 assert.doesNotMatch(source,/new maplibregl.Marker\(\{element:markerEl,anchor:'center'\}\)/);
});
test('뉴스 카드 이미지가 RSS에 있으면 사용하고 없으면 텍스트만 표시',()=>{
 assert.equal(rssImageUrl('<media:thumbnail url="https://example.org/photo.jpg"/>'),'https://example.org/photo.jpg');
 assert.equal(rssImageUrl('<enclosure url="https://example.org/sound.mp3" type="audio/mpeg"/>'),'');
 assert.match(ui,/dongjak-news-no-image/);
 assert.match(ui,/img\.addEventListener\('error'/);
 const rss='<rss><item><title>소식</title><link>https://news.google.com/rss/articles/abc</link><media:thumbnail url="https://example.org/photo.jpg"/></item></rss>';
 assert.equal(parseDongjakGoogleNewsRss(rss)[0].imageUrl,'https://example.org/photo.jpg');
});
test('PC 별도 좌측 뉴스 패널과 모바일 하단 패널, 빈 지도 클릭으로 종료',()=>{
 assert.match(css,/@media \(min-width:1000px\)/);
 assert.match(css,/#news-panel\.page-panel\{top:auto!important/);
 assert.match(main,/navigate\('map'\);\s*if\(!overview.hidden\)applyOverviewSheetState\('collapsed'\)/);
 assert.match(html,/id="news-close-to-map"/);
});
test('1호선 외부코드 실패 시 공식 ID 시간표로 추가 조회',async()=>{
 const calls=[];
 const fetchJSON=async(service,parts)=>{
   calls.push({service,parts});
   if(service==='SearchInfoBySubwayNameService')return {SearchInfoBySubwayNameService:{row:[{STATION_NM:'노량진',LINE_NUM:'1호선',FR_CODE:'136',STATION_CD:'1004'}]}};
   if(service==='SearchSTNBySubwayLineInfo')return {SearchSTNBySubwayLineInfo:{row:[]}};
   if(service==='SearchSTNTimeTableByFRCodeService')return {SearchSTNTimeTableByFRCodeService:{row:[]}};
   if(service==='SearchSTNTimeTableByIDService')return {SearchSTNTimeTableByIDService:{row:[{WEEK_TAG:'1',LEFTTIME:'05:12:00',SUBWAYENAME:'행선지',TRAIN_NO:'1010'}]}};
   throw new Error('unknown API');
 };
 const output=await fetchStationTimetables({station:'노량진',line:'1호선',day:'1',fetchJSON});
 assert.equal(output.status,'ok');
 assert.equal(output.items.length,2);
 assert.ok(calls.some(x=>x.service==='SearchSTNTimeTableByIDService'&&x.parts[1]==='1004'));
});
