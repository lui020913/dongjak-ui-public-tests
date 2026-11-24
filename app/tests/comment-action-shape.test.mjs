import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
test('comment submit and photo use the same explicit geometry owner',()=>{
 const js=readFileSync(new URL('../src/main.js',import.meta.url),'utf8'),css=readFileSync(new URL('../src/community-composer-portal.css',import.meta.url),'utf8');
 assert.ok(js.includes('commentActionShape(send)'));
 assert.ok(js.includes("commentActionShape(communityButton('사진','community-comment-photo'"));
 assert.ok(js.includes("'border-radius':'14px','height':'44px','min-height':'44px','min-width':'48px'"));
 assert.ok(css.includes(':is(.community-comment-submit,.community-comment-photo)'));
});
