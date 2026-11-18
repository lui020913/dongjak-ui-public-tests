/** Comparative presentation for *actual* locally calculated pedestrian routes.
 * Does not invent a third geometry, an accessibility score, or a safety ranking.
 */
export function routeComparisonItems(routes){
  return ['standard','gentle'].flatMap(id=>{
    const r=routes?.[id]; if(!r?.coords?.length)return [];
    return [{id,label:id==='standard'?'일반 보행':'경사 회피 우선',
      meters:Number(r.kilometers)*1000,minutes:Math.ceil(Number(r.seconds)/60),
      ascent:Number.isFinite(Number(r.slopeAscentM))?Number(r.slopeAscentM):null,
      uncertain:Number.isFinite(Number(r.slopeUncertainM))?Number(r.slopeUncertainM):null,
      source:r.source||'unverified',coords:r.coords}];
  });
}
export function sameRoute(a,b){
  if(!a?.coords||!b?.coords)return false;
  return JSON.stringify(a.coords)===JSON.stringify(b.coords);
}
export function metersLabel(value){return !Number.isFinite(value)?'미확인':value<1000?`${Math.round(value)}m`:`${(value/1000).toFixed(2)}km`;}
export function routePointProximity(coords, points,threshold=60){
  if(!Array.isArray(coords)||coords.length<2||!Array.isArray(points))return null;
  const out=[];
  for(const point of points){
    if(!Array.isArray(point)||point.length!==2||!point.every(Number.isFinite))continue;
    let nearest=Infinity;
    for(let i=1;i<coords.length;i++){
      const a=coords[i-1],b=coords[i];
      const scaleX=88500, scaleY=111200;
      const ax=(a[0]-point[0])*scaleX,ay=(a[1]-point[1])*scaleY;
      const vx=(b[0]-a[0])*scaleX,vy=(b[1]-a[1])*scaleY;
      const t=Math.max(0,Math.min(1,(ax*-vx+ay*-vy)/Math.max(1e-8,vx*vx+vy*vy)));
      nearest=Math.min(nearest,Math.hypot(ax+vx*t,ay+vy*t));
      if(nearest<=threshold)break;
    }
    if(nearest<=threshold)out.push(point);
  }
  return out.length;
}
function htmlEscape(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
export function initRouteComparison(doc=document,win=window){
  const variants=doc.getElementById('route-variants');
  if(!variants)return ()=>{};
  const root=doc.createElement('section');root.id='dj804-route-compare';root.className='dj804-route-compare';root.hidden=true;
  root.setAttribute('aria-label','보행 경로별 거리와 경사 비교');
  // Real route metrics belong to the map result card, not the editor sheet.
  const mapCard=doc.getElementById('route-map-card');
  (mapCard||variants.parentElement).appendChild(root);
  let latest=null,seq=0,accidentPts=null;
  const onClear=()=>{++seq;latest=null;root.hidden=true;root.replaceChildren();};
  const onCalculate=()=>{onClear();};
  doc.getElementById('route-clear')?.addEventListener('click',onClear);
  doc.getElementById('route-calc')?.addEventListener('click',onCalculate);
  const onVariants=async event=>{
    const run=++seq;latest=event.detail;root.hidden=true;
    if(run!==seq)return;
    const items=routeComparisonItems(latest);
    if(!items.length)return;
    const duplicate=items.length===2&&sameRoute(latest.standard,latest.gentle);
    const cards=items.map(item=>{
      const ascent=item.ascent!==null?`추정 상승 ${Math.round(item.ascent)}m`:'상승량 자료 없음';
      const uncertain=item.uncertain!==null?` · 고도 미확인 ${Math.round(item.uncertain)}m`:'';
      return `<button type="button" class="dj804-compare-card" data-compare-select="${item.id}" aria-label="${item.label} 경로를 지도에 표시">
        <span class="dj804-compare-title">${htmlEscape(item.label)}<span class="dj804-compare-action">지도에서 보기</span></span>
        <span class="dj804-compare-metrics"><b>${metersLabel(item.meters)}</b><b>약 ${item.minutes}분</b></span>
        <span class="dj804-compare-meta">${ascent}${uncertain}</span>
      </button>`;
    }).join('');
    root.innerHTML=`<header><strong>경로 한눈에 비교</strong><small>서울시 보행 링크 기반 · 실제 계산 결과</small></header><div class="dj804-compare-grid">${cards}</div>
      <p class="dj804-compare-note">${duplicate?'두 조건에서 동일한 경로가 계산됐습니다. ':''}경사도는 지형 추정값이며 보도·계단·현재 통제 여부는 검증되지 않았습니다.</p>`;
    root.hidden=false;
    sync();
  };
  const sync=()=>root.querySelectorAll('[data-compare-select]').forEach(button=>{
    const real=doc.querySelector(`#route-variants [data-route-variant="${button.dataset.compareSelect}"]`);
    button.setAttribute('aria-pressed',String(real?.getAttribute('aria-pressed')==='true'));
  });
  const onClick=event=>{
    const button=event.target.closest?.('[data-compare-select]');if(!button)return;
    const real=doc.querySelector(`#route-variants [data-route-variant="${button.dataset.compareSelect}"]`);
    if(real&&!real.disabled){real.click();sync();}
  };
  root.addEventListener('click',onClick);
  variants.addEventListener('click',sync);
  win.addEventListener('dongjak:route-variants-ready',onVariants);
  return ()=>{root.remove();doc.getElementById('route-clear')?.removeEventListener('click',onClear);doc.getElementById('route-calc')?.removeEventListener('click',onCalculate);variants.removeEventListener('click',sync);win.removeEventListener('dongjak:route-variants-ready',onVariants);};
}
