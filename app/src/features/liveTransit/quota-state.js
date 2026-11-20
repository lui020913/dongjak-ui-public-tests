// A verified Seoul daily-limit response is a managed outage, never a healthy live feed.
export const METRO_QUOTA_NOTICE='서울시 지하철 API 일일 조회량을 초과했습니다. 이용 가능해지면 다시 표시됩니다.';
export function isMetroDailyQuota(status,body){
 return status===429&&body?.ok===false&&body?.code==='ERROR-337';
}
export function metroQuotaRetryMs(body,header){
 const seconds=Number(body?.retryAfterSeconds??header);
 return (Number.isFinite(seconds)&&seconds>0?Math.min(seconds,86400):60)*1000;
}
export function isMixedMetroQuota(body){
 return body?.metroQuota?.code==='ERROR-337'&&Array.isArray(body?.warnings)&&body.warnings.includes('METRO_DAILY_QUOTA');
}
