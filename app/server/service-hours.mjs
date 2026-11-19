/** 서울시 공식 첫차/막차 응답 정규화. 시간표는 실시간 통과 기록이 아닙니다. */
const arr=value=>Array.isArray(value)?value:(value?[value]:[]);
export function parseTime(value){
  if(value===null||value===undefined)return null;
  let v=String(value).trim();
  const matched=v.match(/^(\d{1,2}):?(\d{2})(?::?(\d{2}))?$/);
  if(!matched)return null;
  const hour=Number(matched[1]),min=Number(matched[2]);
  if(hour>29||min>=60)return null;
  return hour*60+min;
}
export function formatTime(total){
  if(!Number.isFinite(total))return '시간 미제공';
  const hour=Math.floor(total/60),min=total%60;
  return `${String(hour%24).padStart(2,'0')}:${String(min).padStart(2,'0')}${hour>=24?' (+1일)':''}`;
}
const preferAfterMidnight=(min)=>min<240?min+1440:min;
const firstLast=(times)=>{
  const sorted=times.filter(x=>x!==null).sort((a,b)=>a-b);
  if(!sorted.length)return null;
  const first=sorted.find(x=>x>=240&&x<1440)??sorted[0];
  const last=Math.max(...sorted.map(preferAfterMidnight));
  return {first,last};
};
/** 공공 시간표 급행 구분: G=일반, D=급행. 구형 값 0/1, N/Y도 수용. */
export function parseMetroExpressFlag(value){
  const flag=String(value??'').trim().toUpperCase();
  if(['D','1','Y','DIRECT','EXPRESS'].includes(flag))return true;
  if(['G','0','N','GENERAL','LOCAL'].includes(flag))return false;
  return null; // 자료에 없는 급행 여부는 추측하지 않습니다.
}

export function parseMetroStationCodeLookup(body,station,line){
  const data=body?.SearchInfoBySubwayNameService||body?.SearchSTNBySubwayLineInfo;
  const normal=x=>String(x||'').trim().replace(/역$/,'').replace(/\([^)]*\)/g,'').replace(/\s+/g,'');
  const requested=Number(String(line||'').match(/\d+/)?.[0]);
  const wanted=normal(station);
  if(!Number.isInteger(requested)||requested<1||requested>9)return null;
  const matched=arr(data?.row).filter(row=>{
    const name=normal(row.STATION_NM);
    const aliases=wanted==='이수'?['이수','총신대입구','총신대입구이수']:[];
    const code=Number(String(row.LINE_NUM||row.LINE||'').match(/\d+/)?.[0]);
    return (name===wanted||aliases.includes(name))&&code===requested;
  });
  const valid=matched.find(row=>/^\d{1,8}$/.test(String(row.STATION_CD||'')));
  return valid?String(valid.STATION_CD):null;
}

export function parseMetroStationLookup(body,station,line){
  const data=body?.SearchInfoBySubwayNameService||body?.SearchSTNBySubwayLineInfo;
  if(data?.RESULT?.CODE && data.RESULT.CODE!=='INFO-000')throw new Error('역 코드 조회가 실패했습니다.');
  const norm=x=>String(x||'').trim().replace(/역$/,'').replace(/\([^)]*\)/g,'').replace(/\s+/g,'');
  const wanted=['총신대입구','이수총신대입구'].includes(norm(station))?'이수':norm(station);
  const rows=arr(data?.row);
  const matched=rows.filter(x=>{
    const key=norm(x.STATION_NM);
    return key===wanted || (wanted==='이수'&&['총신대입구','총신대입구이수','이수총신대입구'].includes(key));
  });
  const valid=matched.filter(x=>/^\d{1,4}$/.test(String(x.FR_CODE||'')));
  const requested=Number(String(line||'').replace(/\D/g,''));
  if(!Number.isInteger(requested)||requested<1||requested>9)return null;
  return valid.find(x=>Number(String(x.LINE_NUM||x.LINE||'').match(/\d+/)?.[0])===requested)?.FR_CODE||null;
}
export function parseMetroServiceHours(responses,line,date=new Date(),dayOverride=null){
  const day=dayOverride||seoulDayTag(date);
  const items=[];
  for(const {direction,body} of responses){
    const data=body?.SearchSTNTimeTableByFRCodeService||body?.SearchSTNTimeTableByIDService;
    if(data?.RESULT?.CODE && data.RESULT.CODE!=='INFO-000')continue;
    const rows=arr(data?.row).filter(x=>String(x.WEEK_TAG||day)===String(day));
    // 9호선은 급행/일반 첫차·막차도 각각 표시합니다.
    // API가 급행 구분값을 주지 않으면 일반열차로 오분류하지 않습니다.
    const grouped=line==='9호선'?
      [{type:'일반',rows:rows.filter(row=>parseMetroExpressFlag(row.EXPRESS_YN)===false)},
       {type:'급행',rows:rows.filter(row=>parseMetroExpressFlag(row.EXPRESS_YN)===true)},
       {type:'종별 미확인',rows:rows.filter(row=>parseMetroExpressFlag(row.EXPRESS_YN)===null)}]:
      [{type:'',rows}];
    for(const group of grouped){
      const value=firstLast(group.rows.map(x=>parseTime(x.LEFTTIME||x.ARRIVETIME)));
      if(!value)continue;
      const now=seoulMinutes(date);
      // 00:00~03:59는 전일 운행이 겹칠 수 있어 막차 통과라고 판정하지 않습니다.
      const passed=day===seoulDayTag(date) && now>=240 && now>value.last;
      items.push({line,direction:direction==='1'?'상행·내선':'하행·외선',route:group.type,
        first:formatTime(value.first),last:formatTime(value.last),passed,
        firstMinute:value.first,lastMinute:value.last});
    }
  }
  return items;
}
/** 전체 운행표: 공식 원본의 방향·종착역·시각만 노출하며, 추정 시간은 만들지 않습니다. */
export function parseMetroTimetableRows(responses,line,day){
  const rows=[];
  for(const {direction,body} of responses){
    const data=body?.SearchSTNTimeTableByFRCodeService||body?.SearchSTNTimeTableByIDService;
    if(data?.RESULT?.CODE&&data.RESULT.CODE!=='INFO-000')continue;
    for(const item of arr(data?.row)){
      if(String(item.WEEK_TAG||day)!==String(day))continue;
      const minute=parseTime(item.LEFTTIME||item.ARRIVETIME);
      if(minute===null)continue;
      rows.push({line,day,direction:direction==='1'?'상행·내선':'하행·외선',
        directionCode:String(direction),time:formatTime(minute),minute,
        destination:String(item.SUBWAYENAME||'').trim(),
        origin:String(item.SUBWAYSNAME||'').trim(),
        express:parseMetroExpressFlag(item.EXPRESS_YN),
        trainNo:String(item.TRAIN_NO||'').trim()});
    }
  }
  return rows.sort((a,b)=>a.minute-b.minute||a.directionCode.localeCompare(b.directionCode));
}

export function seoulMinutes(date=new Date()){
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date);
  return Number(parts.find(p=>p.type==='hour')?.value)*60+Number(parts.find(p=>p.type==='minute')?.value);
}
export function seoulDayTag(date=new Date()){
  const weekday=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',weekday:'short'}).format(date);
  return weekday==='Sat'?'2':weekday==='Sun'?'3':'1';
}
export function parseBusServiceTime(body,route=''){
  const data=body?.msgBody?.itemList??body?.msgBody?.item??body?.itemList;
  const rows=arr(data);
  const row=rows[0];if(!row)return null;
  const first=parseTime(row.firstBusTm??row.firstTm??row.beginTm);
  const last=parseTime(row.lastBusTm??row.lastTm??row.endTm);
  if(first===null&&last===null)return null;
  const passedFlag=/^(?:운행종료|운행 종료|종료)$/i.test(String(row.nextBus??'').trim());
  return {route:String(route||row.busRouteNm||row.rtNm||'').trim(),first:first===null?'확인 불가':formatTime(first),
    last:last===null?'확인 불가':formatTime(last),passed:passedFlag,source:'정류소별 노선 첫차·막차 예정시간'};
}
