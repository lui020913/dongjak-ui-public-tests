import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sources=['night-visibility-panel.css','protection-zone-map.css','browser-install-menu.css'];
function leafRules(src){
 const stack=[],rules=[];let start=0,quote='',escape=false,comment=false;
 for(let i=0;i<src.length;i++){
  const c=src[i],n=src[i+1];
  if(comment){if(c==='*'&&n==='/'){comment=false;i++;}continue;}
  if(quote){if(escape)escape=false;else if(c==='\\')escape=true;else if(c===quote)quote='';continue;}
  if(c==='/'&&n==='*'){comment=true;i++;continue;}
  if(c==='"'||c==="'"){quote=c;continue;}
  if(c==='{'){
   const selector=src.slice(start,i).replace(/\\/\\*[\\s\\S]*?\\*\\//g,'').trim().replace(/\\s+/g,' ');
   stack.push({selector,open:i,children:0,scope:stack.map(x=>x.selector).filter(x=>x.startsWith('@')).join('|')});start=i+1;continue;
  }
  if(c==='}'){
   const node=stack.pop();assert.ok(node,'unexpected close');
   if(node.children===0&&node.selector){const body=src.slice(node.open+1,i).replace(/\\/\\*[\\s\\S]*?\\*\\//g,'').replace(/\\s+/g,'').trim();if(body)rules.push({selector:node.selector,scope:node.scope,body});}
   if(stack.length)stack.at(-1).children++;start=i+1;continue;
  }
  if(c===';'&&stack.length===0)start=i+1;
 }
 assert.equal(stack.length,0,'unterminated CSS');return rules;
}
test('night, protection and install CSS retain all distinct leaf declarations without identical shadow copies',()=>{
 for(const name of sources){
  const content=readFileSync(new URL('../src/'+name,import.meta.url),'utf8');
  const rules=leafRules(content);assert.ok(rules.length>25,name+' was unexpectedly emptied');
  const ids=rules.map(x=>x.scope+'|'+x.selector+'{'+x.body+'}');
  assert.equal(new Set(ids).size,ids.length,'identical repeated selector/property in '+name);
 }
});
test('critical night panel, protection sheet and install popup selectors still exist',()=>{
 const expectations=[
  ['night-visibility-panel.css','#night-visibility-float[data-collapsed="true"]'],
  ['protection-zone-map.css','#app .pza-road-sheet[hidden]'],
  ['browser-install-menu.css','html[data-theme=dark] dialog#dj-install-menu .dj-install-info']
 ];
 for(const [file,selector] of expectations){
  const rules=leafRules(readFileSync(new URL('../src/'+file,import.meta.url),'utf8'));
  assert.ok(rules.some(x=>x.selector===selector),file+' lost required selector');
 }
});
