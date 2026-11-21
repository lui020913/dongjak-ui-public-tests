import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const appRoot=fileURLToPath(new URL('../',import.meta.url));
const html=readFileSync(path.join(appRoot,'index.html'),'utf8');
const linkedCss=new Set([...html.matchAll(/<link\b[^>]*href=["']\/src\/([^"']+\.css)["']/g)].map(m=>path.posix.normalize('src/'+m[1])));

function* walk(dir){
  for(const entry of readdirSync(dir,{withFileTypes:true})){
    const name=path.join(dir,entry.name);
    if(entry.isDirectory())yield* walk(name);
    else if(/\.m?js$/.test(entry.name))yield name;
  }
}

test('an active stylesheet is not both HTML-linked and JS-imported',()=>{
  const duplicate=[];
  // The HTML stylesheet link must remain: it paints the phone toolbar before
  // JS executes. A second JS import places the same CSS in another chunk and
  // can change stylesheet ordering during startup.
  for(const directory of ['src','platforms']){
    for(const file of walk(path.join(appRoot,directory))){
      const code=readFileSync(file,'utf8');
      for(const match of code.matchAll(/\bimport\s*['"]([^'"]+\.css)['"]/g)){
        if(!match[1].startsWith('.'))continue; // npm CSS packages are not HTML links
        const absolute=path.resolve(path.dirname(file),match[1]);
        const local=path.relative(appRoot,absolute).split(path.sep).join('/');
        if(linkedCss.has(local))duplicate.push({source:path.relative(appRoot,file),css:local});
      }
    }
  }
  assert.deepEqual(duplicate,[],`Duplicate stylesheet entrypoints: ${JSON.stringify(duplicate)}`);
});

test('the phone toolbar styles remain linked for first paint',()=>{
  for(const name of [
    'v831-swipe-feature-toolbar.css',
    'v832-priority-feature-toolbar.css',
    'v836-sheet-toolbar-controls.css'
  ])assert.ok(linkedCss.has('src/'+name),name);
});
