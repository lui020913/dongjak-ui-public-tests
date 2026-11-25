import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=dirname(fileURLToPath(import.meta.url));
test('the REAL PRI map retains school review details within the existing policy score map but no new PRI factor',async()=>{
 const [ui,engine,manifest]=await Promise.all([
  readFile(resolve(dir,'../src/pri-map.js'),'utf8'),
  readFile(resolve(dir,'../src/pri-data.mjs'),'utf8'),
  readFile(resolve(dir,'../public/data/pri/manifest.json'),'utf8')
 ]);
 assert.ok(ui.includes("import {buildSanghyeonMiddleSchoolReview}"));
 assert.ok(!ui.includes("['middleReview','상현중학교"));
 assert.ok(!ui.includes('showProtectionDetail'));
 assert.ok(ui.includes("if(id==='middleReview')id='protectionGap'"));
 assert.ok(ui.includes("schoolReview=buildSanghyeonMiddleSchoolReview(geo)"));
 assert.ok(!ui.includes('SCHOOL_COLOR'));
 assert.ok(!ui.includes('SCHOOL_LINE'));
 assert.ok(!ui.includes('schoolKey'));
 assert.ok(ui.includes("schoolReview?.features?.some(f=>f.properties.segment_id===s.id)"));
 assert.ok(ui.includes("mode==='protectionGap'?protectionGapColors:colors"));
 assert.ok(ui.includes('중학교 위험점수 NULL'));
 assert.ok(!engine.includes('"middleReview"'),'middle-school audit must not become a weighted factor');
 assert.ok(!JSON.parse(manifest).patches.some(x=>/middle.*school/i.test(x)));
});
