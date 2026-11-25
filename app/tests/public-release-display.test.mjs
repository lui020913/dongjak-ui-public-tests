import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PUBLIC_APP_VERSION,PUBLIC_LOADING_VERSION,CHANGE_TYPE_GROUPS,classifyReleaseNote,publicReleaseNote,cleanHistoryNote,historyHighlights} from '../src/public-release-display.js';
import {APP_RELEASES,APP_VERSION} from '../src/app-version.js';
import {RENUMBERED_VERSION_HISTORY} from '../src/version-history.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('pre-release version is fixed, but operational provenance stays independent',()=>{
 assert.equal(PUBLIC_APP_VERSION,'1.0');
 assert.equal(PUBLIC_LOADING_VERSION,'버전 1.0');
 // Operational versions use SemVer (e.g. 8.26.1 at rest, 9.2.75 in a staged release).
 // They must not be conflated with the fixed user-visible pre-release label 1.0.
 assert.match(APP_RELEASES[0].version,/^v?\d+\.\d+\.\d+$/);
 assert.equal(APP_RELEASES[0].version.replace(/^v/,''),APP_VERSION);
 assert.match(read('index.html'),/id="map-startup-version"[^>]*>버전 1\.0<\/span>/);
 assert.match(read('src/v7120-settings.js'),/id="dj-about-version-number">1\.0<\/strong>/);
 assert.doesNotMatch(read('index.html'),/id="version-history-trigger"[^>]*>v\d/);
});
test('release history removes only its own internal build number from visible text',()=>{
 assert.equal(publicReleaseNote('모바일 안정성 개선 (9.2.76)','9.2.76'),'모바일 안정성 개선');
 assert.equal(publicReleaseNote('디자인 변경 (v9.2.76) · 지도 3D','v9.2.76'),'디자인 변경 · 지도 3D');
 assert.equal(publicReleaseNote('7일 날씨와 외부 API 1.2.3','9.2.76'),'7일 날씨와 외부 API 1.2.3');
 assert.ok(read('src/version-history-v7.js').includes('publicReleaseNote(description,record.version)'));
});
test('notes are categorized deterministically and archived text is preserved',()=>{
 assert.deepEqual(CHANGE_TYPE_GROUPS.map(x=>x.id),['major','feature','design','fix']);
 assert.equal(classifyReleaseNote('핵심 구조 개편','major'),'major');
 assert.equal(classifyReleaseNote('신규 기능 추가','minor'),'feature');
 assert.equal(classifyReleaseNote('아이콘 및 헤더 디자인 개선','patch'),'design');
 assert.equal(classifyReleaseNote('오류 수정 및 안정화','patch'),'fix');
 const original=APP_RELEASES.concat(RENUMBERED_VERSION_HISTORY);
 const total=original.reduce((count,r)=>count+(r.sourceItems||r.items||[]).length,0);
 const classified=original.reduce((count,r)=>count+(r.sourceItems||r.items||[]).filter(note=>CHANGE_TYPE_GROUPS.some(group=>group.id===classifyReleaseNote(note,r.scale))).length,0);
 assert.equal(classified,total);
 const history=read('src/version-history-v7.js');
 assert.ok(history.includes('buildGenerationCatalog(releases,releaseEdition)'));
 assert.ok(history.includes('CHANGE_TYPE_GROUPS'));
 assert.ok(history.includes('classifyReleaseNote'));
 assert.equal(history.includes('현재 빌드: '),false);
});

test('public timeline hides repetitive placeholders and development notes but keeps actual changes',()=>{
 assert.equal(cleanHistoryNote('모바일 안정성 및 상호작용 개선 (9.2.90)','9.2.90'),'');
 assert.equal(cleanHistoryNote('모바일 안정성 및 상호작용 개선','9.2.91'),'');
 assert.equal(cleanHistoryNote('소스 CI 및 회귀 테스트 추가','9.2.91'),'');
 assert.equal(cleanHistoryNote('지역 선택 개선; 회귀 테스트 추가','9.2.91'),'지역 선택 개선');
 assert.equal(cleanHistoryNote('지하철 도착정보 개선 (9.2.91)','9.2.91'),'지하철 도착정보 개선');
 assert.deepEqual(historyHighlights('fix',['커뮤니티 알림창을 열 때 일반 게시물이 함께 표시되는 문제를 수정했습니다.']),['커뮤니티 알림에 일반 게시물이 함께 표시되는 문제를 수정했습니다.']);
 const source=read('src/version-history-v7.js');
 assert.match(source,/if\(record===currentRelease\)continue/);
 assert.match(source,/seen\.has\(keyFor\(first\)\)/);
 assert.match(source,/dj-history-archive/);
});
