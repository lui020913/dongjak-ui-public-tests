import {guardSubwayProxyArrival} from './transport-freshness.js';
export function transitRailArrival(body,line,{nowMs=Date.now()}={}){
 const verified=guardSubwayProxyArrival(body,{nowMs});
 if(!verified.sourceVerified)return {rows:[],note:verified.emptyMessage||'검증된 도착정보 없음'};
 const rows=verified.items.filter(x=>x?.line===line&&String(x.direction||'').trim()&&String(x.message||'').trim()).slice(0,6).map(x=>({direction:String(x.direction),message:String(x.message)}));
 return {rows,note:rows.length?'원본 '+(verified.updatedAt||'시각 확인')+' · 실제 탑승 방향을 확인하세요.':'해당 호선의 검증된 도착정보 없음'};
}
