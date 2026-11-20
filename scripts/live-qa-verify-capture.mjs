import {existsSync,readdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
export function verifyCapture(root,expected,seal=false){
 const dirs=readdirSync(root,{withFileTypes:true}).filter(d=>d.isDirectory()&&existsSync(join(root,d.name,'result.json')));
 if(dirs.length!==1)throw Error('Expected exactly one lane capture');
 const dir=join(root,dirs[0].name),r=read(join(dir,'result.json')),report=read(join(dir,'audit-report.json'));
 if(r.code!==0||report.run?.code!==0||r.target!==expected.target||report.run.target!==expected.target||report.scenes?.length!==1||report.scenes[0].status!=='passed'||!report.scenes[0].title?.startsWith(String(expected.lane).padStart(2,'0')+' '))throw Error('Capture does not match complete candidate lane');
 const p=join(dir,'capture-identity.json');
 if(seal)writeFileSync(p,JSON.stringify(expected,null,2));
 else {const actual=read(p);if(Object.keys(expected).some(k=>actual[k]!==expected[k]))throw Error('Capture provenance mismatch');}
 return dir;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const expected={lane:Number(process.env.QA_LANE),target:new URL(process.env.DONGJAK_TARGET_URL).href,source:process.env.SOURCE_SHA,publicSha:process.env.PUBLIC_SHA,css:process.env.CSS_SHA,version:process.env.APP_VERSION,run:process.env.BUILD_RUN};
 if(!Number.isInteger(expected.lane)||expected.lane<1||expected.lane>6||!/^https:\/\/[a-z0-9-]+\.dongjak-walk-safety-preview\.pages\.dev\/$/.test(expected.target)||!/^\d+$/.test(expected.run||'')||!/^\d+\.\d+\.\d+$/.test(expected.version||'')||!(/^[a-f0-9]{40}$/.test(expected.source||'')&&expected.source===expected.publicSha)||!(/^[a-f0-9]{64}$/.test(expected.css||'')))throw Error('Invalid capture identity');
 verifyCapture(resolve(process.argv[2]||'qa-artifacts'),expected,process.argv.includes('--seal'));
 console.log('Verified exact capture lane '+expected.lane+' for build '+expected.run);
}
