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
