/** Accept the decoded or data.go.kr already-encoded API key without
 * accidentally producing %252B / %252F / %253D in requests. */
export function normalizeBusServiceKey(value){
  const key=String(value??'').trim();
  if(!/%(?:2B|2F|3D)/i.test(key))return key;
  try{return decodeURIComponent(key);}catch{return key;}
}
