import {readFileSync,readdirSync} from 'node:fs';
import {join,relative} from 'node:path';
import postcss from 'postcss';
const root=new URL('../src/',import.meta.url);
const files=(dir)=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(join(dir,e.name)):e.name.endsWith('.css')?[join(dir,e.name)]:[]);
const {fileURLToPath}=await import('node:url');
const base=fileURLToPath(root);
const targets=[];
for(const path of files(base)){
 const css=readFileSync(path,'utf8'),ast=postcss.parse(css,{from:path}),hits=[];
 ast.walkRules(rule=>{
  if(!rule.nodes?.length||rule.nodes.some(n=>n.type!=='decl'&&n.type!=='comment'))return;
  // No keyframes or nested rules: identical declarations under the same
  // ordinary style rule can be dropped only when the later declaration wins.
  for(let p=rule.parent;p;p=p.parent)if(p.type==='rule'||(p.type==='atrule'&&!['media','supports','layer','container','scope'].includes(p.name)))return;
  const seen=new Set();
  for(const d of [...rule.nodes].reverse()){
   if(d.type!=='decl'||!d.source?.start||!d.source?.end)continue;
   const key=JSON.stringify([d.prop,d.value,Boolean(d.important)]);
   if(seen.has(key))hits.push({line:d.source.start.line,column:d.source.start.column,start:d.source.start.offset,end:d.source.end.offset,selector:rule.selector,property:d.prop,value:d.value,important:Boolean(d.important)});
   else seen.add(key);
  }
 });
 if(hits.length)targets.push({file:relative(base,path),count:hits.length,hits});
}
console.log(JSON.stringify({files:files(base).length,duplicateDeclarations:targets.reduce((n,x)=>n+x.count,0),targets},null,2));
