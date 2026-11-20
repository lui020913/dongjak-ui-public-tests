import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sheetFadeOpacity} from '../src/mobile-window-motion.js';
import {compactTransportHeight} from '../src/mobile-compact-transport-sheet.js';
const source=path=>readFileSync(new URL('../src/'+path,import.meta.url),'utf8');

test('all sliding sheets have a visible, monotonic fade; closing dims before removal',()=>{
  assert.equal(sheetFadeOpacity(0,true),.12);
  assert.equal(sheetFadeOpacity(1,true),1);
  assert.equal(sheetFadeOpacity(0,false),1);
  assert(Math.abs(sheetFadeOpacity(1,false)-.07)<1e-10);
  for(const opening of [true,false]){
    const values=Array.from({length:101},(_,i)=>sheetFadeOpacity(i/100,opening));
    for(let i=1;i<values.length;i++)assert(opening?values[i]>=values[i-1]:values[i]<=values[i-1]);
  }
  assert(Math.abs(sheetFadeOpacity(0,true,.43)-.43)<1e-10,'interrupted dismissal resumes current alpha');
  assert(Math.abs(sheetFadeOpacity(0,false,.56)-.56)<1e-10,'interrupted opening resumes current alpha');
  const coordinator=source('v806-unified-ui.js');
  assert.match(coordinator,/sheetFadeOpacity\(progress,opening,slideFrom\)/);
  assert.match(coordinator,/target\.style\.setProperty\('translate'/);
});

test('transit sheet content size removes empty space but allows full expansion',()=>{
  const short=compactTransportHeight({header:90,grip:16,body:85,viewport:900});
  const long=compactTransportHeight({header:90,grip:16,body:800,viewport:900});
  assert(short<300);assert.equal(long,468);
  assert(compactTransportHeight({header:0,grip:0,body:0,viewport:900})>=196);
  const css=source('v910-request-completion.css');
  assert.match(css,/--dj9251-transport-content-height/);
  assert.match(css,/#transport-sheet:not\(\[hidden\]\):not\(\.dj871-sheet-expanded\)/);
  const js=source('mobile-compact-transport-sheet.js');
  assert.match(js,/MutationObserver/);assert.match(js,/ResizeObserver/);
  assert.match(js,/if\(panel.hidden\|\|panel.classList.contains\('dj871-sheet-expanded'\)\)return;/);
});
