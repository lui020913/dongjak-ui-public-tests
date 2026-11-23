import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../../.github/workflows/mobile-first-overhaul-preview.yml',import.meta.url),'utf8');
test('production still requires identical tested app artifact and protected QA',()=>{
 assert.match(source,/branches:\s*\[main\]/);
 assert.match(source,/release\/mobile-first-overhaul-request\.json/);
 const production=source.slice(source.indexOf('\n  production:'));
 assert.ok(production.includes('needs: [build, preview, mobile-qa, desktop-tablet-qa, visual-capture, visual-qa, explore-qa]'));
 assert.ok(production.includes("environment: public-cloudflare-production"));
 assert.ok(production.includes('needs.mobile-qa.result == \'success\''));
 assert.ok(production.includes('needs.preview.result == \'success\''));
 assert.ok(production.includes('test "$(git rev-parse HEAD)" = "$SOURCE_SHA"'));
 assert.ok(production.includes('test "$SOURCE_SHA" = "$PUBLIC_SHA"'));
 assert.ok(production.includes('tar -xzf'));
 assert.ok(production.includes('trap rollback EXIT'));
 assert.ok(production.includes('cf -X POST "$api/deployments/$previous/rollback"'));
 assert.ok(production.includes('test "$verified" = 1'));
});

test('Production milestone always evaluates after optional QA skips and cannot block a good deployment',()=>{
 const begin=source.indexOf('\n  notify-production:');
 const end=source.indexOf('\n  announce:',begin);
 assert.ok(begin>=0&&end>begin);
 const block=source.slice(begin,end);
 assert.match(block,/always\(\) && needs\.production\.result == 'success'/);
 assert.match(block,/continue-on-error: true/);
 assert.match(block,/deployment-milestone:\$GITHUB_RUN_ID:production/);
 assert.doesNotMatch(block,/모바일 24개 샤드/);
 assert.match(block,/모바일 샤드/);
});
