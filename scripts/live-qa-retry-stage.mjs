import {existsSync,readdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const root=resolve(process.argv[2]||'qa-artifacts');
const cases=new Set(['phone onboarding copy is top aligned','phone weather single window and layer grid dark surfaces','phone nearby safety opens its own sheet','phone pilot safety symbols are native','transport cards, transfer tabs, right aligned arrivals','phone sheets keep headers inside and scrollable content','phone route comparison uses actual pedestrian graph','phone search returns a visible local suggestion','AI full-screen conversation and inline voice state','phone report composer has non-overlapping independent header','route title is a full header drag surface','primary tabs animate replacement and keep the pill dock','phone More functions live in collapsible My Info groups','theme confirmation fades in place','phone update history fades in place']);
if(!existsSync(root)){console.log('No journey evidence');process.exit(0);}
const candidates=readdirSync(root,{withFileTypes:true}).filter(d=>d.isDirectory()).map(d=>join(root,d.name)).filter(d=>existsSync(join(d,'failed-stage.json')));
if(candidates.length!==1){console.log('No unique failed stage; full journey evidence retained');process.exit(0);}
const dir=candidates[0],stage=JSON.parse(readFileSync(join(dir,'failed-stage.json'),'utf8'));
if(!cases.has(stage.retry))throw Error('Unrecognized regression case');
const env={...process.env};for(const k of ['QA_LANE','QA_SHARD_TOTAL','QA_RELAY_URL','QA_WRITER_KEY','QA_VIEWER_KEY','GEMINI_API_KEY'])delete env[k];
console.log('Fresh context diagnostic: '+stage.retry);
const result=spawnSync(process.execPath,['scripts/live-qa.mjs','--ci','--grep-case='+stage.retry],{env,stdio:'inherit'});
writeFileSync(join(dir,'independent-retry.json'),JSON.stringify({stage,exitCode:result.status??1,originalFailurePreserved:true},null,2));
process.exitCode=result.status??1;
