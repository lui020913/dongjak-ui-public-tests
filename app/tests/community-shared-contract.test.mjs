import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('shared community is opt in and preserves old private browser records',()=>{const main=read('src/main.js');assert.match(main,/signedIn&&document\.getElementById\('community-share-publicly'\)\?\.checked/);assert.match(main,/if\(!post.shared\|\|post.mine\)/);assert.match(main,/publishCommunityPost\(post\)/);assert.match(read('index.html'),/type="checkbox" id="community-share-publicly"/);});
