/**
 * Bus service cessation has two distinct meanings:
 * - provider-confirmed: an explicit provider "운행 종료" flag;
 * - planned-past: the published last scheduled time has elapsed (not actual stop passage).
 * The 00:00-03:59 interval is deliberately not inferred from clock time
 * because the previous service day can still be active.
 */
export function busLastServiceStatus(row={},clock={}){
  if(row.passed===true)return {kind:'provider-confirmed',message:'운영기관 안내: 해당 노선 운행 종료'};
  const last=String(row.last||'').trim();
  const match=/^(\d{1,2}):(\d{2})(?:\s*\(\+1일\))?$/.exec(last);
  if(!match)return null;
  const hour=Number(match[1]),minute=Number(match[2]);
  if(hour>23||minute>59)return null;
  const now=Number(clock.minute);
  if(!Number.isFinite(now)||now<240||now>=1440||clock.afterMidnight===true)return null;
  const lastMinutes=hour*60+minute;
  // After-midnight service is compared on its own service date, never against
  // daytime of the previous date.
  if(lastMinutes<240||last.includes('+1일'))return null;
  if(now<=lastMinutes)return null;
  return {kind:'planned-past',message:'막차 예정시각 경과 · 시간표 기준 (실제 정류장 통과 여부 미확인)'};
}
