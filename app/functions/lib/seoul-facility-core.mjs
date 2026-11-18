/** Seoul public business-license datasets. Shared by Pages and the scheduled Worker. */
export const SOURCES=Object.freeze([
  {id:'pharmacy',service:'LOCALDATA_010106_DJ',label:'약국',category:'약국',priority:1},
  {id:'animal_pharmacy',service:'LOCALDATA_020302_DJ',label:'동물약국',category:'동물약국',priority:2},
  {id:'restaurant',service:'LOCALDATA_072404_DJ',label:'일반음식점',category:'음식점',priority:3},
  {id:'cafe',service:'LOCALDATA_072405_DJ',label:'휴게음식점',category:'카페·간식',priority:4},
]);
export const PAGE_SIZE=1000;
const RAD=Math.PI/180;
const ARCSEC=RAD/3600;
const BESSEL_A=6377397.155,BESSEL_F=1/299.1528128;
const WGS_A=6378137,WGS_F=1/298.257223563;
/** EPSG:5174 -> EPSG:4326 via inverse TM on Bessel and EPSG:5191 Molodensky-Badekas (coordinate-frame). */
export function korean1985ToWgs84(x,y){
 x=Number(x);y=Number(y);
 if(!Number.isFinite(x)||!Number.isFinite(y)||x<100000||x>400000||y<250000||y>650000)return null;
 const e2=BESSEL_F*(2-BESSEL_F),ep2=e2/(1-e2),ee=Math.sqrt(1-e2);
 const meridian=(lat)=>BESSEL_A*((1-e2/4-3*e2**2/64-5*e2**3/256)*lat-(3*e2/8+3*e2**2/32+45*e2**3/1024)*Math.sin(2*lat)+(15*e2**2/256+45*e2**3/1024)*Math.sin(4*lat)-(35*e2**3/3072)*Math.sin(6*lat));
 const m=(y-500000)+meridian(38*RAD);
 const mu=m/(BESSEL_A*(1-e2/4-3*e2**2/64-5*e2**3/256));
 const e1=(1-ee)/(1+ee);
 const phi=mu+(3*e1/2-27*e1**3/32)*Math.sin(2*mu)+(21*e1**2/16-55*e1**4/32)*Math.sin(4*mu)+(151*e1**3/96)*Math.sin(6*mu)+(1097*e1**4/512)*Math.sin(8*mu);
 const sin=Math.sin(phi),cos=Math.cos(phi),t=Math.tan(phi),T=t*t,C=ep2*cos*cos;
 const N=BESSEL_A/Math.sqrt(1-e2*sin*sin),R=BESSEL_A*(1-e2)/Math.pow(1-e2*sin*sin,1.5),D=(x-200000)/N;
 const lat=phi-(N*t/R)*(D*D/2-(5+3*T+10*C-4*C*C-9*ep2)*D**4/24+(61+90*T+298*C+45*T*T-252*ep2-3*C*C)*D**6/720);
 const lon=(127.002890277778*RAD)+(D-(1+2*T+C)*D**3/6+(5-2*C+28*T-3*C*C+8*ep2+24*T*T)*D**5/120)/cos;
 // Geographic Bessel latitude/longitude -> geocentric cartesian.
 const Ns=BESSEL_A/Math.sqrt(1-e2*Math.sin(lat)**2);
 const X=Ns*Math.cos(lat)*Math.cos(lon),Y=Ns*Math.cos(lat)*Math.sin(lon),Z=Ns*(1-e2)*Math.sin(lat);
 // Molodensky-Badekas with a fixed evaluation point and coordinate-frame rotations.
 const px=-3159521.31,py=4068151.32,pz=3748113.85;
 const dx=X-px,dy=Y-py,dz=Z-pz,s=1+6.342e-6;
 const rx=-1.162*ARCSEC,ry=2.347*ARCSEC,rz=1.592*ARCSEC;
 const wx=px-145.907+s*(dx+rz*dy-ry*dz);
 const wy=py+505.034+s*(-rz*dx+dy+rx*dz);
 const wz=pz+685.756+s*(ry*dx-rx*dy+dz);
 // Bowring geographic inverse on WGS 84 (height is not needed by the map).
 const f=WGS_F,eW=f*(2-f),b=WGS_A*(1-f),p=Math.hypot(wx,wy);
 const th=Math.atan2(wz*WGS_A,p*b);
 const latitude=Math.atan2(wz+(WGS_A**2-b**2)/b*Math.sin(th)**3,p-eW*WGS_A*Math.cos(th)**3);
 const longitude=Math.atan2(wy,wx);
 const out=[longitude/RAD,latitude/RAD];
 return out.every(Number.isFinite)?out:null;
}
export function parseSeoulResponse(body,service){
 const value=body?.[service];
 if(!value||typeof value!=='object')throw new Error('서울시 API 응답 형식 또는 서비스명을 확인해 주세요.');
 const code=value.RESULT?.CODE||'';
 if(code && !['INFO-000','INFO-200'].includes(code))throw new Error('서울시 API 오류: '+code);
 const total=Number(value.list_total_count||0);
 if(!Number.isSafeInteger(total)||total<0)throw new Error('서울시 API 전체 건수가 올바르지 않습니다.');
 return {total,rows:Array.isArray(value.row)?value.row:[],code};
}
const tidy=(v,n=180)=>String(v??'').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,n);
const web=(raw)=>{try{const u=new URL(tidy(raw,300));return ['https:','http:'].includes(u.protocol)?u.href:'';}catch{return ''}};
export function isOperating(row){
 const state=tidy(row?.TRDSTATENM,60),detail=tidy(row?.DTLSTATENM,60),code=tidy(row?.TRDSTATEGBN,10);
 if(/폐업|휴업|취소|말소|정지|중단|영업불가/.test(state+' '+detail))return false;
 if(code&&code!=='01'&&code!=='1')return false;
 return code==='01'||code==='1'||/정상|영업/.test(state);
}
export function normalizeSeoulPlace(row,def){
 if(!row||!isOperating(row))return null;
 const name=tidy(row.BPLCNM,90),ref=tidy(row.MGTNO,130);
 if(!name||!ref)return null;
 const coords=korean1985ToWgs84(row.X,row.Y);
 if(!coords||coords[0]<126.87||coords[0]>127.05||coords[1]<37.43||coords[1]>37.57)return null;
 const address=tidy(row.RDNWHLADDR||row.SITEWHLADDR,220);
 if(address&&!/동작구/.test(address))return null;
 const sub=tidy(row.UPTAENM||row.SNTUPTAENM||'',80);
 let category=def.category;
 if(def.id==='cafe'){
   if(/커피|다방|카페|찻집|전통차/.test(sub)||/커피|카페|다방/.test(name))category='카페';
   else if(/편의점/.test(sub))category='편의점';
   else category='휴게음식점';
 }
 return {id:`${def.id}:${ref}`,name,category,kind:def.id,lng:coords[0],lat:coords[1],address,phone:tidy(row.SITETEL,30),website:web(row.HOMEPAGE),source:'서울 열린데이터광장 / 동작구 인허가정보',updated:tidy(row.UPDATEDT||row.LASTMODTS,40)};
}
export function dedupePlaces(places){
 const normalized=new Map();
 for(const item of places){
   const key=`${item.name.replace(/\s+/g,'').toLowerCase()}|${item.lng.toFixed(4)}|${item.lat.toFixed(4)}`;
   if(!normalized.has(key))normalized.set(key,item);
 }
 return [...normalized.values()];
}
