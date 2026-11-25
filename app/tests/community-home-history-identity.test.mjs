import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const history=readFileSync(new URL('../src/version-history-v7.js',import.meta.url),'utf8');

test('empty community feed is an actual interactive home, not a blank list or fake posts',()=>{
  assert.match(main,/dj-community-empty-state/);
  assert.match(main,/community-compose-toggle/);
  assert.match(main,/공개 글 다시 확인/);
  assert.match(main,/공유 게시판 연결을 확인해 주세요/);
  assert.doesNotMatch(main,/communityButton\(label,'dj-community-topic'/);
  assert.match(main,/if\(loading\|\|offline\|\|filtered\)actions\.append/);
  assert.match(main,/openCommunityComposer\(true\)/);
  assert.match(main,/if\(!shown\.length\)/);
  assert.doesNotMatch(main,/sharedCommunityPosts=\[\];communityCloudStatus='공유 게시판 연결 실패/);
  assert.match(main,/공유 게시판 연결 실패 · 기존 기록은 유지됩니다/);
});

test('release renderer groups unchanged notes by category without visible build numbers',()=>{
 assert.match(history,/CHANGE_TYPE_GROUPS/);
 assert.match(history,/historyHighlights/);
 assert.match(history,/dataset\.version/);
 assert.doesNotMatch(history,/현재 빌드: /);
});
