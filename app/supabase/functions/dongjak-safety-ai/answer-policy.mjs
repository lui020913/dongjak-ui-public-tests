// Only the presentation style changes. Evidence, coordinates, and search scope do not.
export const explanationMode=value=>['child','teen','adult','senior'].includes(value)?value:'adult';
export function protectionSubtype(query){
 const elderly=/노인|어르신|고령|경로당|요양/.test(query),child=/어린이|아이|학생|통학|초등학교|유치원|어린이집/.test(query);
 return elderly===child?null:elderly?'노인':'어린이';
}
export function matchesProtectionSubtype(row,subtype){
 return !subtype||row.category==='protection_zone'&&String(row.title||'').includes(subtype+' 보호구역');
}
export function evidenceAnswer(results,mode,category,subtype){
 const n=results.length,kind=subtype?subtype+' 보호구역':category==='protection_zone'?'보호구역':category==='accident_hotspot'?'보행자 사고다발지역':'보행안전 자료';
 const area='상도1동 참고 경계와 교차하는 등록 자료';
 if(!n){return mode==='child'?'찾는 자료가 아직 없어요. 자료가 없다고 안전한 곳이라는 뜻은 아니에요.':mode==='teen'?'등록 자료에서 일치하는 결과를 찾지 못했어요. 실제 안전 여부는 별도로 확인해야 해요.':'등록 자료에서 일치하는 결과가 없습니다. 검색 결과가 없다는 사실은 해당 지역이 안전하다는 의미가 아닙니다.';}
 const scope=category==='protection_zone'?'표시되는 위치는 시설 대표점이며 출입문이나 정확한 주소는 확인되지 않았습니다.':'자료에 포함된 위치만 표시하며 현재 위험도를 의미하지 않습니다.';
 switch(mode){
  case 'child':return '찾아봤어요! '+kind+' 자료가 '+n+'건 있어요. 상도1동 주변의 등록 자료예요. 아래 지도를 눌러 위치를 확인해요. 실제 입구와는 다를 수 있어요.';
  case 'teen':return '상도1동 주변 등록 자료에서 '+kind+' '+n+'건을 찾았어요. 아래 근거를 눌러 위치와 출처를 확인할 수 있어요. '+scope;
  case 'senior':return '상도1동 주변에서 확인할 수 있는 '+kind+' 자료는 '+n+'건입니다. 아래의 지도 보기 버튼을 누르시면 위치를 보실 수 있습니다. '+scope;
  default:return area+'에서 '+kind+' '+n+'건을 검색했습니다. '+scope+' 각 자료의 출처와 적용 범위를 확인해 주세요.';
 }
}
