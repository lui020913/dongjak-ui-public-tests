import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=dirname(fileURLToPath(import.meta.url));
test('the REAL PRI map exposes a middle school research-only mode but no new PRI factor',async()=>{
 const [ui,engine,manifest]=await Promise.all([
  readFile(resolve(dir,'../src/pri-map.js'),'utf8'),
  readFile(resolve(dir,'../src/pri-data.mjs'),'utf8'),
  readFile(resolve(dir,'../public/data/pri/manifest.json'),'utf8')
 ]);
 assert.ok(ui.includes("import {buildSanghyeonMiddleSchoolReview}"));
 assert.ok(ui.includes("['middleReview','상현중학교 300m 도로 검토 · 점수 미산정']"));
 assert.ok(ui.includes("if(id==='middleReview')"));
 assert.ok(ui.includes("middleSchoolReview:true"));
 assert.ok(ui.includes("middleReview'?'#7759a8'"));
 assert.ok(ui.includes("middleReview'?'상현중학교 300m 도로 · 점수 미산정'"));
 assert.ok(ui.includes('중학교 전용 점수 없음'));
 assert.ok(!engine.includes('"middleReview"'),'middle-school audit must not become a weighted factor');
 assert.ok(!JSON.parse(manifest).patches.some(x=>/middle.*school/i.test(x)));
});
