/** Verified same-platform identity, never inferred from similar names or coordinates. */
export function sameBusTransfer(a,b){
 const id=String(a?.destination?.arsId||'').trim();
 return a?.kind==='bus'&&b?.kind==='bus'&&/^\d{5}$/.test(id)&&id===String(b?.origin?.arsId||'').trim();
}
export function transferLabel(same){return same?'제자리 환승':'환승';}
export function transferSteps(legs){
 return legs.slice(1).map((leg,i)=>({step:2*(i+1),sameStop:sameBusTransfer(legs[i],leg)}));
}
// Only fresh and sufficiently accurate device positions may move the camera.
// Lower quality data is reported as uncertain; do not move to an invented location.
export function transitFollowFix(position,now=Date.now()){
 const {longitude,latitude,accuracy}=position?.coords||{},timestamp=Number(position?.timestamp);
 if(![longitude,latitude,accuracy,timestamp].every(Number.isFinite)||Math.abs(longitude)>180||Math.abs(latitude)>90||accuracy<0||accuracy>70||timestamp<now-15000||timestamp>now+5000)return null;
 return {coords:[longitude,latitude],accuracy,timestamp};
}
