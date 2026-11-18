/**
 * Seoul realtime subway text is often a concatenation of train destination,
 * arrival countdown, via station and service class. Keep the raw API data
 * unchanged, but split the presentation into readable fields.
 */
export function formatMetroArrivalCard(row = {}) {
  const raw = String(row.direction || '').trim();
  const segments = raw.split(/\s*·\s*/).map(x => x.trim()).filter(Boolean);
  const directionType = String(row.directionType || '').trim();
  const withoutDirection = segments.filter(x => x !== directionType && !/^(?:상행|하행|내선|외선)$/.test(x));
  const service = withoutDirection.find(x => /^(?:일반|급행|특급|직통|완행)$/.test(x)) || '';
  const train = withoutDirection.filter(x => x !== service).join(' · ');
  const destination = String(row.destination || '').trim().replace(/(?:행|방면)$/, '');
  const inferred = train.match(/^([^\s·()\d-]+?)(?:행|방면|\d+\s*분)/)?.[1] || '';
  const lastReport = /^최근 수신:/.test(String(row.message||''));
  const heading = (destination || inferred) ? `${destination || inferred}행` : lastReport ? '최근 열차 보고' : '열차 도착 예정';
  const via = train.match(/[-–]\s*([^·]+?)(?=\s*·|$)/)?.[1]?.trim() || '';
  const details = [via, service].filter(Boolean).join(' · ');
  let arrival = String(row.message || '').trim() || '도착정보 없음';
  // The public endpoint sometimes prepends the destination name to the time.
  if(destination && arrival.startsWith(destination)) {
    const rest = arrival.slice(destination.length).trim();
    if(/^(?:\d+\s*분|\d+\s*초|곧|전역|도착|진입|출발|약\s*\d+)/.test(rest))arrival = rest;
  }
  return {heading,details,arrival};
}
