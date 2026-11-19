/** Cloudflare Workers TCP access to Seoul's officially documented HTTP port 8088. */
const HOST='openapi.seoul.go.kr';
const MAX=3_000_000;
export async function fetchSeoulXmlOverTcp({key,start=1,end=1000,connectFactory,timeoutMs=9000}) {
  if(!/^[\w-]{8,128}$/.test(key)||!Number.isInteger(start)||!Number.isInteger(end)||start<1||end<start||end-start>=1000)
    throw new Error('TOPIS_INVALID_REQUEST');
  const connect=connectFactory||(await import('cloudflare:sockets')).connect;
  const socket=connect({hostname:HOST,port:8088});
  const timer=setTimeout(()=>{try{void socket.close();}catch{}},timeoutMs);
  try{
    const writer=socket.writable.getWriter();
    await writer.write(new TextEncoder().encode(`GET /${encodeURIComponent(key)}/xml/AccInfo/${start}/${end}/ HTTP/1.1\r\nHost: ${HOST}\r\nAccept: application/xml\r\nAccept-Encoding: identity\r\nConnection: close\r\n\r\n`));
    writer.releaseLock();
    const reader=socket.readable.getReader(),chunks=[];let size=0;
    try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;
      if(size>MAX+10000)throw new Error('TOPIS_TOO_LARGE');chunks.push(value);}}
    finally{reader.releaseLock();}
    const all=new Uint8Array(size);let offset=0;
    for(const c of chunks){all.set(c,offset);offset+=c.length;}
    return parseHttpTextBytes(all);
  }finally{clearTimeout(timer);try{await socket.close();}catch{}}
}
export function parseHttpTextBytes(bytes){
  const marker=new Uint8Array([13,10,13,10]);let at=-1;
  outer:for(let i=0;i<=bytes.length-4;i++){
    for(let j=0;j<4;j++)if(bytes[i+j]!==marker[j])continue outer;
    at=i;break;
  }
  if(at<0)throw new Error('TOPIS_HTTP_INCOMPLETE_HEADER');
  const dec=new TextDecoder(),head=dec.decode(bytes.slice(0,at));
  const status=Number(head.match(/^HTTP\/\d(?:\.\d)?\s+(\d{3})/)?.[1]);
  if(status!==200)throw new Error(`TOPIS_HTTP_${status||'UNKNOWN'}`);
  const raw=bytes.slice(at+4);let body=raw;
  if(/transfer-encoding:\s*chunked/i.test(head)){
    const chunks=[];let i=0;
    while(i<raw.length){
      let e=i;while(e<raw.length-1&&(raw[e]!==13||raw[e+1]!==10))e++;
      if(e>=raw.length-1)throw new Error('TOPIS_CHUNK_INCOMPLETE');
      const sizeText=dec.decode(raw.slice(i,e)).split(';')[0].trim();
      if(!/^[0-9a-f]+$/i.test(sizeText))throw new Error('TOPIS_CHUNK_INVALID');
      const n=parseInt(sizeText,16);i=e+2;if(n===0)break;
      if(i+n+2>raw.length)throw new Error('TOPIS_CHUNK_TRUNCATED');
      chunks.push(raw.slice(i,i+n));i+=n+2;
    }
    const length=chunks.reduce((n,c)=>n+c.length,0);body=new Uint8Array(length);let offset=0;
    for(const c of chunks){body.set(c,offset);offset+=c.length;}
  }else{
    const length=Number(head.match(/content-length:\s*(\d+)/i)?.[1]);
    if(Number.isFinite(length)&&length>0)body=body.slice(0,length);
  }
  if(body.length>MAX)throw new Error('TOPIS_TOO_LARGE');
  return dec.decode(body);
}
