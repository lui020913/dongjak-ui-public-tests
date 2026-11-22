import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {selectRepresentativeRailPaths} from '../src/rail-official-shapes.js';

const read=(file)=>readFileSync(new URL('../src/'+file,import.meta.url),'utf8');

test('light theme uses the bright teal palette and continuous status-page surfaces',()=>{
  const theme=read('theme-contract.css');
  const page=read('mobile-ui/current.css');
  const ai=read('v880-supabase-safety-ai.css');
  assert.match(theme,/--dj800-accent:#0d8875!important/);
  assert.ok(theme.includes('html[data-theme="light"] body:has(#dj-ai-search-modal[open])'));
  assert.ok(theme.includes('.dj860-onboarding :is(.dj860-card,.dj860-head,.dj860-content,.dj860-footer)'));
  assert.ok(!page.includes('#app[data-theme="light"] #mine-panel {background:#fff!important'));
  assert.match(ai,/--ai-bg:#edf3ef;--ai-card:#ffffff/);
});

test('transport close is not reinterpreted as a deliberate AI orb activation',()=>{
  const ai=read('v880-supabase-safety-ai.js');
  assert.ok(ai.includes('Date.now()-transportDismissedAt<1600'));
  assert.ok(ai.includes('pointerIntent=Boolean(orb&&pointerStart'));
  assert.ok(ai.includes('if(!pointerIntent&&!keyboardIntent)return'));
  assert.ok(ai.includes("removeEventListener('keydown',captureOrbKeyboard,true)"));
});

test('language selector is mounted into the account display group after initialization',()=>{
  const language=read('v854-language.js');
  const full=read('mobile-primary-fullscreen.css');
  assert.match(language,/const ensurePlacement=/);
  assert.ok(language.includes('group.insertBefore(section,history||null)'));
  assert.ok(language.includes('body.prepend(section)'));
  assert.ok(full.includes('.dj834-settings-group > .dj854-language-section select'));
  assert.match(full,/touch-action:pan-y!important/);
  assert.ok(full.includes('grid-template-columns:repeat(5,minmax(0,1fr))'));
});

test('parallel official up and down rail tracks collapse to one route stroke',()=>{
  const path=(y,lo,hi)=>({line:'7',coordinates:[[lo,y],[(lo+hi)/2,y],[hi,y]]});
  const a=path(37.50,126.90,126.915);
  const reverse=path(37.500055,126.90,126.915);
  const extension=path(37.50,126.92,126.93);
  const ref={nearest:point=>({
    distance:Math.abs(point[1]-37.50)*111320,
    along:(point[0]-126.89)*88000
  })};
  const chosen=selectRepresentativeRailPaths([reverse,extension,a],ref);
  assert.equal(chosen.length,2);
  assert.ok(chosen.includes(a),'prefer the closer survey centerline');
  assert.ok(chosen.includes(extension),'retain unique rail coverage');
  assert.ok(!chosen.includes(reverse),'drop the duplicate parallel track');
});

test('bus sheet height is stable while collapsing and while arrivals refresh',()=>{
  const compact=read('mobile-compact-transport-sheet.js');
  const drag=read('dj-v8212-sheet-controller.js');
  assert.match(drag,/panel\.dispatchEvent\(new CustomEvent\('dongjak:transport-dismiss'\)\)/);
  assert.ok(compact.includes('settleUntil=Date.now()+240'));
  assert.ok(compact.includes("if(kind==='bus'){size=Math.max(size,busFloor)"));
  assert.ok(compact.includes("panel.classList.contains('dj-sheet-dragging')"));
});
