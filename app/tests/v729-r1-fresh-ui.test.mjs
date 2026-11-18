import {APP_VERSION} from '../src/app-version.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('legacy R1 PC presentation assets are no longer loaded by the shared app',()=>{
 const html=read('index.html'),main=read('src/main.js');
 assert.ok(html.includes('dongjak-ui-rebuild" content="v729-r1-from-original-20261112"'));
 assert.equal(html.includes('v729-r1-responsive-ui.css'),false);
 assert.equal(html.includes('v729-r1-visual-check.js'),false);
 assert.ok(main.includes("import './mobile-first-layout.css'"));
 assert.match(main,/https:\/\/tiles\.openfreemap\.org\/styles\/bright/);
 assert.match(main,/createMapStartupLoader\(\{map\}\)/);
 assert.equal(JSON.parse(read('package.json')).version,APP_VERSION);
 assert.doesNotMatch(html,/v7\.0\.3[0-3]/);
});
