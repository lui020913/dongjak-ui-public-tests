import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (relative) => readFileSync(new URL(relative, root), 'utf8');

test('v8.4 shell imports panel registries, keeps v8.3.1 transit enhancements', () => {
  const source=read('src/v840-coordinated-ui.js');
  const core=read('src/v840-ui-core.js');
  const html=read('index.html');
  assert.match(source, /import\s*\{[^}]*PRIMARY_PANELS[^}]*TRANSIENT_PANELS[^}]*\}\s*from '\.\/v840-ui-core\.js'/);
  assert.match(core, /export const PRIMARY_PANELS=/);
  assert.match(core, /export const TRANSIENT_PANELS=/);
  assert.match(html, /src\/v840-coordinated-ui\.js/);
  assert.match(html, /src\/v8215-transit-auth-bus-sheet\.js/);
  assert.match(html, /src\/v8215-transit-auth-bus-sheet\.css/);
});

test('v8.4 shell initializes without a runtime ReferenceError', async () => {
  const coreURL=new URL('src/v840-ui-core.js',root).href;
  const src=read('src/v840-coordinated-ui.js')
    .replace("import './v840-coordinated-ui.css';",'')
    .replaceAll("'./v840-ui-core.js'", JSON.stringify(coreURL));
  const mod=await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
  const makeElement=()=>{const classes=new Set();return {dataset:{}, hidden:false,
    classList:{contains:k=>classes.has(k),add:k=>classes.add(k),remove:k=>classes.delete(k),toggle:(k,v)=>{if(v===undefined)v=!classes.has(k);if(v)classes.add(k);else classes.delete(k);return v;}},
    append:()=>{},remove:()=>{},setAttribute:()=>{},removeAttribute:()=>{},
    addEventListener:()=>{},removeEventListener:()=>{},querySelector:()=>null};};
  const app=makeElement();app.dataset.tab='map';
  const nav=makeElement();
  const doc={
    getElementById:(id)=>id==='app'?app:id==='bottom-nav'?nav:null,
    createElement:()=>makeElement(),querySelector:()=>null,querySelectorAll:()=>[],
    addEventListener:()=>{},removeEventListener:()=>{},dispatchEvent:()=>{},
  };
  const win={requestAnimationFrame:(fn)=>fn(),setInterval:()=>123,clearInterval:()=>{},setTimeout:(fn)=>fn(),queueMicrotask:(fn)=>fn()};
  const oldObserver=globalThis.MutationObserver;
  globalThis.MutationObserver=class {observe(){} disconnect(){}};
  try {
    const cleanup=mod.installCoordinatedShell(doc,win);
    assert.equal(app.dataset.dj840Installed,'1');
    assert.equal(typeof cleanup,'function');
    cleanup();
    assert.equal(app.dataset.dj840Installed,undefined);
  } finally {
    if(oldObserver===undefined)delete globalThis.MutationObserver;
    else globalThis.MutationObserver=oldObserver;
  }
});
