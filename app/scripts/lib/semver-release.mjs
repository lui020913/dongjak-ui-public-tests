/** Operational application release policy (not the re-numbered historical archive). */
export const RELEASE_KINDS=Object.freeze(['major','minor','patch']);

export function parseVersion(version){
  if(typeof version!=='string'||!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)){
    throw new TypeError(`Invalid release version: ${String(version)}`);
  }
  const parts=version.split('.').map(Number);
  if(parts.some(n=>!Number.isSafeInteger(n)))throw new RangeError(`Version component exceeds safe range: ${version}`);
  return parts;
}

export function normalizeReleaseKind(kind){
  const normalized=kind==='next'?'minor':kind;
  if(!RELEASE_KINDS.includes(normalized))throw new TypeError(`Unknown release kind: ${String(kind)}`);
  return normalized;
}

export function bumpVersion(current,kind){
  const normalized=normalizeReleaseKind(kind);
  const [major,minor,patch]=parseVersion(current);
  const result=normalized==='major'?[major+1,0,0]
    :normalized==='minor'?[major,minor+1,0]:[major,minor,patch+1];
  if(result.some(n=>!Number.isSafeInteger(n)))throw new RangeError('Version component exceeds safe range');
  return result.join('.');
}

export function releaseKindBetween(previous,current){
  parseVersion(previous);parseVersion(current);
  for(const kind of RELEASE_KINDS){
    if(bumpVersion(previous,kind)===current)return kind;
  }
  return null;
}
