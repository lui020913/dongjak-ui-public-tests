import {APP_VERSION} from '../src/app-version.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('v729-R1 is a standalone presentation addition on the original v7.0.29',()=>{
  const html=read('index.html');
  const css=read('src/v729-r1-responsive-ui.css');
  const main=read('src/main.js');
  assert.match(html,/dongjak-ui-rebuild" content="v729-r1-from-original-20261112"/);
  assert.match(html,/src\/v729-r1-responsive-ui\.css/);
  assert.match(html,/src\/v729-r1-visual-check\.js/);
  assert.match(main,/https:\/\/tiles\.openfreemap\.org\/styles\/bright/);
  assert.match(main,/createMapStartupLoader\(\{map\}\)/);
  assert.equal(JSON.parse(read('package.json')).version,APP_VERSION);
  const rules=css.replace(/\/\*[\s\S]*?\*\//g,'');
  assert.doesNotMatch(rules,/#map(?:\s|\{|\.|\[|\,|:|$)|maplibregl|map-startup|map-canvas/i);
  assert.doesNotMatch(html,/v7\.0\.3[0-3]/);
});
