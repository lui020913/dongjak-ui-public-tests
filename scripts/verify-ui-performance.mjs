/** Conservative release-lab guard, not a physical-device FPS guarantee.
 * A completed benchmark is not evidence of improvement by itself.
 * Refuse promotion on material tail/median or long-frame-share regression,
 * and require an improvement signal. Do not retry to obtain a favorable draw.
 */
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
export function assessPerformance(report){
 const b=report?.summary?.baseline,c=report?.summary?.candidate;
 const failures=[];
 if(!b||!c||!Number.isInteger(report.rounds)||report.rounds<3)return {pass:false,reasons:['Insufficient paired benchmark rounds']};
 const metrics=v=>[v.frameIntervalMs?.p50,v.frameIntervalMs?.p95,v.shareOver50msPct,v.clickDispatchDelayMs?.p50];
 const bv=metrics(b),cv=metrics(c);
 if(![...bv,...cv].every(x=>Number.isFinite(x)&&x>=0)||!Number.isInteger(b.frameIntervalMs?.samples)||!Number.isInteger(c.frameIntervalMs?.samples)||Math.min(b.frameIntervalMs.samples,c.frameIntervalMs.samples)<100||bv[0]<=0||bv[1]<=0||bv[2]>100||cv[2]>100)return {pass:false,reasons:['Insufficient or invalid performance evidence']};
 const [median,tail,share,click]=bv,[cm,ct,cs,cc]=cv;
 // Explicit tolerances for noisy software-rendered CI; gross stalls must
 // not be offset by a faster median. These are release policy margins,
 // not a statistical confidence interval or an absolute device target.
 if(cm>median*1.10+1)failures.push('Median frame interval regressed materially');
 if(ct>tail*1.20+50)failures.push('P95 frame interval regressed materially');
 if(cs>share+3)failures.push('Long-frame share increased by over 3 percentage points');
 if(cc>click*1.15+5)failures.push('Median click dispatch delay regressed materially');
 if(!(cm<=median*.90||ct<=tail*.90||cs<=share-5))failures.push('No material frame improvement signal');
 return {pass:failures.length===0,reasons:failures};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const result=assessPerformance(JSON.parse(readFileSync(process.argv[2],'utf8')));
 console.log(JSON.stringify(result,null,2));
 if(!result.pass)process.exitCode=1;
}
