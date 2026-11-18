// Conservative scope proof. Never infer device scope from a filename or a prompt.
export const VIEWPORTS=Object.freeze({
 full:['mobile375','mobile390','tablet768','tablet820','tablet1024','tablet1180','pc1280','pc1440','pc1920'],
 mobile:['mobile375','mobile390'],tablet:['tablet768','tablet820','tablet1024','tablet1180'],pc:['pc1280','pc1440','pc1920']
});
const guards={
 mobile:['(max-width:699px)'],
 tablet:['(min-width:700px)and(max-width:1079px)','(min-width:1080px)and(max-width:1366px)and(pointer:coarse)'],
 pc:['(min-width:1080px)and(pointer:fine)','(min-width:1367px)']
};
function scopeOf(header){
 if(!/^@media\s+/i.test(header))return null;
 const clauses=header.replace(/^@media\s+/i,'').toLowerCase().replace(/\s+/g,'').split(',');
 const scopes=clauses.map(clause=>{
  clause=clause.replace(/and\(orientation:(?:portrait|landscape)\)$/,'');
  return Object.keys(guards).find(k=>guards[k].includes(clause));
 });
 return scopes.length&&scopes[0]&&scopes.every(x=>x===scopes[0])?scopes[0]:null;
}
// Scan only complete root rules and @layer containers. Unknown constructs remain shared.
// Strings, escapes, comments, parentheses and bracketed selectors cannot open a rule.
export function partitionCss(css){
 if(typeof css!=='string'||css.length>1000000||css.includes('\0'))throw Error('unsupported CSS');
 const pieces={full:[],mobile:[],tablet:[],pc:[]};
 let pos=0;
 function trivia(){
  const start=pos;
  while(pos<css.length){
   if(/\s/.test(css[pos])){pos++;continue;}
   if(css.startsWith('/*',pos)){const end=css.indexOf('*/',pos+2);if(end<0)throw Error('comment');pos=end+2;continue;}
   break;
  }
  return css.slice(start,pos);
 }
 function token(){
  let quote='',round=0,square=0;
  for(;pos<css.length;pos++){
   const c=css[pos];
   if(c==='\\'){if(++pos>=css.length)throw Error('escape');continue;}
   if(quote){if(c===quote)quote='';continue;}
   if(c==='"'||c==="'"){quote=c;continue;}
   if(css.startsWith('/*',pos)){const end=css.indexOf('*/',pos+2);if(end<0)throw Error('comment');pos=end+1;continue;}
   if(c==='('){round++;continue;}if(c===')'){if(--round<0)throw Error('paren');continue;}
   if(c==='['){square++;continue;}if(c===']'){if(--square<0)throw Error('bracket');continue;}
   if(!round&&!square&&'{};'.includes(c))return c;
  }
  if(quote||round||square)throw Error('incomplete CSS');
  return null;
 }
 function block(){
  let depth=1;
  while(depth){
   const c=token();if(c===null)throw Error('unclosed block');pos++;
   if(c==='{')depth++;else if(c==='}')depth--;
  }
 }
 function container(nested=false){
  while(pos<css.length){
   const prefix=trivia();
   // Preserve comments (including license and build directives); ignore only inter-rule whitespace.
   if(prefix.trim())pieces.full.push(prefix.trim());
   if(pos===css.length)break;
   if(css[pos]==='}'){if(!nested)throw Error('unexpected brace');pos++;return;}
   const start=pos,delim=token(),header=css.slice(start,pos).trim();
   if(delim===null||delim==='}'||!header)throw Error('malformed rule');
   pos++;
   if(delim===';'){pieces.full.push(css.slice(start,pos).trim());continue;}
   const scope=scopeOf(header);
   if(scope){block();pieces[scope].push(css.slice(start,pos).trim());continue;}
   if(/^@layer(?:\s+[\w.-]+)?$/i.test(header)){
    pieces.full.push(header+'{');container(true);pieces.full.push('}');continue;
   }
   block();pieces.full.push(css.slice(start,pos).trim());
  }
  if(nested)throw Error('unclosed layer');
 }
 container();
 return pieces;
}
export function changedCssScope(before,after){
 // Keep the complete ordered shared CSS and shared layer boundaries unchanged.
 // A scoped rule's position can affect CSS priority, so a change in the order
 // of its wrapper relative to shared rules or other devices is also full.
 try{
  const a=partitionCss(before),b=partitionCss(after);
  if(JSON.stringify(a.full)!==JSON.stringify(b.full))return 'full';
  const changed=['mobile','tablet','pc'].filter(k=>JSON.stringify(a[k])!==JSON.stringify(b[k]));
  // Require stable top-level rule positions for scope-only edits by checking
  // the shared skeleton, including media headers, via a strict masking pass.
  if(changed.length!==1)return 'full';
  const k=changed[0];
  if(a[k].length!==b[k].length)return 'full';
  // Media headers and the position of every unmodified byte outside the
  // changed blocks must remain stable. Reject repeated/ambiguous matches.
  const mask=(css,blocks)=>{
   let out=css,seek=0;
   for(const block of blocks){
    const i=out.indexOf(block,seek);
    if(i<0||out.indexOf(block,i+block.length)>=0)throw Error('ambiguous block');
    const header=block.slice(0,block.indexOf('{')).trim();
    const replacement=header+'{__DEVICE_ONLY__}';
    out=out.slice(0,i)+replacement+out.slice(i+block.length);
    seek=i+replacement.length;
   }
   return out;
  };
  return mask(before,a[k])===mask(after,b[k])?k:'full';
 }catch{return 'full';}
}
export async function selectViewportScope(compare,readPair){
 if(!compare||compare.status!=='ahead'||compare.base_commit?.sha!==compare.merge_base_commit?.sha||
    !Array.isArray(compare.files)||!compare.files.length||compare.files.length>=300)return 'full';
 const scopes=new Set();
 for(const file of compare.files){
  if(file.status!=='modified'||!/^src\/[a-zA-Z0-9_.\/-]+\.css$/.test(file.filename)||file.filename.includes('..'))return 'full';
  const pair=await readPair(file.filename);
  const scope=changedCssScope(pair?.[0],pair?.[1]);
  if(scope==='full')return 'full';
  scopes.add(scope);
  if(scopes.size>1)return 'full';
 }
 return [...scopes][0]||'full';
}
export function isFullAudit(jobs){
 const names=new Set((jobs||[]).filter(j=>j.conclusion==='success').map(j=>j.name));
 return VIEWPORTS.full.every(v=>names.has('ui ('+v+')'));
}
