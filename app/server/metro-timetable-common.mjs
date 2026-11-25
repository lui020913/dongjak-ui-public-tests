/**
 * 서울시 지하철 시간표의 역별 공통 조회 로직.
 * 코드 조회는 역명·호선을 함께 확인하며, 확인되지 않은 FR_CODE를 추정하지 않습니다.
 * 서울교통공사 SearchSTNTimeTableByFRCodeService는 운영기관/노선 범위 제약이 있습니다.
 */
import {parseMetroStationLookup,parseMetroStationCodeLookup,parseMetroServiceHours,parseMetroTimetableRows} from './service-hours.mjs';

const SUPPORTED = new Set(Array.from({length:9},(_,i)=>`${i+1}호선`));

export function normalizeTimetableStationName(input){
  const name=String(input||'').normalize('NFC').trim()
    .replace(/\s*역\s*$/,'').replace(/\s*\([^)]*\)\s*/g,'')
    .replace(/\s*[·/]\s*.*$/,'').replace(/\s+/g,'');
  return name==='총신대입구'?'이수':name;
}

export function timetableStationCandidates(input){
  const base=normalizeTimetableStationName(input);
  if(!base)return [];
  // 노선별 명칭 또는 부역명이 달라 검색이 누락되는 곳만 검증된 공식 명칭을 대조합니다.
  const aliases={
    '이수':['이수','총신대입구','총신대입구(이수)'],
    '총신대입구':['총신대입구','이수'],
    '서울대입구':['서울대입구','서울대입구(관악구청)'],
    '숭실대입구':['숭실대입구','숭실대입구(살피재)'],
    '동대문역사문화공원':['동대문역사문화공원'],
    '용산':['용산'],
  };
  return [...new Set([base,...(aliases[base]||[])])].slice(0,4);
}

export function timetableLineSelection(value){
  const lines=[...new Set(String(value||'').split(/[;,|]/).map(s=>s.trim()).filter(Boolean))];
  return {supported:lines.filter(line=>SUPPORTED.has(line)).slice(0,9),
    unsupported:lines.filter(line=>!SUPPORTED.has(line))};
}

/**
 * fetchJSON(service, parts) 호출은 서버에서만 실행합니다. 공개 API 인증키는 브라우저에 주지 않습니다.
 */
export async function fetchStationTimetables({station,line,day,fetchJSON,now=new Date()}){
  const {supported,unsupported}=timetableLineSelection(line);
  const notes=unsupported.map(l=>`${l}: 서울교통공사 시간표 API 지원 여부를 확인할 수 없습니다.`);
  const names=timetableStationCandidates(station);
  if(!supported.length)return {status:'unsupported',kind:'subway',items:[],timetable:[],day,
    requestedLines:unsupported,notice:notes.join(' · ')||'조회할 호선이 확인되지 않았습니다.'};
  if(!names.length)return {status:'unavailable',kind:'subway',items:[],timetable:[],day,
    requestedLines:supported,notice:'시간표 조회에 필요한 역명이 없습니다.'};

  let upstreamSuccess=0,upstreamFailures=0;
  const recordedFetch=async(service,parts)=>{
    try{const data=await fetchJSON(service,parts);upstreamSuccess++;return data;}
    catch(error){upstreamFailures++;throw error;}
  };
  const primaryLookups=[];
  // 한 역에서 여러 호선을 조회하므로 역명 조회 결과는 공유합니다.
  for(const name of names){
    try{primaryLookups.push(await recordedFetch('SearchInfoBySubwayNameService',[100,name]));}
    catch(error){notes.push(`${name} 역명 조회 일시 실패`);}
    if(primaryLookups.length>0 && name===names[0])break;
  }

  const items=[],timetable=[];
  const verifiedCodeFallback={'노량진':{'1호선':'136'}};
  for(const selectedLine of supported){
    let code=null,stationCode=null;
    for(const body of primaryLookups){
      try{code=parseMetroStationLookup(body,names[0],selectedLine);stationCode=parseMetroStationCodeLookup(body,names[0],selectedLine)||stationCode;}catch(error){notes.push(`${selectedLine}: 역코드 검색 응답 오류`);}
      if(code)break;
    }
    if(!code || (selectedLine==='1호선'&&!stationCode)){
      // 1호선의 역코드(ID)는 외부코드와 별개로 확인합니다.
      // 1차 역명검색에 호선/운영사 차이로 결과가 없는 경우 공식 노선별 검색 재시도.
      for(const name of names){
        try{
          const body=await recordedFetch('SearchSTNBySubwayLineInfo',[150,' ',name,selectedLine]);
          code=code||parseMetroStationLookup(body,name,selectedLine);
          stationCode=parseMetroStationCodeLookup(body,name,selectedLine)||stationCode;
          if(code && (selectedLine!=='1호선'||stationCode))break;
        }catch(error){
          // 개별 호선만 실패 처리합니다. 다른 호선의 시간표는 그대로 제공.
        }
      }
    }
    // 노량진 1호선은 이전에 별도로 확인된 외부코드이며 공식 검색에서 누락될 때만 사용합니다.
    if(!code)code=verifiedCodeFallback[normalizeTimetableStationName(station)]?.[selectedLine]||null;
    // 2026 published Noryangjin station code 1004 is used only if an API lookup fails.
    if(!stationCode && normalizeTimetableStationName(station)==='노량진' && selectedLine==='1호선')stationCode='1004';
    if(!code && !stationCode){notes.push(`${selectedLine}: 공식 역코드 미확인`);continue;}

    const results=code ? await Promise.allSettled(['1','2'].map(async direction=>({
      direction,body:await recordedFetch('SearchSTNTimeTableByFRCodeService',[500,code,day,direction])
    }))) : [];
    const verified=results.filter(x=>x.status==='fulfilled').map(x=>x.value);
    let parsedTimes=parseMetroTimetableRows(verified,selectedLine,day);
    let summary=parseMetroServiceHours(verified,selectedLine,now,day);
    // The FR_CODE endpoint can return an empty response for Korail-operated Line 1.
    // Retry the officially documented station-code endpoint, never fabricate trains.
    const missingDirections=['1','2'].filter(direction=>!parsedTimes.some(row=>row.directionCode===direction));
    if(missingDirections.length && stationCode){
      const byID=await Promise.allSettled(missingDirections.map(async direction=>({
        direction,body:await recordedFetch('SearchSTNTimeTableByIDService',[500,stationCode,day,direction])
      })));
      const verifiedID=byID.filter(x=>x.status==='fulfilled').map(x=>x.value);
      const idRows=parseMetroTimetableRows(verifiedID,selectedLine,day);
      if(idRows.length){
        parsedTimes=[...parsedTimes,...idRows];
        summary=[...summary,...parseMetroServiceHours(verifiedID,selectedLine,now,day)];
      }else notes.push(parsedTimes.length?`${selectedLine}: 일부 방향 시간표 미제공 (운영기관 확인 필요)`:`${selectedLine}: 시간표 조회 결과 없음 · 외부코드/역코드 API 모두 미제공 (운영기관 확인 필요)`);
    }
    items.push(...summary);
    timetable.push(...parsedTimes);
    if(!summary.length && !stationCode)notes.push(`${selectedLine}: 시간표 조회 결과 없음 · 역코드 확인 필요`);
    if(results.some(x=>x.status==='rejected'))notes.push(`${selectedLine}: 일부 방면 API 조회 실패`);
  }
  timetable.sort((a,b)=>a.minute-b.minute||a.line.localeCompare(b.line,'ko'));
  const state=(items.length||timetable.length)?'ok':upstreamSuccess===0&&upstreamFailures>0?'error':'unavailable';
  return {status:state,kind:'subway',items,timetable,day,
    requestedLines:[...supported,...unsupported],
    source:'서울교통공사 역별 열차 시간표',
    notice:[...new Set([
      ...(state==='error'?['서울시 시간표 API 연결에 실패했습니다. 제공기관 또는 인증키 설정을 확인해 주세요.']:[]),
      ...notes,'시간표상 첫차·막차 안내이며 실제 운행·통과 여부를 의미하지 않습니다.'
    ])].join(' · ')};
}
