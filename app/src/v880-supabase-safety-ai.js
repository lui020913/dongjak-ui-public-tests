/** Progressive enhancement: authenticated, evidence-only Supabase AI search.
 * Existing map, GIS layers, routing and login implementations are unchanged. */
import { getActiveCloudClient } from './v824-favorites-cloud.js';
import './v880-supabase-safety-ai.css';

const q=(selector,root=document)=>root.querySelector(selector);
function el(tag,cls,text){
  const n=document.createElement(tag);if(cls)n.className=cls;
  if(text!==undefined)n.textContent=String(text);return n;
}
export function installSupabaseSafetyAi({map,maplibregl,app}={}){
  const host=q('#map-safety-controls .map-safety-head');
  const headerForm=q('#map-quick-search .map-quick-search-form');
  if((!host&&!headerForm)||!map||!maplibregl||q('#dj-ai-search-modal'))return ()=>{};
  // The original trigger was placed only inside the closed safety menu.
  // A second compact entry inside the *existing* map search strip makes AI
  // discoverable on desktop and mobile without adding another floating rail.
  const trigger=host?el('button','dj-ai-search-entry','AI 안전정보 검색'):null;
  if(trigger){
    trigger.type='button';trigger.id='dj-ai-search-entry';
    trigger.setAttribute('aria-haspopup','dialog');
    trigger.setAttribute('aria-label','AI 보행안전정보 검색 열기');
    host.after(trigger);
  }
  const quickEntry=headerForm?el('button','dj887-ai-quick-entry','AI'):null;
  if(quickEntry){
    quickEntry.id='dj887-ai-quick-entry';quickEntry.type='button';
    quickEntry.title='AI 보행안전정보 검색';
    quickEntry.setAttribute('aria-label','AI 보행안전정보 검색 열기');
    quickEntry.setAttribute('aria-haspopup','dialog');
    const nativeSearch=headerForm.querySelector('.map-quick-search-submit');
    if(nativeSearch)nativeSearch.before(quickEntry);
    else headerForm.append(quickEntry);
  }
  const modal=el('dialog','dj-ai-search-modal');
  modal.id='dj-ai-search-modal';
  modal.setAttribute('aria-labelledby','dj-ai-dialog-title');
  const layout=el('div','dj-ai-search-body');
  const header=el('header','dj-ai-search-header');
  const names=el('div','dj-ai-search-names');
  names.append(el('h2','', 'AI 안전정보 검색'),el('p','', '공식 보행안전 자료 · 지도에서 근거 확인'));
  names.firstChild.id='dj-ai-dialog-title';
  const glyph=el('span','dj926-ai-glyph','✦');glyph.setAttribute('aria-hidden','true');
  const close=el('button','dj-ai-close','×');close.type='button';close.setAttribute('aria-label','AI 검색 닫기');
  header.append(glyph,names,close);
  const form=el('form','dj-ai-search-form');form.method='dialog';
  const label=el('label','dj-ai-search-label','보행안전정보 질문');
  const input=el('input','dj-ai-query');input.type='search';input.id='dj-ai-query';
  input.maxLength=220;input.required=true;
  input.autocomplete='off';input.placeholder='예: 상도1동 어린이 보호구역 알려줘';
  label.htmlFor=input.id;
  const submit=el('button','dj-ai-submit','검색');submit.type='submit';
  const bar=el('div','dj-ai-search-input-row');bar.append(input,submit);
  form.append(label,bar);
  const chips=el('div','dj-ai-examples');
  for(const value of ['상도1동 어린이 보호구역','리치타운 근처 사고다발지역','노인 보호구역 위치']){
    const b=el('button','dj-ai-example',value);b.type='button';
    b.addEventListener('click',()=>{input.value=value;void search(value);});
    chips.append(b);
  }
  const login=el('button','dj-ai-login','로그인·회원가입');login.type='button';login.hidden=true;
  const status=el('p','dj-ai-status','공식 보행안전 자료에서 검색합니다.');
  status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const results=el('div','dj-ai-search-results');results.setAttribute('aria-live','polite');
  const foot=el('p','dj-ai-disclaimer','사고다발지역은 개별 사고점이 아닙니다. 지도에 표시되는 위치는 원본 통계 또는 시설 대표점입니다. AI가 안전등급·경사도·안전한 길을 임의로 평가하지 않습니다.');
  layout.append(header,login,form,chips,status,results,foot);modal.append(layout);document.body.append(modal);
  let pending=false;let marker=null;let previousFocus=null;let abort=null;let closeTimer=0;
  const reduce=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  function setStatus(message){status.textContent=message;}
  login.addEventListener('click',()=>{
    exit();
    if(modal.open)modal.close();
    q('#bottom-nav [data-tab="mine"]')?.click();
    q('#mine-panel [data-dj834-action="profile"]')?.click();
    q('#mine-panel .dj824-account-toggle')?.scrollIntoView({block:'nearest'});
  });
  function exit(){
    if(modal.classList.contains('dj887-ai-closing'))return;
    abort?.abort();abort=null;
    if(closeTimer){clearTimeout(closeTimer);closeTimer=0;}
    if(!modal.open)return;
    if(reduce()){modal.close();return;}
    modal.classList.add('dj887-ai-closing');
    if(window.matchMedia?.('(max-width:699px)')?.matches&&window.DongjakWindowMotion){window.DongjakWindowMotion.close(modal,()=>{if(modal.open)modal.close();modal.classList.remove('dj887-ai-closing');});return;}
    // Explicit bounded completion: never depend on Safari animationend
    // to release a dialog that owns the whole viewport's hit targets.
    closeTimer=window.setTimeout(()=>{
      closeTimer=0;
      if(modal.open)modal.close();
      modal.classList.remove('dj887-ai-closing');
    },175);
  }
  function open(){
    if(closeTimer){clearTimeout(closeTimer);closeTimer=0;}
    modal.classList.remove('dj887-ai-closing');
    previousFocus=document.activeElement;
    q('#map-safety-close')?.click();
    q('#map-quick-search-close')?.click();
    q('#map-quick-search-query')?.blur();
    if(!modal.open){window.DongjakWindowLifecycle?.requestOpen('dj-ai-search-modal');modal.showModal();if(window.matchMedia?.('(max-width:699px)')?.matches)window.DongjakWindowMotion?.open(modal);}
    // iOS Safari: focusing the query immediately opens the keyboard before
    // the bottom sheet is laid out. Focus the close button; the user taps the
    // query field when ready, at which point visualViewport handles the lift.
    if(window.matchMedia?.('(max-width:699px)')?.matches){
      close.focus({preventScroll:true});
    }else{
      input.focus({preventScroll:true});
    }
    const client=getActiveCloudClient();
    if(!client){login.hidden=false;return;}
    void client.auth.getSession().then(({data,error})=>{
      if(modal.open)login.hidden=Boolean(!error&&data?.session?.access_token);
    }).catch(()=>{if(modal.open)login.hidden=false;});
  }
  function showResult(item){
    if(!Number.isFinite(Number(item.longitude))||!Number.isFinite(Number(item.latitude)))return;
    const lng=Number(item.longitude),lat=Number(item.latitude);
    if(lng<126.6||lng>127.3||lat<37.2||lat>37.8)return;
    exit();
    const tab=q('.nav-tab[data-tab="map"]');if(app?.dataset?.tab!=='map')tab?.click();
    try{marker?.remove();marker=new maplibregl.Marker({color:'#2573a2'})
      .setLngLat([lng,lat]).addTo(map);
      map.flyTo({center:[lng,lat],zoom:Math.max(15.5,map.getZoom()),essential:true,duration:600});
    }catch{setStatus('지도 위치 표시를 지원하지 않는 환경입니다.');}
  }
  function put(item){
    const card=el('article','dj-ai-result');
    const row=el('div','dj-ai-result-top');
    const name=el('strong','',item.title||'시설 정보');
    const kind=el('span','dj-ai-result-category',item.category==='protection_zone'?'보호구역':'사고다발지역 통계');
    row.append(name,kind);
    const detail=el('p','',item.description||'');
    const source=el('p','dj-ai-source','자료: '+String(item.sourceName||'확인 필요')+(item.sourceDate?' · '+item.sourceDate:''));
    const limits=el('p','dj-ai-limits',item.limitations||'자료의 적용 범위를 확인해 주세요.');
    card.append(row,detail,source,limits);
    if(Number.isFinite(Number(item.longitude))&&Number.isFinite(Number(item.latitude))){
      const go=el('button','dj-ai-map-btn','지도에서 위치 보기');go.type='button';
      go.addEventListener('click',()=>showResult(item));card.append(go);
    }
    return card;
  }
  async function search(raw){
    const query=String(raw||'').trim();
    if(query.length<2){setStatus('검색어를 2자 이상 입력해 주세요.');return;}
    if(pending)return;
    const client=getActiveCloudClient();
    if(!client){setStatus('Supabase 연결이 필요합니다. 내 정보에서 계정을 연결해 주세요.');return;}
    const {data:{session},error:sessionError}=await client.auth.getSession();
    if(sessionError||!session?.access_token){login.hidden=false;setStatus('로그인 후 AI 검색을 이용할 수 있습니다.');return;}
    pending=true;submit.disabled=true;results.replaceChildren();setStatus('검증된 보행안전 근거를 검색하고 있습니다…');
    try{
      const response=await client.functions.invoke('dongjak-safety-ai',{body:{query}});
      if(response.error){
        const code=Number(response.error?.context?.status||0);
        if(code===401)throw new Error('로그인 정보가 만료됐습니다. 다시 로그인해 주세요.');
        throw new Error('Supabase AI 서비스 응답을 확인할 수 없습니다.');
      }
      const data=response.data;
      if(!data||!Array.isArray(data.results))throw new Error('검색 응답 형식이 올바르지 않습니다.');
      setStatus(data.answer||'검색 결과가 없습니다.');
      for(const item of data.results)results.append(put(item));
      if(data.results.length===0)results.append(el('p','dj-ai-empty','근거 자료를 찾지 못했습니다. 검색 결과가 없다고 안전한 지역이라는 뜻은 아닙니다.'));
    }catch(error){setStatus(error?.message||'검색에 실패했습니다. 다시 시도해 주세요.');}
    finally{pending=false;submit.disabled=false;}
  }
  trigger?.addEventListener('click',open);
  quickEntry?.addEventListener('click',open);
  close.addEventListener('click',exit);
  form.addEventListener('submit',event=>{event.preventDefault();void search(input.value);});
  modal.addEventListener('cancel',event=>{event.preventDefault();exit();});
  modal.addEventListener('click',event=>{if(event.target===modal)exit();});
  modal.addEventListener('close',()=>{
    // HTMLDialogElement's close event can be queued. Never steal focus from
    // the native map search if the visitor has already tapped it while the
    // AI dialog is finishing its 175ms fade. This also preserves keyboard
    // accessibility: restore the invoking button only if focus is unowned.
    const active=document.activeElement;
    if(!active||active===document.body||active===document.documentElement||
       active===modal||modal.contains(active)){
      if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});
    }
  });
  return ()=>{
    if(closeTimer)clearTimeout(closeTimer);
    trigger?.remove();quickEntry?.remove();modal.remove();marker?.remove();
  };
}
