/** v8.2.5 — additional navigation guidance derived from real walking geometry.
 * This supplements routes without provided maneuvers; it never assumes a road
 * is safe, open or accessible merely because its geometry changes direction. */
import {makeRouteIndex,pointAtProgress} from './navigation-geometry.js';
import {bearingDegrees} from './navigation-experience.js';

export function signedTurnDegrees(incoming,outgoing){
  return ((outgoing-incoming+540)%360)-180;
}
export function classifyGeometryTurn(angle,threshold=55){
  if(!Number.isFinite(angle)||Math.abs(angle)<threshold)return null;
  return {direction:angle>0?'right':'left',label:angle>0?'우회전':'좌회전',angle:Math.abs(angle)};
}
/** Look 18–25m ahead/behind each vertex: ignore micro-segment jitter.
 * Merge neighboring candidates so one corner is not announced repeatedly. */
export function deriveWalkingTurns(coords,{threshold=55,lookMeters=20,mergeMeters=38}={}){
  if(!Array.isArray(coords)||coords.length<3)return [];
  let index;
  try{index=makeRouteIndex(coords);}catch{return [];}
  const candidates=[];
  for(let i=1;i<coords.length-1;i++){
    const at=index.lengths[i];
    if(at<Math.max(14,lookMeters*.7)||index.total-at<Math.max(14,lookMeters*.7))continue;
    const behind=pointAtProgress(index,Math.max(0,at-lookMeters)).point;
    const ahead=pointAtProgress(index,Math.min(index.total,at+lookMeters)).point;
    const into=bearingDegrees(behind,coords[i]);
    const out=bearingDegrees(coords[i],ahead);
    const classified=classifyGeometryTurn(signedTurnDegrees(into,out),threshold);
    if(classified)candidates.push({...classified,index:i,at});
  }
  const merged=[];
  for(const corner of candidates){
    const previous=merged.at(-1);
    if(previous && corner.at-previous.at<=mergeMeters){
      if(corner.angle>previous.angle)merged[merged.length-1]=corner;
    }else merged.push(corner);
  }
  return merged.map(({direction,label,index,at,angle})=>({direction,label,index,at,angle}));
}
export function turnAnnouncement(turn,distance){
  if(!turn||!Number.isFinite(distance))return '';
  const rounded=Math.max(10,Math.round(distance/10)*10);
  return distance<=18?`${turn.label} 방향입니다. 주변 보행로를 확인하세요.`:`약 ${rounded}미터 앞에서 ${turn.label} 방향입니다. 주변 보행로를 확인하세요.`;
}
/** Stage changes are monotonic, so a stationary GPS fix cannot repeat a cue. */
export function nextTurnCue(turn,distance,announced=new Set()){
  if(!turn||!Number.isFinite(distance)||distance>130||distance<0)return null;
  const stage=distance>45?'100':distance>18?'30':'now';
  const key=`geometry-turn-${turn.index}-${stage}`;
  return announced.has(key)?null:{key,stage,text:turnAnnouncement(turn,distance)};
}
