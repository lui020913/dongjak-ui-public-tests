import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
// The retired standalone night UI was removed; its history remains in Git.
test('retired night-visibility.css is absent while the offline research model remains',()=>{
  assert.equal(existsSync(new URL('../src/night-visibility.css',import.meta.url)),false);
  assert.ok(existsSync(new URL('../src/night-occlusion.js',import.meta.url)));
  assert.ok(existsSync(new URL('../src/night-visibility-analysis.js',import.meta.url)));
  assert.doesNotMatch(readFileSync(new URL('../index.html',import.meta.url),'utf8'),/id="night-visibility-toggle"/);
});
