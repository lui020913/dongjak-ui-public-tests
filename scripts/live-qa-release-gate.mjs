import {existsSync,readdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
export function evaluateDesign(report,lane){
 const scene=report.scenes?.[0];
 if(report.run?.code!==0||report.scenes?.length!==1||scene?.status!=='passed')return {status:'functional-failure',findings:[]};
 if(!Number.isInteger(lane)||lane<1||lane>6||!scene.title?.startsWith(String(lane).padStart(2,'0')+' '))return {status:'evidence-unavailable',findings:[]};
 if((scene.metrics?.samples||0)<10||scene.frames<3||!Array.isArray(scene.checkpoints)||scene.checkpoints.length<2)return {status:'evidence-unavailable',findings:[]};
 const blocked=(scene.flags||[]).filter(f=>f.kind==='surface-horizontal-clipping'&&f.selector==='#route-map-card'&&f.count>=3&&f.end-f.t>=250&&f.px>4).map(f=>({kind:'measured-clipping',selector:f.selector,px:f.px,t:f.t,end:f.end,x:f.x,width:f.width,viewportWidth:f.viewportWidth}));
 if(blocked.length)return {status:'defect',findings:blocked};
 // A confirmed provider 429 is not a product defect. Preserve the complete
 // capture and require human visual review; do not present this as AI approval.
 if(scene.designReview?.status==='unavailable'&&/^Provider HTTP 429 \((?:daily-quota|minute-request-quota|minute-token-quota|quota-type-unknown)\)$/.test(scene.designReview.reason||''))
  return {status:'quota-skipped',findings:[],manualReviewRequired:true,reason:scene.designReview.reason};
 if(scene.designReview?.status!=='reviewed'||!Array.isArray(scene.vision?.findings))return {status:'vision-unavailable',findings:[]};
 const critical=scene.vision.findings.filter(f=>f.severity==='critical'&&new Set(f.evidence).size>=2).map(f=>({kind:'vision-critical-candidate',summary:f.summary,evidence:f.evidence}));
 return {status:critical.length?'defect':'pass',findings:critical,review:scene.vision.findings,diagnostics:scene.flags||[]};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const root=resolve(process.argv[2]||'qa-artifacts'),lane=Number(process.env.QA_LANE);
 const dirs=existsSync(root)?readdirSync(root,{withFileTypes:true}).filter(d=>d.isDirectory()&&existsSync(join(root,d.name,'audit-report.json'))):[];
 let result={status:'evidence-unavailable',findings:[]};
 if(dirs.length===1){
  const dir=join(root,dirs[0].name),report=JSON.parse(readFileSync(join(dir,'audit-report.json'),'utf8'));
  result=evaluateDesign(report,lane);
  writeFileSync(join(dir,'design-gate.json'),JSON.stringify({lane,...result},null,2));
 }
 const msg=JSON.stringify({lane,status:result.status,findings:result.findings});
 if(result.status==='defect'){console.log('QA_DESIGN_FAILURE '+msg);process.exitCode=1;}
 else if(result.status==='functional-failure'){console.log('QA_JOURNEY_FAILURE '+msg);process.exitCode=1;}
 else if(result.status==='quota-skipped'){console.log('::warning::QA_DESIGN_QUOTA_SKIPPED '+msg+' — complete capture retained; human review required');}
 else if(result.status!=='pass'){console.log('QA_DESIGN_UNAVAILABLE '+msg);process.exitCode=1;}
 else console.log('QA_DESIGN_PASS '+msg);
}
