import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../src/v910-request-completion.css',import.meta.url),'utf8');
test('paired bus arrival cards retain two equal columns on compact phone widths',()=>{
  const rule='#app #transport-sheet[data-kind="bus"] #transport-arrivals {display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px!important;}';
  assert(css.includes(rule));
  assert(!css.includes('grid-template-columns:repeat(auto-fit,minmax(min(100%,205px),1fr))'));
});
