import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const styleFiles=['v857-requested-ux.css','v800-ui-architecture.css','v854-integrated-ui.css'];
function leafRules(src){
 const results=[],stack=[];let start=0,quoted='',escape=false,comment=false;
 for(let i=0;i<src.length;i++){
  const c=src[i],n=src[i+1];
  if(comment){if(c==='*'&&n==='/'){comment=false;i++;}continue;}
  if(quoted){if(escape)escape=false;else if(c==='\\')escape=true;else if(c===quoted)quoted='';continue;}
  if(c==='/'&&n==='*'){comment=true;i++;continue;}
  if(c==="'"||c==='"'){quoted=c;continue;}
  if(c==='{'){
   const selector=src.slice(start,i).replace(/\/\*[\s\S]*?\*\//g,'').trim().replace(/\s+/g,' ');
   stack.push({selector,open:i,children:0,scope:stack.map(x=>x.selector).filter(v=>v.startsWith('@')).join('|')});
   start=i+1;continue;
  }
  if(c==='}'){
   const block=stack.pop();
   assert.ok(block,'CSS has an unexpected closing brace');
   if(block.children===0&&block.selector){
    const body=src.slice(block.open+1,i).replace(/\/\*[\s\S]*?\*\//g,'').replace(/\s+/g,'').trim();
    if(body)results.push({...block,body});
   }
   if(stack.length)stack.at(-1).children++;
   start=i+1;continue;
  }
  if(c===';'&&!stack.length)start=i+1;
 }
 assert.equal(stack.length,0,'CSS has an unclosed block');
 return results;
}
test('active viewport styles retain unique declarations without byte-identical older copies',()=>{
 const minLeaves=new Map([['v857-requested-ux.css',145],['v800-ui-architecture.css',110],['v854-integrated-ui.css',80]]);
 for(const file of styleFiles){
  const src=readFileSync(new URL('../src/'+file,import.meta.url),'utf8');
  const rules=leafRules(src);
  assert.ok(rules.length>=minLeaves.get(file),file+' unexpectedly lost its stylesheet');
  const seen=new Set();
  for(const rule of rules){
   const key=rule.scope+'|'+rule.selector+'{'+rule.body+'}';
   assert.ok(!seen.has(key),file+' contains identical earlier CSS rule under same media scope: '+rule.selector);
   seen.add(key);
  }
 }
});
test('required mobile and desktop geometry rules remain present after dedupe',()=>{
 const v857=leafRules(readFileSync(new URL('../src/v857-requested-ux.css',import.meta.url),'utf8'));
 const v800=leafRules(readFileSync(new URL('../src/v800-ui-architecture.css',import.meta.url),'utf8'));
 const v854=leafRules(readFileSync(new URL('../src/v854-integrated-ui.css',import.meta.url),'utf8'));
 const has=(rules,scope,fragment,body)=>rules.some(x=>x.scope===scope&&x.selector.includes(fragment)&&x.body.includes(body));
 assert.ok(has(v857,'@media(max-width:699px)','#transport-neighbors','backdrop-filter:none!important'));
 assert.ok(has(v857,'@media(max-width:699px)','.dj-place-header-actions','gap:3px!important'));
 assert.ok(has(v857,'@media(max-width:699px)','.dj-place-header-actions button','flex-basis:32px!important'));
 assert.ok(has(v800,'@media(max-width:699px)','#dj-settings-mobile img','object-fit:contain!important'));
 assert.ok(has(v854,'@media (min-width:1080px)','#bottom-nav>.nav-tab[data-tab="map"]','order:-1!important'));
});
