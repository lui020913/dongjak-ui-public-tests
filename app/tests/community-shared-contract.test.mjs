import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('shared community is opt in and preserves old private browser records',()=>{const main=read('src/main.js');assert.match(main,/if\(wantsPublic&&!signedIn\)/);assert.match(main,/if\(!wantsPublic\)/);assert.doesNotMatch(main,/saveCommunity\(\[post,\.\.\.communityPosts\]\)/);assert.match(main,/if\(!post.shared\|\|post.mine\)/);assert.match(main,/publishCommunityPost\(post\)/);assert.match(read('index.html'),/type="checkbox" id="community-share-publicly"/);});

test('requesting public publication while signed out does not silently create a local-only record',()=>{assert.match(read('src/main.js'),/if\(wantsPublic&&!signedIn\)\{toast\([^;]+;return;\}/);});
