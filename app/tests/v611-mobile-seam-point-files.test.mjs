import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  checkPointAttachmentSelection, safeFileExtension, canPreviewPointImage,
  MAX_POINT_FILES, MAX_SINGLE_FILE_BYTES
} from '../src/point-attachments.js';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const js=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/v611-registration-seam.css',import.meta.url),'utf8');
const sample=(name,size=1024)=>({name,size});
test('mobile bottom-nav has no upper rounded corners, while overview sheet stays rounded',()=>{
  assert.match(css,/@media\s*\(max-width:1079px\)/);
  assert.match(css,/#app #bottom-nav,[\s\S]+?border-radius:0!important/);
  assert.match(css,/border-top:0!important/);
  assert.match(css,/\.sheet\.overview-sheet:not\(\[hidden\]\)/);
  assert.ok(js.lastIndexOf("import './v611-registration-seam.css'") > js.lastIndexOf("import './mobile-ui-v610.css'"));
});
test('registration has accessible multi-file selector and detailed attachment list',()=>{
  assert.match(html,/id="point-attachment-input" type="file" multiple/);
  assert.match(html,/id="point-attachment-list"/);
  assert.match(html,/id="detail-attachment-list"/);
  assert.match(html,/id="point-attachment-help"/);
});
test('registration and editing persist point files before reporting success',()=>{
  assert.match(js,/form\.addEventListener\('submit',async/);
  assert.match(js,/await updatePointAttachments\(p\.id,stagedPointFiles,removedPointFileIds\)/);
  assert.match(js,/renderDetailPointFiles\(p\)/);
  assert.match(js,/deletePointAttachments\(p\.id\)/);
});
test('safe attachment type validation includes images and office/PDF documents',()=>{
  assert.equal(safeFileExtension('현장기록.PDF'),'pdf');
  assert.equal(canPreviewPointImage(sample('현장.jpeg')),true);
  assert.equal(canPreviewPointImage(sample('아이폰.heic')),false);
  assert.equal(checkPointAttachmentSelection([], [sample('photo.webp'),sample('기록.hwpx')]).length,2);
  assert.throws(()=>checkPointAttachmentSelection([], [sample('malware.exe')]),/지원하지/);
  assert.throws(()=>checkPointAttachmentSelection([], [sample('too-large.pdf',MAX_SINGLE_FILE_BYTES+1)]),/8MB/);
  assert.throws(()=>checkPointAttachmentSelection([],Array.from({length:MAX_POINT_FILES+1},(_,i)=>sample(`${i}.jpg`))),/6개/);
});
test('deleting existing attachments from a draft frees space for replacements',()=>{
  const existing=[{id:'old',name:'previous.pdf',size:3000}];
  assert.equal(checkPointAttachmentSelection(existing,[sample('new.pdf')],new Set(['old'])).length,1);
});
test('attachments remain local and the obsolete export/backup UI is removed',()=>{
  assert.match(js,/await updatePointAttachments\(p\.id,stagedPointFiles,removedPointFileIds\)/);
  assert.doesNotMatch(js,/pointFileToDataURL|dongjak_app_points_with_files/);
  assert.doesNotMatch(html,/id="export-points"|id="my-export"/);
  assert.doesNotMatch(js,/fetch\([\s\S]*?point-attachment-input/);
});
