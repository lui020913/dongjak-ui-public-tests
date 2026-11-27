/** GPS proximity estimates geographic arrival, not actual boarding or alighting. */
export function transitProximity(position,target,previousCount=0,radius=100){
 const p=position?.coords,lat=p?.latitude,lng=p?.longitude,accuracy=p?.accuracy;
 if(!p||!target||!Number.isFinite(lat)||!Number.isFinite(lng)||!Number.isFinite(accuracy)||accuracy<0||accuracy>35||!Number.isFinite(target.lat)||!Number.isFinite(target.lng))return {state:'uncertain',count:0,meters:null};
 const r=Math.PI/180;
 const a=Math.sin((target.lat-lat)*r/2)**2+Math.cos(lat*r)*Math.cos(target.lat*r)*Math.sin((target.lng-lng)*r/2)**2;
 const meters=2*6371000*Math.asin(Math.sqrt(Math.min(1,Math.max(0,a))));
 const count=meters+accuracy<=radius?Math.min(2,previousCount+1):0;
 return {state:count>=2?'near':'tracking',count,meters:Math.round(meters)};
}

// Foreground GPS-only stage progression: two distinct fresh accurate fixes,
// one transition per fix. The final destination row is a completion marker,
// not another duplicate target that requires the user to wait again.
export function advanceTransitGps({position,targets,step,rows,count=0,lastTimestamp=null,now=Date.now()}){
 const timestamp=Number(position?.timestamp);
 if(!Number.isFinite(timestamp)||now-timestamp>15000||timestamp-now>5000||lastTimestamp!==null&&timestamp<=lastTimestamp)return {ignored:true};
 const final=step>=rows-2;
 const result=transitProximity(position,targets?.[step],count,final?45:70);
 if(result.state!=='near')return {...result,step,timestamp,arrived:false};
 return {...result,count:0,step:final?rows-1:step+1,timestamp,arrived:final};
}
