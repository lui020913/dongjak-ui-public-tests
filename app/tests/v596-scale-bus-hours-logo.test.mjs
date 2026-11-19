import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {scaleDockTop} from '../src/map-scale-docking.js';
import {parseHttpJsonResponse,fetchSeoulJsonOverTcp} from '../server/seoul-openapi-tcp.mjs';

const text=rel=>readFileSync(new URL(`../${rel}`,import.meta.url),'utf8');
test('scale is fully ABOVE the visible overview card, irrespective of card width',()=>{
  const top=scaleDockTop({mapTop:0,mapBottom:900,cardTop:740,scaleHeight:22,margin:14});
  assert.equal(top,704);
  assert.ok(top+22<=740-14);
  assert.equal(scaleDockTop({mapTop:0,mapBottom:900,cardTop:null,scaleHeight:22}),860);
});
test('scale docking tracks actual sheet size, not hard-coded bottom margin',()=>{
  const code=text('src/map-scale-docking.js');
  assert.match(code,/getBoundingClientRect\(\)/);
  assert.match(code,/ResizeObserver/);
  assert.match(text('src/main.js'),/installScaleDocking\(\{map,app,overview\}\)/);
});
test('official Chungshin PNG used as university logo',()=>{
  assert.ok(existsSync(new URL('../public/logos/chongshin.png',import.meta.url)));
  assert.match(text('src/education-layer.js'),/university-name-only/);
});
test('bus stop names are requested for the visible viewport independent of OSM presence',()=>{
  const code=text('src/transport-map.js');
  assert.match(code,/function enrichViewportBusStops\(\)/);
  assert.match(code,/busCoverageSamples\(map/);
  assert.match(text('src/bus-coverage-grid.js'),/map\.unproject\(/);
  assert.match(code,/bus\/stops-nearby\?/);
  assert.match(code,/map\.on\('moveend',[^\n]*enrichViewportBusStops\(\)/);
  assert.match(code,/transport-bus-names',type:'symbol',source:'transport-bus',minzoom:17\.75/);
});
test('TCP HTTP reader handles UTF-8 JSON with chunked transfer framing',()=>{
  const payload=JSON.stringify({status:'ok',name:'노량진역'});
  const body=new TextEncoder().encode(payload);
  const header=new TextEncoder().encode('HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n');
  const size=new TextEncoder().encode(body.length.toString(16)+'\r\n');
  const tail=new TextEncoder().encode('\r\n0\r\n\r\n');
  const joined=new Uint8Array(header.length+size.length+body.length+tail.length);
  let at=0;for(const part of [header,size,body,tail]){joined.set(part,at);at+=part.length;}
  assert.deepEqual(parseHttpJsonResponse(joined),{status:'ok',name:'노량진역'});
});
test('socket fallback always targets the Seoul API host and original port',async()=>{
  let requested='';let host,port;
  const payload=JSON.stringify({SearchInfoBySubwayNameService:{row:[]}});
  const response=new TextEncoder().encode(`HTTP/1.1 200 OK\r\nContent-Length: ${new TextEncoder().encode(payload).length}\r\n\r\n${payload}`);
  const mockConnect=addr=>{
    ({hostname:host,port}=addr);
    return {writable:new WritableStream({write(chunk){requested+=new TextDecoder().decode(chunk);}}),
      readable:new ReadableStream({start(controller){controller.enqueue(response);controller.close();}}),
      close:async()=>{}};
  };
  const data=await fetchSeoulJsonOverTcp({key:'SAMPLEKEY1234',service:'SearchInfoBySubwayNameService',parts:[100,'노량진'],connectFactory:mockConnect});
  assert.equal(host,'openapi.seoul.go.kr');assert.equal(port,8088);
  assert.match(requested,/SearchInfoBySubwayNameService\/1\/100\//);
  assert.ok(data.SearchInfoBySubwayNameService);
});
