import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../../frontend/production/mobile-next.css',import.meta.url),'utf8');
const history=readFileSync(new URL('../src/version-history-v7.js',import.meta.url),'utf8');

test('empty community feed is an actual interactive home, not a blank list or fake posts',()=>{
  assert.match(main,/dj-community-empty-state/);
  assert.match(main,/첫 글 작성하기/);
  assert.match(main,/공개 글 다시 확인/);
  assert.match(main,/공개 게시판 연결을 확인해 주세요/);
  assert.match(main,/동네 질문 남기기/);
  assert.match(main,/communityButton\(label,'dj-community-topic'/);
  assert.match(main,/openCommunityComposer\(true\)/);
  assert.match(main,/if\(!shown\.length\)/);
  assert.doesNotMatch(main,/sharedCommunityPosts=\[\];communityCloudStatus='공유 게시판 연결 실패/);
  assert.match(main,/공유 게시판 연결 실패 · 기존 기록은 유지됩니다/);
});

test('community empty state keeps the native scroll owner and does not impose a 52dvh blank panel',()=>{
  assert.doesNotMatch(css,/#participation-panel:has\(#community-list \.empty-hint\)/);
  assert.match(css,/#participation-panel #community-list \.dj-community-empty-state/);
  assert.match(css,/#participation-panel #community-list \.dj-community-starter-topics/);
  assert.match(css,/min-height:46px/);
});

test('operational release renderer does not duplicate real SemVer as a fake former build',()=>{
  assert.match(history,/const isOperational=\/\^v\?9/);
  assert.match(history,/if\(isOperational\)/);
  assert.doesNotMatch(history,/release===currentRelease\?'현재 빌드: '/);
});
