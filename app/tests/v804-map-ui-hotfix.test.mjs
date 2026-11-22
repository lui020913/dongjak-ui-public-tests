import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const get=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=get('index.html');
const css=get('src/v804-ui-fixes.css');
const js=get('src/v804-ui-fixes.js');
test('all project UI changes are loaded from the actual map HTML',()=>{
  assert.match(html,/src\/v804-ui-fixes\.css/);assert.match(html,/src\/v804-ui-fixes\.js/);
});
test('small mobile text option reaches the authoritative select and storage',()=>{
  assert.match(html,/<option value="small">작게<\/option>/);
  assert.match(get('src/v800-ui-architecture.js'),/<select id="dj800-type-size"><option value="small">작게<\/option>/);
  assert.match(get('src/safety-workbench-v7103.js'),/allowedScale=new Set\(\['small','normal','large','xlarge'\]\)/);
  assert.doesNotMatch(get('src/v7120-settings.js'),/prefs\.text==='small'\?'small'/);
  assert.match(get('src/v834-my-info.js'),/data-dj885-type="scale" data-value="small"/);
  assert.match(js,/realScale\.dispatchEvent\(new Event\('change'/);
});
test('transit title is reflowed without removing event handlers and bus explanations are scoped',()=>{
  assert.match(js,/lineRow\.append\(n\)/);assert.match(css,/\.dj804-station-lines/);
  assert.match(css,/#transport-sheet\[data-kind="bus"\] \.dj-v724-bus-label/);
  assert.match(css,/height:max-content!important/);
});
test('user-supplied dark app icon is actually included at all sizes',()=>{
  for(const s of [180,192,512,1024])assert.ok(existsSync(new URL('../public/icons/dongjak-dark-'+s+'.png',import.meta.url)));
});
test('phone motion respects accessibility and roadwidth animates',()=>{
  assert.match(js,/prefers-reduced-motion: reduce/);
  assert.match(css,/@keyframes dj804-road-open/);
});
