import {basename} from 'node:path';
import {readdirSync,readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
const root='comparison';
const load=dir=>{
 const map=new Map();
 if(!existsSync(dir))return map;
 for(const file of readdirSync(dir).filter(x=>x.endsWith('.json'))){
  const r=JSON.parse(readFileSync(dir+'/'+file,'utf8'));
  if(!r.viewport || !Array.isArray(r.screens))continue;
  for(const s of r.screens)map.set([r.viewport.name,r.theme,s.tab].join(' / '),s);
 }
 return map;
};
const a=load(root+'/production'),b=load(root+'/candidate');
const findings=s=>{
 if(s?.status!=='captured')return ['capture missing'];
 const m=s.metrics||{},p=m.panel;
 return [...(m.documentWidth>m.viewportWidth+1?['horizontal overflow']:[]),...(!p?['panel not visible']:p.x< -1||p.x+p.width>m.viewportWidth+1?['panel outside viewport']:[])];
};
const esc=x=>String(x).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const keys=['mobile-375','mobile-390','mobile-430','tablet-768','tablet-1024','desktop-1280','desktop-1440','desktop-1920'].flatMap(v=>['light','dark'].flatMap(t=>['initial-map','route','participate','news','mine','map'].map(tab=>[v,t,tab].join(' / '))));
const verified=(side,s)=>s?.status==='captured'&&typeof s.file==='string'&&s.file===basename(s.file)&&s.file.endsWith('.png')&&existsSync(root+'/'+side+'/'+s.file);
const rows=keys.map(key=>({key,production:a.get(key)||null,candidate:b.get(key)||null,before:findings(a.get(key)),after:findings(b.get(key))}));
for(const r of rows)r.regressions=r.after.filter(x=>!r.before.includes(x));
const complete=rows.every(r=>verified('production',r.production)&&verified('candidate',r.candidate));
mkdirSync(root,{recursive:true});
writeFileSync(root+'/comparison.json',JSON.stringify({rows,complete},null,2));
const image=(side,s)=>s?.status==='captured'?'<img src="'+side+'/'+encodeURIComponent(s.file)+'">':'<p>Capture unavailable</p>';
writeFileSync(root+'/index.html','<!doctype html><meta charset="utf-8"><title>Production / Candidate comparison</title><style>body{font:14px system-ui;margin:24px}section{border-top:1px solid #aaa;padding:16px}main{display:grid;grid-template-columns:1fr 1fr;gap:16px}img{width:100%;max-height:800px;object-fit:contain}</style><h1>Production / Candidate comparison</h1><p>Geometry findings only; not an AI visual quality verdict.</p>'+rows.map(r=>'<section><h2>'+esc(r.key)+'</h2><p>'+esc('Before: '+r.before.join(', ')+' | After: '+r.after.join(', '))+'</p><main><div>Production'+image('production',r.production)+'</div><div>Candidate'+image('candidate',r.candidate)+'</div></main></section>').join(''));
console.log('Compared '+rows.length+' expected screen pairs; complete='+complete);
if(!complete)process.exitCode=1;
