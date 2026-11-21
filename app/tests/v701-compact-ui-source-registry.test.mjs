import {APP_VERSION} from '../src/app-version.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DATA_SOURCE_GROUPS} from '../src/version-history-v7.js';
import {renderEvidenceStatus} from '../src/protection-zone-guidance.js';
const read=file=>readFileSync(new URL(`../${file}`,import.meta.url),'utf8');

test('교통정보 패널에서 반복 라벨·칩·경유노선·출처 각주를 제거하고 출발/도착 버튼은 유지',()=>{
  const css=read('src/v701-compact-info-panels.css');
  const html=read('index.html');
  const js=read('src/transport-map.js');
  for(const selector of ['#transport-kind','#transport-description','#transport-chips','#transport-line-section-heading','#transport-lines','.transport-note'])
    assert.ok(css.includes(selector),`missing cleanup selector: ${selector}`);
  assert.match(html,/id="transport-use-start"/);
  assert.match(html,/id="transport-use-end"/);
  assert.doesNotMatch(js,/TRANSPORT_API_BASE\}\/bus\/routes/);
  assert.match(js,/if\(groups\.size>1\)/);
  assert.doesNotMatch(js,/metro-reports-toggle/);
});

test('초기 길찾기 안내와 비어 있는 패널 공간을 줄이고 뉴스 소개·하단 출처 설명을 제거',()=>{
  const html=read('index.html');
  const main=read('src/main.js');
  const css=read('src/v701-compact-info-panels.css');
  assert.match(html,/id="route-status" class="route-status" role="status" aria-live="polite"><\/p>/);
  assert.match(main,/route-status'\)\.textContent='';/);
  assert.match(css,/#app #route-panel\.page-panel/);
  assert.match(css,/height:auto!important/);
  const news=html.slice(html.indexOf('<main id="news-panel"'),html.indexOf('<main id="mine-panel"'));
  assert.doesNotMatch(news,/동작구 알림|동작구 관련 뉴스와 구청 공지사항|page-note/);
});

test('지역뉴스와 교통 갱신 시각은 제공기관 이름 대신 갱신시각만 표시',()=>{
  const news=read('src/dongjak-news.js');
  const transit=read('src/transport-map.js');
  assert.match(news,/notice\.textContent=`\$\{stamp\}/);
  assert.doesNotMatch(news,/notice\.textContent=`출처:/);
  assert.match(transit,/updatedEl\.textContent=arrival\.updatedAt\?`\$\{arrival\.updatedAt\} 갱신`/);
  assert.doesNotMatch(transit,/서울시 자료 \$\{arrival\.updatedAt\}|서울시 버스 API/);
});

test('보행안전·행정동·지도 옵션의 출처 문구는 패널에서 빠지고 출처 목록으로 이동',()=>{
  const html=read('index.html');
  const css=read('src/v701-compact-info-panels.css');
  const guidance=renderEvidenceStatus({road_id:'R0288'});
  const registry=DATA_SOURCE_GROUPS.flatMap(group=>group.items);
  assert.doesNotMatch(html,/2025\.05\.12 갱신 표준노드링크 자료/);
  assert.doesNotMatch(html,/전국무인교통단속카메라 표준데이터/);
  assert.doesNotMatch(html,/행정동 경계는 통계청 기반/);
  assert.match(css,/#app\.map-controls-open \.map-advanced-controls \.map-badge/);
  assert.doesNotMatch(guidance,/pza-source-links|TAAS/);
  for(const label of ['TAAS 교통사고 분석시스템','전국무인교통단속카메라 표준데이터','사용자 제공 표준노드링크 GeoPackage'])
    assert.ok(registry.some(source=>source.name===label),`missing source: ${label}`);
});

test('v7.0.4 변경사항과 데이터 출처를 업데이트 내역에서 함께 확인 가능',()=>{
  const html=read('index.html');
  const history=read('src/version-history-v7.js');
  const releases=read('src/version-history.js');
   assert.match(html,/id="dj-guide-latest-version">분류별 내역<\/strong>/);
  assert.match(history,/데이터 출처 및 활용 범위/);
  assert.match(history,/DATA_SOURCE_GROUPS/);
  assert.match(history,/sourcesButton/);
  assert.match(history,/데이터 출처/);
  assert.match(releases,/version:'v7\.0\.1'/);
  assert.match(releases,/지하철 정보 패널의 중복 유형 라벨/); // each small change is individually recorded
});
