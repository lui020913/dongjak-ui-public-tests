/** Select the lower observed-risk walking alternative only under the
 * same coverage/detour policy as ordinary walking navigation. */
export function chooseTransitWalk(pair,assessment,{preferPri=true,valid=()=>true}={}){
 const candidates=Object.fromEntries(['standard','gentle'].filter(k=>pair?.[k]&&valid(pair[k])).map(k=>[k,pair[k]]));
 const base=candidates.standard?'standard':candidates.gentle?'gentle':null;
 if(!base)return null;
 const recommended=assessment?.recommendation;
 const accepted=preferPri&&assessment?.reason==='observed-comparison'&&candidates.standard&&candidates.gentle&&['standard','gentle'].includes(recommended);
 const mode=accepted?recommended:base;
 return {...candidates[mode],transitPri:assessment?.[mode]||null,transitPriChoice:accepted?'observed-comparison':'ordinary',transitWalkMode:mode};
}
