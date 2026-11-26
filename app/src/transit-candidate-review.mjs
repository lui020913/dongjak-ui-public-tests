/** Weight PRI only by actually observed walking distance; never count vehicle legs. */
export function summarizeTransitWalks(walks){
 if(!Array.isArray(walks)||!walks.length||walks.some(w=>!Number.isFinite(w?.kilometers)||w.kilometers<0||!Number.isFinite(w.seconds)||w.seconds<0))return null;
 let total=0,covered=0,riskSum=0,seconds=0,allObserved=true;
 for(const walk of walks){
  const meters=walk.kilometers*1000;seconds+=walk.seconds;
  if(meters===0)continue;
  total+=meters;const p=walk.transitPri;
  if(!p||!Number.isFinite(p.risk)||p.risk<0||p.risk>100||!Number.isFinite(p.coverage)||p.coverage<0||p.coverage>1){allObserved=false;continue;}
  if(p.coverage<.65)allObserved=false;
  const observed=meters*p.coverage;covered+=observed;riskSum+=observed*p.risk;
 }
 return {walkM:Math.round(total),walkMinutes:Math.ceil(seconds/60),coverage:total?covered/total:0,risk:covered>=20?riskSum/covered:null,comparable:allObserved&&total>0&&covered>=20&&covered/total>=.65};
}
export function recommendReviewedTransit(entries){
 const valid=entries.filter(x=>x.summary&&x.summary.comparable&&Number.isFinite(x.summary.risk));
 if(valid.length<2)return null;
 const ordered=[...valid].sort((a,b)=>a.summary.risk-b.summary.risk);
 const best=ordered[0],others=ordered.slice(1);
 // Require all reviewed competitors to have comparable observation and
 // sufficiently different risk; don't claim superiority over unassessed routes.
 if(valid.length!==entries.length||others.some(x=>Math.abs(x.summary.coverage-best.summary.coverage)>.12||x.summary.risk-best.summary.risk<5||best.summary.walkM>x.summary.walkM*1.25))return null;
 return best.plan;
}
export function transitReviewPairs(plan,from,to){
 const legs=plan.legs||[plan];
 if(!legs.length||legs.length>3||legs.some(l=>!l.origin||!l.destination))return [];
 return [[from,legs[0].origin],...legs.slice(1).map((l,i)=>[legs[i].destination,l.origin]),[legs.at(-1).destination,to]];
}

/** Process every candidate progressively; keep at most two route evaluations in flight. */
export async function reviewAllTransitCandidates(plans,{signal,concurrency=2,review,onResult}={}){
 let cursor=0;
 async function worker(){
  while(!signal?.aborted&&cursor<plans.length){
   const plan=plans[cursor++];let summary=null;
   try{summary=await review(plan);}catch{}
   if(!signal?.aborted)onResult(plan,summary);
  }
 }
 await Promise.all(Array.from({length:Math.min(plans.length,Math.max(1,Math.min(2,concurrency)))},worker));
}
export function formatTransitReview(result,done=false){
 if(!done)return '도보 조회 중';
 if(!result)return '도보 연결 확인 불가';
 const distance=result.walkM>=1000?(result.walkM/1000).toFixed(2).replace(/0$/,'').replace(/\.$/,'')+'km':result.walkM+'m';
 return '도보 '+distance+' · '+(result.comparable?'PRI '+result.risk.toFixed(1)+'점 (관측 '+Math.round(result.coverage*100)+'%)':'안전 미평가');
}
