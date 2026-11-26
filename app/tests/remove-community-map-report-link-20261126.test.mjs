import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
test('remove only the redundant community map report entry',()=>{
 const html=read('../index.html'),main=read('../src/main.js');
 assert.doesNotMatch(html,/id="participate-register"|지도에서 보행환경 제보하기/);
 assert.doesNotMatch(main,/participate-register/);
 for(const id of ['community-compose-toggle','community-category','community-map-pick','community-form','ped-report-open']){
   assert.ok(html.includes('id="'+id+'"'),id+' must remain');
 }
 assert.ok(html.includes('<option value="보행 불편">보행 불편</option>'));
 assert.ok(main.includes("document.getElementById('community-list').hidden=open;"));
});
