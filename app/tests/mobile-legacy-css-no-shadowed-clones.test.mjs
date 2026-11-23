import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=readFileSync(new URL('../src/mobile-ui-baseline.css',import.meta.url),'utf8');
function leafRules(src){
 const entries=[],stack=[];let start=0,quoted='',escaped=false,comment=false;
 for(let i=0;i<src.length;i++){
  const c=src[i],n=src[i+1];
  if(comment){if(c==='*'&&n==='/'){comment=false;i++;}continue;}
  if(quoted){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c===quoted)quoted='';continue;}
  if(c==='/'&&n==='*'){comment=true;i++;continue;}
  if(c==='\''||c==='"'){quoted=c;continue;}
  if(c==='{'){
   const pre=src.slice(start,i).replace(/\/\*[\s\S]*?\*\//g,'').trim().replace(/\s+/g,' ');
   stack.push({pre,open:i,children:0,scope:stack.map(e=>e.pre).filter(v=>v.startsWith('@')).join('|')});
   start=i+1;continue;
  }
  if(c==='}'){
   const node=stack.pop();assert.ok(node,'unexpected CSS closing brace');
   if(node.children===0){
    const body=src.slice(node.open+1,i).replace(/\/\*[\s\S]*?\*\//g,'').replace(/\s+/g,'').trim();
    if(node.pre&&body)entries.push({...node,body});
   }
   if(stack.length)stack[stack.length-1].children++;
   start=i+1;continue;
  }
  if(c===';'&&stack.length===0)start=i+1;
 }
 assert.equal(stack.length,0,'unclosed CSS rule');
 return entries;
}
test('old mobile sections keep all 26 anchors but never shadow an identical rule in the same scope',()=>{
 assert.equal((css.match(/\/\* BEGIN LEGACY /g)||[]).length,26);
 assert.equal((css.match(/\/\* END LEGACY /g)||[]).length,26);
 const seen=new Set();
 for(const rule of leafRules(css)){
  if(!/^([#.\[:]|html\b|body\b)/.test(rule.pre))continue;
  const key=rule.scope+'|'+rule.pre+'{'+rule.body+'}';
  assert.ok(!seen.has(key),'byte-identical earlier CSS rule shadows later declaration: '+rule.pre);
  seen.add(key);
 }
});
