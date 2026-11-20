import {spawn} from 'node:child_process';
import {existsSync,readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {resolve,join,relative} from 'node:path';
const root=resolve(process.argv[2]||'qa-artifacts'), W=64,H=112,N=W*H;
const diff=(a,b)=>{let sum=0;for(let i=0;i<N;i++)sum+=Math.abs(a[i]-b[i]);return sum/N/255;};
const luma=a=>a.reduce((s,v)=>s+v,0)/N;
async function analyze(video){
 const proc=spawn('ffmpeg',['-hide_banner','-loglevel','error','-i',video,'-map','0:v:0','-vf','scale='+W+':'+H+':flags=area,format=gray','-fps_mode','passthrough','-f','rawvideo','pipe:1'],{stdio:['ignore','pipe','pipe']});
 let pending=Buffer.alloc(0),prev2=null,prev=null,index=0,changes=0,maxDelta=0,flags=[],errors='';
 proc.stderr.on('data',b=>{errors=(errors+b).slice(-2000);});
 const done=new Promise((ok,no)=>{proc.on('error',no);proc.on('close',code=>code===0?ok():no(Error(errors||'ffmpeg '+code)));});
 // Drain stdout incrementally. No interpolation; all decoded video frames, in order.
 for await(const chunk of proc.stdout){pending=Buffer.concat([pending,chunk]);while(pending.length>=N){
   const current=Buffer.from(pending.subarray(0,N));pending=pending.subarray(N);
   if(prev){const delta=diff(prev,current);maxDelta=Math.max(maxDelta,delta);if(delta>.02)changes++;
    if(prev2){const before=diff(prev2,prev),returnDelta=diff(prev2,current);
     // A-B-A transient: candidate flicker, not proof (e.g. a deliberate flash).
     if(before>.10&&delta>.10&&returnDelta<.025&&flags.length<200)
      flags.push({kind:'pixel-return-transient',frame:index-1,before:Math.round(before*1000)/1000,after:Math.round(delta*1000)/1000,returnDelta:Math.round(returnDelta*1000)/1000});
     const a=luma(prev2),b=luma(prev),c=luma(current);
     if(Math.abs(b-a)>24&&Math.abs(b-c)>24&&Math.abs(a-c)<8&&flags.length<200)
      flags.push({kind:'luminance-transient',frame:index-1,delta:Math.round(Math.abs(a-b))});
    }
   }
   prev2=prev;prev=current;index++;
 }}
 await done;
 return {decodedFrames:index,changedFrames:changes,maxNormalizedPixelDelta:Math.round(maxDelta*1000)/1000,flags};
}
const runs=existsSync(join(root,'result.json'))?[root]:readdirSync(root,{withFileTypes:true}).filter(x=>x.isDirectory()).map(x=>join(root,x.name));
let missing=0,processed=0;
for(const run of runs){const reportPath=join(run,'audit-report.json');if(!existsSync(reportPath))continue;
 const report=JSON.parse(readFileSync(reportPath,'utf8'));
 for(const s of report.scenes){if(!s.video){s.pixel={status:'unavailable-no-recording'};missing++;continue;}
  const file=resolve(run,s.video);if(relative(run,file).startsWith('..')||!existsSync(file)){s.pixel={status:'unavailable-recording'};missing++;continue;}
  try{s.pixel={status:'analyzed',...await analyze(file)};processed++}catch(e){s.pixel={status:'error',message:String(e.message).slice(0,500)};missing++;}
 }
 writeFileSync(reportPath,JSON.stringify(report,null,2));
}
console.log(JSON.stringify({processed,missing,classification:'diagnostic-only: capture frame rate and UI intent are not inferred'}));
if(processed===0)process.exitCode=1;
