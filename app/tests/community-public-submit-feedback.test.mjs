import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const submit=main.slice(main.indexOf("communityForm.addEventListener('submit',async(event)=>"),main.indexOf('// Shared controls are located in 지도 옵션'));
test('public post can retry even after stale moderation status',()=>{
  assert.doesNotMatch(submit,/communityModerationStatus\?\.ready===false/);
  assert.match(submit,/await publishCommunityPost\(post\)/);
  assert.match(submit,/if\(!await isCommunitySignedIn\(\)\)/);
});
test('validation and server errors are visible in the composer and draft survives errors',()=>{
  assert.match(main,/button\.before\(note\)/);
  assert.match(main,/communityForm\.addEventListener\('invalid'/);
  assert.match(submit,/catch\(error\)\{setCommunityPublishFeedback\([^\n]+return;\}/);
  assert.ok(submit.indexOf('communityForm.reset()')>submit.indexOf('await publishCommunityPost(post)'));
  assert.ok(submit.indexOf("dataset.djPublishing='true'")<submit.indexOf('await isCommunitySignedIn()'));
});
