/**
 * Seoul Open Data Plaza's legacy services document HTTP port 8088.
 * On Cloudflare Pages, fetch() can fail to reach that non-standard port.
 * This fallback uses the Workers outbound TCP socket API and a fixed, trusted host.
 */
const HOST='openapi.seoul.go.kr';
const LIMIT=3_000_000;
const dec=new TextDecoder();
function joined(chunks){
  const total=chunks.reduce((n,chunk)=>n+chunk.length,0);
  const result=new Uint8Array(total);let pos=0;
  for(const chunk of chunks){result.set(chunk,pos);pos+=chunk.length;}
  return result;
}
function marker(data,marker,start=0){
  outer:for(let i=start;i<=data.length-marker.length;i++){
    for(let j=0;j<marker.length;j++)if(data[i+j]!==marker[j])continue outer;
    return i;
  }
  return -1;
}
const CRLF=new Uint8Array([13,10]), DOUBLE_CRLF=new Uint8Array([13,10,13,10]);
export function parseHttpJsonResponse(bytes){
  const data=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
  const boundary=marker(data,DOUBLE_CRLF);
  if(boundary<0)throw new Error('TCP_HTTP_HEADERS_INCOMPLETE');
  const head=dec.decode(data.slice(0,boundary));
  const code=Number(head.match(/^HTTP\/\d(?:\.\d)?\s+(\d{3})/i)?.[1]);
  if(!Number.isInteger(code)||code<200||code>=300)throw new Error(`TCP_HTTP_${code||'INVALID'}`);
  const raw=data.slice(boundary+4);
  let body=raw;
  if(/transfer-encoding:\s*chunked/i.test(head)){
    const chunks=[];let at=0;
    while(at<raw.length){
      const end=marker(raw,CRLF,at);
      if(end<0)throw new Error('TCP_HTTP_BAD_CHUNK');
      const hex=dec.decode(raw.slice(at,end)).split(';')[0].trim();
      if(!/^[0-9a-fA-F]+$/.test(hex))throw new Error('TCP_HTTP_BAD_CHUNK');
      const size=parseInt(hex,16);
      if(size===0)break;
      at=end+2;
      if(at+size+2>raw.length)throw new Error('TCP_HTTP_TRUNCATED_CHUNK');
      chunks.push(raw.slice(at,at+size));at+=size+2;
    }
    body=joined(chunks);
  }else{
    const size=head.match(/content-length:\s*(\d+)/i);
    if(size)body=raw.slice(0,Number(size[1]));
  }
  if(body.length>LIMIT)throw new Error('TCP_HTTP_TOO_LARGE');
  try{return JSON.parse(dec.decode(body));}
  catch{throw new Error('TCP_HTTP_INVALID_JSON');}
}

export async function fetchSeoulJsonOverTcp({key,service,parts,connectFactory,timeoutMs=9500}){
  if(!/^[\w-]{8,128}$/.test(key)||!/^[A-Za-z0-9]+$/.test(service)||!Array.isArray(parts))
    throw new Error('INVALID_SEOUL_TCP_REQUEST');
  const path=`/${encodeURIComponent(key)}/json/${service}/1/${parts.map(v=>encodeURIComponent(String(v))).join('/')}/`;
  const connect=connectFactory||(await import('cloudflare:sockets')).connect;
  const socket=connect({hostname:HOST,port:8088});
  const timer=setTimeout(()=>{try{void socket.close();}catch{}},timeoutMs);
  try{
    const writer=socket.writable.getWriter();
    const request=`GET ${path} HTTP/1.1\r\nHost: ${HOST}\r\nAccept: application/json\r\nAccept-Encoding: identity\r\nConnection: close\r\n\r\n`;
    await writer.write(new TextEncoder().encode(request));
    // Do not close the writable half before receiving the HTTP response.
    // Workers sockets default to allowHalfOpen=false: writer.close() can close
    // the readable half prematurely, resulting in an empty time table.
    writer.releaseLock();
    const reader=socket.readable.getReader();const chunks=[];let size=0;
    try{
      while(true){
        const {done,value}=await reader.read();if(done)break;
        size+=value.byteLength;if(size>LIMIT+10_000)throw new Error('TCP_HTTP_TOO_LARGE');
        chunks.push(value);
      }
    }finally{reader.releaseLock();}
    return parseHttpJsonResponse(joined(chunks));
  }finally{
    clearTimeout(timer);
    try{await socket.close();}catch{}
  }
}
