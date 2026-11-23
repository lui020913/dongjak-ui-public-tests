/** Read-only public GIS asset inventory, NOT a deletion list. */
import {readdirSync,readFileSync,statSync} from 'node:fs';
import {dirname,join,relative,resolve,sep} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const repository=resolve(dirname(fileURLToPath(import.meta.url)),'..');
function walk(dir,accept){
 return readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
  const filename=join(dir,entry.name);
  if(entry.isDirectory())return walk(filename,accept);
  return entry.isFile()&&accept(filename)?[filename]:[];
 });
}
export function inventoryPublicData(root=repository){
 const app=join(root,'app'),folder=join(app,'public','data');
 const assetFiles=walk(folder,()=>true).sort();
 const srcFiles=[join(app,'index.html'),...walk(join(app,'src'),name=>/\.(?:js|mjs|css|html)$/.test(name))];
 const sourceFiles=srcFiles.map(path=>({path:relative(app,path),content:readFileSync(path,'utf8')}));
 // Match only literal folder paths, not the directory prefix within a full URL.
 const dynamicFolders=new Set();
 for(const file of sourceFiles){
  for(const m of file.content.matchAll(/['"](\/data\/(?:[A-Za-z0-9_.-]+\/)+)['"]/g))
   dynamicFolders.add(m[1]);
 }
 let manifest=[];
 try{
  const m=JSON.parse(readFileSync(join(folder,'pri','manifest.json'),'utf8'));
  manifest=[m.bundle,...m.patches];
 }catch{ /* A separate hard-gated test validates the PRI manifest. */ }
 const named=new Set(manifest.filter(v=>typeof v==='string'));
 const assets=assetFiles.map(path=>{
  const uri='/data/'+relative(folder,path).split(sep).join('/');
  const basename=path.slice(path.lastIndexOf(sep)+1);
  const mentionedBy=sourceFiles.filter(file=>file.content.includes(basename)).map(file=>file.path);
  const manifestReferenced=named.has(uri);
  const folderDynamic=[...dynamicFolders].some(prefix=>uri.startsWith(prefix));
  const classification=manifestReferenced||mentionedBy.length>0?'source-reference':
   folderDynamic?'dynamic-folder-review':'research-or-external-review';
  return {uri,bytes:statSync(path).size,classification,manifestReferenced,mentionedBy,folderDynamic};
 });
 const summary={totalFiles:assets.length,totalBytes:assets.reduce((n,a)=>n+a.bytes,0),
  runtimeNamed:assets.filter(a=>a.classification==='source-reference').length,
  dynamicReview:assets.filter(a=>a.classification==='dynamic-folder-review').length,
  researchReview:assets.filter(a=>a.classification==='research-or-external-review').length};
 return {summary,dynamicFolders:[...dynamicFolders].sort(),assets};
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 const report=inventoryPublicData();
 console.log(JSON.stringify({purpose:'read-only source token inventory',summary:report.summary,
  dynamicFolders:report.dynamicFolders,
  largestReviewOnly:report.assets.filter(a=>a.classification!=='source-reference')
   .sort((a,b)=>b.bytes-a.bytes).slice(0,35)
   .map(({uri,bytes,classification})=>({uri,bytes,classification})),
  warning:'Review candidates are not safe-to-delete evidence. External links, research and dynamic fetches may still use them.'},null,2));
}
