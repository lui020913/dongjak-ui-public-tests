// Same visible Dongjak-gu district polygon; include exact boundary points.
export function pointInStationDistrict(x,y,ring){
 if(!Number.isFinite(x)||!Number.isFinite(y))return false;
 let yes=false;
 for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const a=ring[i],b=ring[j],dx=b[0]-a[0],dy=b[1]-a[1];
  if(Math.abs((x-a[0])*dy-(y-a[1])*dx)<1e-12&&x>=Math.min(a[0],b[0])-1e-10&&x<=Math.max(a[0],b[0])+1e-10&&y>=Math.min(a[1],b[1])-1e-10&&y<=Math.max(a[1],b[1])+1e-10)return true;
  if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])yes=!yes;
 }
 return yes;
}
