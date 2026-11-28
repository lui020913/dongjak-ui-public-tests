import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
test('retired theme state does not exist; public theme initialization is fixed to light',()=>{
 assert.equal(existsSync(new URL('../src/theme-state-core.mjs',import.meta.url)),false);
 const ui=readFileSync(new URL('../src/ui-environment.js',import.meta.url),'utf8');
 assert.match(ui,/const theme='light'/);
 assert.doesNotMatch(ui,/createThemeState|setTemporaryTheme/);
});
