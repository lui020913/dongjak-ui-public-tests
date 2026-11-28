export function retireDarkCss(s){
 function scan(s,start,cb){let q="",esc=false,comment=false,par=0,br=0;for(let i=start;i<s.length;i++){let c=s[i],n=s[i+1];if(comment){if(c==="*"&&n==="/"){comment=false;i++}continue}if(q){if(esc)esc=false;else if(c==="\\")esc=true;else if(c===q)q="";continue}if(c==="/"&&n==="*"){comment=true;i++;continue}if(c==="'"||c==='"'){q=c;continue}if(c==="\\"){i++;continue}if(c==="(")par++;if(c===")")par--;if(c==="[")br++;if(c==="]")br--;if(!par&&!br&&cb(c,i))return i}return -1}
 function branches(s){let parts=[],i=0;while(i<s.length){let j=scan(s,i,c=>c===",");if(j<0){parts.push(s.slice(i));break}parts.push(s.slice(i,j));i=j+1}return parts}
 const darkAttr=/^\[(?:data-theme\s*=\s*(?:"dark"|'dark'|dark)|data-sangdo-night\s*=\s*(?:"on"|'on'|on))\]/i;
 function requiredDark(s){let depth=0,q="",esc=false,comment=false;for(let i=0;i<s.length;i++){let c=s[i],n=s[i+1];if(comment){if(c==="*"&&n==="/"){comment=false;i++}continue}if(q){if(esc)esc=false;else if(c==="\\")esc=true;else if(c===q)q="";continue}if(c==="/"&&n==="*"){comment=true;i++;continue}if(c==="'"||c==='"'){q=c;continue}if(c==="\\"){i++;continue}if(c==="(")depth++;if(c===")")depth--;if(c==="["&&depth===0&&darkAttr.test(s.slice(i)))return true}return false}
 let removed=0,trimmed=0;
 function walk(t){let out="",pos=0;while(pos<t.length){let i=scan(t,pos,c=>c==="{"||c===";"||c==="}");if(i<0){out+=t.slice(pos);break}if(t[i]!=="{"){out+=t.slice(pos,i+1);pos=i+1;continue}let d=1;let e=scan(t,i+1,c=>{if(c==="{")d++;if(c==="}")d--;return d===0});if(e<0)throw Error("unbalanced CSS");const pre=t.slice(pos,i);const lead=pre.match(/^(?:\s|\/\*[\s\S]*?\*\/)*/)[0];const sel=pre.slice(lead.length).trim();const inner=t.slice(i+1,e);if(sel.startsWith("@")){if(/^@(?:media|supports|layer|container|scope|document)\b/.test(sel)){out+=pre+"{"+walk(inner)+"}"}else{out+=pre+"{"+inner+"}"}}else{let bs=branches(pre.slice(lead.length));const keep=bs.filter(b=>!requiredDark(b));if(keep.length===0&&bs.length){removed++;out+=lead}else if(keep.length<bs.length){trimmed+=bs.length-keep.length;out+=lead+keep.join(",")+"{"+inner+"}"}else out+=pre+"{"+inner+"}"}pos=e+1}return out}
 return {content:walk(s),removed,trimmed};
}

/* Read-only, deterministic migration inventory; never writes production source. */
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
 if(!['--prepare','--check'].includes(process.argv[2]))throw Error('Use --check or --prepare');
 const prepare=process.argv[2]==='--prepare';
 const paths=execFileSync('git',['ls-files','-z','--','app/src','app/platforms'],{encoding:'utf8'}).split('\0').filter(p=>p.endsWith('.css'));
 let changed=0,rules=0,selectors=0;
 for(const path of paths){
  const original=readFileSync(path,'utf8'),next=retireDarkCss(original);
  if(next.content===original)continue;
  const check=retireDarkCss(next.content);
  if(check.content!==next.content)throw Error('Not idempotent: '+path);
  const data=Buffer.from(next.content,'utf8').toString('base64');
  const total=Math.ceil(data.length/6000),sha=createHash('sha256').update(next.content).digest('hex');
  console.log('CSS_RETIRE_FILE '+JSON.stringify({path,sha,parts:total,rules:next.removed,selectors:next.trimmed,bytes:Buffer.byteLength(next.content)}));
  if(prepare)for(let i=0;i<total;i++)console.log('CSS_RETIRE_PART '+JSON.stringify({path,i,data:data.slice(i*6000,(i+1)*6000)}));
  changed++;rules+=next.removed;selectors+=next.trimmed;
 }
 console.log('CSS_RETIRE_SUMMARY '+JSON.stringify({changed,rules,selectors,scanned:paths.length}));
 if(!prepare&&changed)process.exitCode=1;
}
