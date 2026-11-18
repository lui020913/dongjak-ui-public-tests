/**
 * Diagnostic only: no changes to the website's production API behavior.
 * Usage from project root: node scripts/check-bus-auth-deep.mjs
 * Does not print keys, complete request URLs, response bodies, redirect URLs, or environment values.
 */
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';

function envValue(name){
  if(process.env[name])return String(process.env[name]).trim();
  if(!existsSync('.env'))return '';
  const data=readFileSync('.env','utf8');
  const entry=data.split(/\r?\n/).find(s=>new RegExp(`^\\s*${name}\\s*=`).test(s));
  if(!entry)return '';
  return entry.replace(/^\s*[^=]+\s*=\s*/,'').trim().replace(/^(?:"([\s\S]*)"|'([\s\S]*)')$/,'$1$2').trim();
}
const original=envValue('SEOUL_BUS_SERVICE_KEY');
if(!original){
  console.log('SEOUL_BUS_SERVICE_KEY가 로컬 환경변수 또는 .env에 없습니다.');
  process.exit(2);
}
const encoded=/%(?:25|2B|2F|3D)/i.test(original);
let key=original;
if(encoded)try{key=decodeURIComponent(original);}catch{}
console.log('[서울시 정류소 API 심층 진단]');
console.log('인증키는 출력하지 않으며, URL과 원본 응답 본문도 출력하지 않습니다.');
console.log('키의 URL 인코딩 형태 감지:',encoded?'예 (요청 시 1회 정규화)':'아니오');

const BASE='/api/rest/stationinfo/getStationByPos';
const probes=[
  ['HTTP · ServiceKey · JSON','http','ServiceKey',true],
  ['HTTP · serviceKey · JSON','http','serviceKey',true],
  ['HTTPS · ServiceKey · JSON','https','ServiceKey',true],
  ['HTTP · ServiceKey · XML 기본','http','ServiceKey',false],
  ['HTTP · 인증키 미전달 비교','http',null,true]
];
function codeFrom(body){
  try{
    const j=JSON.parse(body);
    const value=j.msgHeader?.headerCd??j.RESULT?.CODE??j.response?.header?.resultCode??j.cmmMsgHeader?.returnReasonCode;
    return value==null?'없음':String(value).slice(0,36).replace(/[^\w-]/g,'');
  }catch{}
  for(const t of ['headerCd','returnReasonCode','resultCode','CODE']){
    const m=body.match(new RegExp(`<${t}>([^<]{1,40})<\\/${t}>`,'i'));
    if(m)return m[1].trim().slice(0,36).replace(/[^\w-]/g,'');
  }
  return '없음';
}
function formatType(contentType){
  if(/json/i.test(contentType))return 'JSON';
  if(/xml/i.test(contentType))return 'XML';
  if(/html/i.test(contentType))return 'HTML';
  if(/text\/plain/i.test(contentType))return '텍스트';
  return '미확인';
}
async function tryProbe([label,scheme,keyName,json]){
  const u=new URL(`${scheme}://ws.bus.go.kr${BASE}`);
  u.searchParams.set('tmX','126.954');
  u.searchParams.set('tmY','37.4955');
  u.searchParams.set('radius','180');
  if(json)u.searchParams.set('resultType','json');
  if(keyName)u.searchParams.set(keyName,key);
  try{
    const response=await fetch(u,{signal:AbortSignal.timeout(10500),redirect:'manual',headers:{Accept:json?'application/json':'application/xml'}});
    const body=(await response.text()).slice(0,100000);
    const server=String(response.headers.get('server')||'미제공').replace(/[^\w .\-/]/g,'').slice(0,60);
    const type=formatType(response.headers.get('content-type')||'');
    const authHeader=String(response.headers.get('www-authenticate')||'');
    const method=authHeader?String(authHeader.split(/\s+/)[0]).replace(/[^\w-]/g,'').slice(0,20):'없음';
    const code=codeFrom(body);
    const digest=createHash('sha256').update(String(response.status)+'|'+body).digest('hex');
    const isHtmlGate=type==='HTML' && /unauthorized|access denied|forbidden|authentication|login/i.test(body);
    const isTransportBlock=/blocked.*(https|http)|only https|HTTPS-ONLY/i.test(body);
    const hasBusList=/<itemList>|"itemList"|<msgHeader>|"msgHeader"/i.test(body);
    return {label,kind:'result',status:response.status,type,server,authMethod:method,code,digest,isHtmlGate,isTransportBlock,hasBusList};
  }catch(err){
    return {label,kind:'network',reason:err.name==='TimeoutError'?'요청 시간 초과':String(err.cause?.code||err.name||'NETWORK_ERROR').slice(0,60)};
  }
}
const results=[];
for(const probe of probes){
  const r=await tryProbe(probe);results.push(r);
  console.log(`\n${r.label}`);
  if(r.kind==='network')console.log('  네트워크 실패:',r.reason);
  else{
    console.log(`  HTTP ${r.status} / 본문 형식 ${r.type} / 응답코드 ${r.code}`);
    console.log(`  서버 식별 ${r.server} / WWW-Authenticate 방식 ${r.authMethod}`);
    if(r.isHtmlGate)console.log('  중간 인증·접근 차단 페이지로 의심되는 HTML 응답');
    if(r.isTransportBlock)console.log('  HTTP/HTTPS 보안정책 차단 문구 감지');
    if(r.hasBusList)console.log('  서울시 버스 API 응답 구조 감지');
  }
}
const a=results[0], b=results[1], https=results[2], blank=results[4];
console.log('\n[비교 결과]');
if(a.kind==='result'&&b.kind==='result'){
  if(a.status!==b.status || a.digest!==b.digest)console.log('  파라미터 대소문자에 따라 응답 차이가 있습니다. 200 또는 API 정상코드를 받은 쪽을 기준으로 수정하십시오.');
  else console.log('  ServiceKey와 serviceKey 응답이 동일합니다. 대소문자 변경만으로 해결될 가능성은 낮습니다.');
}
if(a.kind==='result'&&blank.kind==='result'){
  if(a.digest===blank.digest)console.log('  인증키를 보낸 요청과 키 없는 요청의 응답이 같습니다. 키가 원천까지 전달되지 않았거나 공통 접속 차단일 가능성이 있습니다.');
  else console.log('  인증키 전달 여부에 따라 응답이 다릅니다. 서버가 키를 처리하려 했을 가능성이 있습니다.');
}
if(https.kind==='result' && a.kind==='result'&&https.status!==a.status)console.log('  HTTP/HTTPS에 따라 상태코드가 다릅니다. 정식 문서의 지원 프로토콜과 호출주소를 대조하십시오.');
if(results.some(r=>r.kind==='result'&&r.status===200&&r.hasBusList))console.log('  서울시 응답 구조를 가진 200 결과가 있습니다. msgHeader 코드와 itemList를 확인하십시오.');
else console.log('  정상 응답이 확인되지 않았습니다. 포털의 API 테스트와 비교하고, 실패하면 응답 상태·형식·서버 식별만 제공기관에 전달하십시오.');
console.log('\n주의: HTTP 200도 내부 오류코드일 수 있습니다. 실제 버스정류소 데이터가 표시되는지는 별도 검증해야 합니다.');
