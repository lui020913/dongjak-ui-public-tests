import {parseHttpTextBytes} from './topis-xml-tcp.mjs';
const HOST='openapi.seoul.go.kr';
/** Fetch Seoul Open API JSON over legacy port 8088 using Cloudflare TCP sockets. */
export async function fetchSdotPageOverTcp({key,start=1,end=1000,date,connectFactory,timeoutMs=11000}){
  if(!/^[\w-]{8,128}$/.test(key)||!/^\d{4}-\d{2}-\d{2}$/.test(date)||
    !Number.isInteger(start)||!Number.isInteger(end)||start<1||end<start||end-start>=1000)
    throw new Error('SDOT_BAD_REQUEST');
  const connect=connectFactory||(await import('cloudflare:sockets')).connect;
  const socket=connect({hostname:HOST,port:8088});
  const timer=setTimeout(()=>{try{void socket.close();}catch{}},timeoutMs);
  try{
    const writer=socket.writable.getWriter();
    await writer.write(new TextEncoder().encode(`GET /${encodeURIComponent(key)}/json/sDoTEnv/${start}/${end}/${date}/ HTTP/1.1\r\nHost: ${HOST}\r\nAccept: application/json\r\nAccept-Encoding: identity\r\nConnection: close\r\n\r\n`));
    writer.releaseLock();
    const reader=socket.readable.getReader();const chunks=[];let length=0;
    try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;
      if(length>2_800_000)throw new Error('SDOT_PAGE_TOO_LARGE');chunks.push(value);}}
    finally{reader.releaseLock();}
    const body=new Uint8Array(length);let offset=0;for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.length;}
    const parsed=parseHttpTextBytes(body);if(parsed.length>2_800_000)throw new Error('SDOT_PAGE_TOO_LARGE');
    return JSON.parse(parsed);
  }finally{clearTimeout(timer);try{await socket.close();}catch{}}
}
