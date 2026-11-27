export function classifyBusRoute(route,explicitType=''){
  const name=String(route||'').trim();
  const type=String(explicitType||'').trim();
  const official={'1':'airport','2':'village','3':'trunk','4':'branch','5':'circular','6':'metro'};
  if(/^N\d{2,3}$/i.test(name))return 'night';
  if(/^8\d{3}$/.test(name)&&(!type||type==='8'||type==='7'))return 'branch';
  if(official[type])return official[type];
  if(/^(?:공항|airport)/i.test(type)||/^(?:공항|airport)/i.test(name))return 'airport';
  if(['641','650'].includes(name))return 'trunk';
  if(name==='6515')return 'branch';
  if(/^6[0-3]\d{2}$/.test(name)||/^67\d{2}$/.test(name))return 'airport';
  if(/^(?:마을|village)/i.test(type)||/^(?:동작|관악|서초|영등포|구로|금천|마포|용산|강남|강서|양천|동대문|송파|광진|강북|성북|성동|도봉|노원|은평|종로|중구|중랑|서대문|강동|강남)[가-힣]?\d{1,3}(?:-|$)/.test(name))return 'village';
  if(/^(?:광역|metropolitan)/i.test(type)||/^[Mm]\d{3,4}$/.test(name)||/^9\d{3}$/.test(name))return 'metro';
  if(/^(?:간선|trunk)/i.test(type)||/^[1-7]\d{2}(?:[AB])?$/i.test(name))return 'trunk';
  if(/^(?:지선|branch)/i.test(type)||/^[1-7]\d{3}(?:[AB])?$/i.test(name))return 'branch';
  if(/^(?:순환|circulation)/i.test(type)||/^0\d{2,3}$/.test(name))return 'circular';
  if(/^(?:심야|night)/i.test(type)||/^N\d{2,3}$/i.test(name))return 'night';
  return 'unknown';
}
export const BUS_CATEGORY_LABEL={trunk:'간선버스',branch:'지선버스',village:'마을버스',metro:'광역버스',airport:'공항버스',circular:'순환버스',night:'심야버스',unknown:'버스 유형 미확인'};

// Keep the same type colors on route lines, badges and details regardless of arrivals.
export const BUS_CATEGORY_COLOR=Object.freeze({trunk:'#3566c1',branch:'#3d9b46',village:'#4a9c39',metro:'#c63d42',airport:'#52B5E5',circular:'#e5b928',night:'#293d75',unknown:'#267f92'});
export function busBadgeColor(route,type=''){return BUS_CATEGORY_COLOR[classifyBusRoute(route,type)];}
export function paintBusBadge(node,route,type=''){const category=classifyBusRoute(route,type);node.dataset.busClass=category;node.classList.add('dj-transit-bus-route');node.style.setProperty('background-color',BUS_CATEGORY_COLOR[category],'important');node.style.setProperty('color',category==='airport'||category==='circular'?'#20352c':'#fff','important');node.style.setProperty('opacity','1','important');node.style.setProperty('filter','none','important');node.setAttribute('aria-label',BUS_CATEGORY_LABEL[category]+' '+route);}
