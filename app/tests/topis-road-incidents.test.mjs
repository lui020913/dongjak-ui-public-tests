import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseAccInfoXml,incidentsToGeoJSON,toSeoulPoint,inverseGrs80Tm,xmlDecode} from '../server/topis-road-incidents.mjs';
import {parseHttpTextBytes} from '../server/topis-xml-tcp.mjs';
import {onRequestGet} from '../functions/api/road-incidents.js';
const fixture=`<?xml version="1.0" encoding="UTF-8"?><AccInfo><list_total_count>1</list_total_count><RESULT><CODE>INFO-000</CODE><MESSAGE>정상 처리되었습니다</MESSAGE></RESULT><row><ACC_ID>T-001</ACC_ID><OCCR_DATE>20261112</OCCR_DATE><OCCR_TIME>153000</OCCR_TIME><EXP_CLR_DATE>20261112</EXP_CLR_DATE><EXP_CLR_TIME>163000</EXP_CLR_TIME><ACC_TYPE>AA</ACC_TYPE><ACC_DTYPE>BB</ACC_DTYPE><GRS80TM_X>195402.0607</GRS80TM_X><GRS80TM_Y>544838.3549</GRS80TM_Y><LINK_ID>123</LINK_ID><ACC_INFO>동작구 도로 &amp; 교통상황</ACC_INFO></row></AccInfo>`;
test('TOPIS XML parser preserves official field definitions and decodes entities',()=>{
  const data=parseAccInfoXml(fixture);assert.equal(data.total,1);assert.equal(data.rows[0].description,'동작구 도로 & 교통상황');
  assert.equal(xmlDecode('&#xC548;&#45397;'),'안녕');
});
test('EPSG 5181 and 5186 inverse GRS80TM within 1m of known WGS84',()=>{
  for(const y of [444838.3549,544838.3549]){
    const pt=toSeoulPoint(195402.0607,y);assert.ok(pt);assert.ok(Math.abs(pt[0]-126.948)<.00001);assert.ok(Math.abs(pt[1]-37.503)<.00001);
  }
  assert.equal(toSeoulPoint(0,0),null);
});
test('GeoJSON shows road incident as unverified for pedestrians',()=>{
  const features=incidentsToGeoJSON(parseAccInfoXml(fixture).rows,'2026-11-12T14:00:00Z').features;
  assert.equal(features.length,1);assert.equal(features[0].properties.pedestrian_closure_verified,false);
  assert.deepEqual(features[0].geometry.coordinates.map(v=>+v.toFixed(3)),[126.948,37.503]);
});
test('error codes do not silently turn into empty safe map',()=>{
  assert.throws(()=>parseAccInfoXml('<AccInfo><RESULT><CODE>INFO-100</CODE></RESULT></AccInfo>'),/TOPIS_INFO-100/);
  assert.throws(()=>parseAccInfoXml('<!DOCTYPE abc><AccInfo/>'),/TOPIS_XML_INVALID/);
});
test('TCP chunked parser is UTF8 byte safe',()=>{
  const part=new TextEncoder().encode('<AccInfo><row><ACC_INFO>한글</ACC_INFO></row></AccInfo>');
  const header=new TextEncoder().encode('HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n'+part.length.toString(16)+'\r\n');
  const footer=new TextEncoder().encode('\r\n0\r\n\r\n');const full=new Uint8Array(header.length+part.length+footer.length);
  full.set(header,0);full.set(part,header.length);full.set(footer,header.length+part.length);
  assert.match(parseHttpTextBytes(full),/한글/);
});
test('endpoint without key is honest and does not expose secrets',async()=>{
  const res=await onRequestGet({request:new Request('https://example.test/api/road-incidents'),env:{}});
  assert.equal(res.status,503);const json=await res.json();assert.equal(json.status,'not_configured');
});
