import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {changedCssScope,selectViewportScope,isFullAudit,VIEWPORTS} from '../scripts/viewport-scope-policy.mjs';
const pc='@media (min-width:1080px) and (pointer:fine),(min-width:1367px)';
const phone='@media (max-width:699px)';
const tablet='@media (min-width:700px) and (max-width:1079px), (min-width:1080px) and (max-width:1366px) and (pointer:coarse)';
const css='@layer request-completion { .all { color: red; } '+pc+' { .a { top: 1px; } } '+phone+' { .b { top: 2px; } } '+tablet+' { .c { top: 3px; } } }';
test('device-specific rules in a shared CSS file select only their matrix',()=>{
 assert.equal(changedCssScope(css,css.replace('1px','4px')),'pc');
 assert.equal(changedCssScope(css,css.replace('2px','4px')),'mobile');
 assert.equal(changedCssScope(css,css.replace('3px','4px')),'tablet');
});
test('shared, combined, boundary-changing, reordered and malformed changes always run full',()=>{
 for(const next of [css.replace('red','blue'),css.replace('1px','4px').replace('2px','5px'),css.replace('pointer:fine','pointer:coarse'),css.replace('1080px','900px'),css.replace('.all { color: red; } ','')+' .all { color: red; }',css.slice(0,-1),css.replace('top: 1px;', 'top: 1px; } .shared { top: 9px;')]){
  assert.equal(changedCssScope(css,next),'full');
 }
 assert.equal(changedCssScope('@media (min-width:1080px) {.a{top:1px}}','@media (min-width:1080px) {.a{top:2px}}'),'full');
});
test('CSS parser does not treat strings or comments as media rules',()=>{
 const before='.a{content:"@media (max-width:699px) { }";}/* } */'+pc+'{.b{top:1px;}}';
 assert.equal(changedCssScope(before,before.replace('1px','2px')),'pc');
 assert.equal(changedCssScope(before,before.replace('content:','--text:')),'full');
});
test('only verified ancestor with complete modified CSS files may reduce browser matrix',async()=>{
 const comparison={status:'ahead',base_commit:{sha:'x'},merge_base_commit:{sha:'x'},files:[{filename:'src/v912-desktop-poi.css',status:'modified'}]};
 const pair=async()=>[css,css.replace('1px','2px')];
 assert.equal(await selectViewportScope(comparison,pair),'pc');
 assert.equal(await selectViewportScope({...comparison,status:'diverged'},pair),'full');
 assert.equal(await selectViewportScope({...comparison,files:[...comparison.files,{filename:'src/main.js',status:'modified'}]},pair),'full');
 assert.equal(await selectViewportScope({...comparison,files:[{filename:'src/x.css',status:'renamed'}]},pair),'full');
});
test('selective success can never become full release proof',()=>{
 const jobs=scope=>VIEWPORTS[scope].map(v=>({name:'ui ('+v+')',conclusion:'success'}));
 assert.equal(isFullAudit(jobs('pc')),false);
 assert.equal(isFullAudit(jobs('tablet')),false);
 assert.equal(isFullAudit(jobs('mobile')),false);
 assert.equal(isFullAudit(jobs('full')),true);
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
 const prod=read('.github/workflows/public-exact-production.yml');
 assert.ok(prod.includes('for viewport in '+VIEWPORTS.full.join(' ')+';do'));
 assert.ok(read('.github/workflows/v911-full-audit-request.yml').includes('viewport_scope:"full"'));
 assert.ok(read('.github/workflows/public-private-source-preview.yml').includes('node --test --test-reporter=tap tests/*.test.mjs'));
});
