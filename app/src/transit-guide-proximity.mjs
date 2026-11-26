/** Foreground advisory only. GPS proximity never proves boarding or alighting. */
export function transitProximity(position,target,previousCount=0){
 const p=position?.coords,lat=Number(p?.latitude),lng=Number(p?.longitude),accuracy=Number(p?.accuracy);
 if(!p||!target||!Number.isFinite(lat)||!Number.isFinite(lng)||!Number.isFinite(accuracy)||accuracy<0||accuracy>35||!Number.isFinite(target.lat)||!Number.isFinite(target.lng))return {state:'uncertain',count:0,meters:null};
 const r=Math.PI/180;
 const a=Math.sin((target.lat-lat)*r/2)**2+Math.cos(lat*r)*Math.cos(target.lat*r)*Math.sin((target.lng-lng)*r/2)**2;
 const meters=2*6371000*Math.asin(Math.sqrt(Math.min(1,Math.max(0,a))));
 const count=meters+accuracy<=100?Math.min(2,previousCount+1):0;
 return {state:count>=2?'near':'tracking',count,meters:Math.round(meters)};
}
