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
  const close=el('button','dj-ai-close');close.innerHTML='<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M7 7l10 10M17 7 7 17"/></svg>';close.type='button';close.setAttribute('aria-label','AI 검색 닫기');
  const profileLabels={child:'어린이',teen:'청소년',adult:'일반 성인',senior:'어르신'};
  const profileDescriptions={child:'쉬운 단어로 친근하게',teen:'쉬운 설명과 필요한 용어',adult:'정확하고 간결하게',senior:'쉬운 생활 용어와 큰 글씨'};
  const profileKey='dongjak-safety-ai-explanation-v1';
  let profile='';try{const saved=localStorage.getItem(profileKey);if(Object.hasOwn(profileLabels,saved))profile=saved;}catch{}
  const profileButton=el('button','dj-ai-profile-button','설명 방식');profileButton.type='button';profileButton.setAttribute('aria-label','AI 설명 방식 변경');
  header.append(glyph,names,profileButton,close);
  const preferences=el('section','dj-ai-preferences');preferences.setAttribute('aria-label','AI 설명 방식 선택');
  preferences.append(el('h3','','어떤 설명이 편하신가요?'),el('p','','실제 나이는 묻지 않습니다. 언제든 설명 방식을 바꿀 수 있어요.'));
  const choices=el('div','dj-ai-profile-choices');choices.setAttribute('role','group');choices.setAttribute('aria-label','설명 방식');
  for(const [key,title] of Object.entries(profileLabels)){
    const choice=el('button','dj-ai-profile-choice');choice.type='button';choice.dataset.profile=key;
    choice.append(el('strong','',title),el('small','',profileDescriptions[key]));
    choice.setAttribute('aria-pressed',String(key===profile));choice.addEventListener('click',()=>chooseProfile(key));choices.append(choice);
  }
  preferences.append(choices);
  function chooseProfile(value){if(!Object.hasOwn(profileLabels,value))return;profile=value;try{localStorage.setItem(profileKey,value)}catch{};syncProfile();preferences.hidden=true;names.firstChild.focus({preventScroll:true});}
  function syncProfile(){modal.dataset.explanation=profile||'unset';profileButton.textContent=profileLabels[profile]||'설명 방식';preferences.hidden=!!profile;for(const b of choices.children)b.setAttribute('aria-pressed',String(b.dataset.profile===profile));input.disabled=!profile;submit.disabled=!profile||pending;}
  profileButton.addEventListener('click',()=>{preferences.hidden=!preferences.hidden;if(!preferences.hidden){const bounds=transcript.getBoundingClientRect();transcript.scrollTop+=preferences.getBoundingClientRect().top-bounds.top;}});
  const form=el('form','dj-ai-search-form');form.method='dialog';
  const label=el('label','dj-ai-search-label','보행안전정보 질문');
  const input=el('input','dj-ai-query');input.type='search';input.id='dj-ai-query';
  input.maxLength=220;input.required=true;
  input.autocomplete='off';input.placeholder='보행안전정보를 질문해 주세요';
  label.htmlFor=input.id;label.classList.add('dj-ai-visually-hidden');
  const submit=el('button','dj-ai-submit','전송');submit.type='submit';
  const bar=el('div','dj-ai-search-input-row');bar.append(input,submit);
  form.append(label,bar);
  const chips=el('div','dj-ai-examples');
  for(const value of ['상도1동 어린이 보호구역','리치타운 근처 사고다발지역','노인 보호구역 위치']){
    const b=el('button','dj-ai-example',value);b.type='button';
    b.addEventListener('click',()=>{input.value=value;void search(value);});
    chips.append(b);
  }
  const login=el('button','dj-ai-login','로그인·회원가입');login.type='button';login.hidden=true;
  let status=el('p','dj-ai-status','공식 보행안전 자료에서 검색합니다.');
  status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  let results=el('div','dj-ai-search-results');results.setAttribute('aria-live','polite');
  const foot=el('p','dj-ai-disclaimer','공식 자료 기반 · 질문마다 검색하며 안전등급·안전경로를 임의 평가하지 않습니다.');
  const transcript=el('div','dj-ai-transcript');transcript.setAttribute('role','log');transcript.setAttribute('aria-label','AI 대화');
  const welcome=el('div','dj-ai-welcome');welcome.append(el('p','dj-ai-welcome-text','안녕하세요. 공식 보행안전 자료에서 궁금한 정보를 찾아보세요.'),chips);
  transcript.append(preferences,welcome);
  const composer=el('div','dj-ai-composer');composer.append(form,foot);
  modal.dataset.djDialogFade='true';
  layout.append(header,login,transcript,composer);modal.append(layout);document.body.append(modal);
  const revealQuestion=node=>{const box=transcript.getBoundingClientRect(),r=node.getBoundingClientRect();transcript.scrollTop+=r.top-box.top-8;};
  let pending=false;let marker=null;let previousFocus=null;let abort=null;let closeTimer=0;
  let transportDismissedAt=0;
  const guardTransportDismiss=()=>{transportDismissedAt=Date.now();};
  document.addEventListener('dongjak:transport-dismiss-start',guardTransportDismiss);
  const reduce=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  function setStatus(message){status.textContent=message;}
  syncProfile();
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
    // Full-screen AI is not a bottom sheet. Never translate its native top layer
    // out of the changing keyboard viewport.
    if(reduce()){input.blur();window.DongjakWindowMotion?.cancel?.(modal);modal.close();return;}
    if(window.matchMedia?.('(max-width:699px)')?.matches){
      // The native dialog itself stays opaque and stationary. Fade only its
      // content, then complete the one existing close operation.
      input.blur();modal.classList.add('dj887-ai-closing');
      closeTimer=window.setTimeout(()=>{
        closeTimer=0;
        if(modal.open)modal.close();
        modal.classList.remove('dj887-ai-closing');
      },175);
      return;
    }
    modal.classList.add('dj887-ai-closing');
    // Explicit bounded completion: never depend on Safari animationend
    // to release a dialog that owns the whole viewport's hit targets.
    closeTimer=window.setTimeout(()=>{
      closeTimer=0;
      if(modal.open)modal.close();
      modal.classList.remove('dj887-ai-closing');
    },175);
  }
  function open(){
    // A transport X tap cannot become an AI open through the fading layer.
    // An ordinary AI click remains available after this short gesture guard.
    if(Date.now()-transportDismissedAt<750)return;
    if(closeTimer){clearTimeout(closeTimer);closeTimer=0;}
    modal.classList.remove('dj887-ai-closing');
    syncProfile();previousFocus=document.activeElement;
    q('#map-safety-close')?.click();
    q('#map-quick-search-close')?.click();
    q('#map-quick-search-query')?.blur();
    if(!modal.open){window.DongjakWindowLifecycle?.requestOpen('dj-ai-search-modal');modal.showModal();}
    // iOS Safari: focusing the query immediately opens the keyboard before
    // the bottom sheet is laid out. Focus the close button; the user taps the
    // query field when ready, at which point visualViewport handles the lift.
    if(window.matchMedia?.('(max-width:699px)')?.matches){
      names.firstChild.setAttribute('tabindex','-1');names.firstChild.focus({preventScroll:true});
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
    const category=item.category==='protection_zone'?(/노인\s*보호구역/.test(item.title||'')?'노인 보호구역':/어린이\s*보호구역/.test(item.title||'')?'어린이 보호구역':'보호구역'):'사고다발지역 통계';
    const kind=el('span','dj-ai-result-category',category);
    row.append(name,kind);
    const detail=el('p','',item.description||'');
    const source=el('p','dj-ai-source','자료: '+String(item.sourceName||'확인 필요')+(item.sourceDate?' · '+item.sourceDate:''));
    const limits=el('p','dj-ai-limits',item.limitations||'자료의 적용 범위를 확인해 주세요.');
    const evidence=el('details','dj-ai-evidence');evidence.append(el('summary','','자료 출처 및 유의사항'),detail,source,limits);
    card.append(row);
    if(item.category==='protection_zone')card.append(el('p','dj-ai-location-note','시설 대표 위치 · 실제 출입문은 확인되지 않았습니다.'));
    else card.append(el('p','dj-ai-location-note','과거 사고 통계 위치 · 현재 위험도와 다를 수 있습니다.'));
    card.append(evidence);
    if(item.longitude!=null&&item.latitude!=null&&Number.isFinite(Number(item.longitude))&&Number.isFinite(Number(item.latitude))){
      const go=el('button','dj-ai-map-btn','지도에서 위치 보기');go.type='button';
      go.addEventListener('click',()=>showResult(item));card.append(go);
    }
    return card;
  }
  async function search(raw){
    const query=String(raw||'').trim();
    if(query.length<2||pending)return;
    if(!profile){preferences.hidden=false;return;}
    pending=true;submit.disabled=true;input.value='';
    welcome.hidden=true;
    const user=el('div','dj-ai-user-message',query);
    const turn=el('section','dj-ai-assistant-message');turn.append(el('strong','dj-ai-speaker','AI 안전정보'));
    status=el('p','dj-ai-status','공식 자료를 확인하고 있습니다…');status.setAttribute('role','status');
    results=el('div','dj-ai-search-results');
    turn.append(status,results);transcript.append(user,turn);revealQuestion(user);
    try{
      const client=getActiveCloudClient();
      if(!client){setStatus('계정 연결 후 AI 검색을 이용할 수 있습니다.');login.hidden=false;return;}
      const {data:{session},error:sessionError}=await client.auth.getSession();
      if(sessionError||!session?.access_token){login.hidden=false;setStatus('로그인 후 AI 검색을 이용할 수 있습니다.');return;}
      login.hidden=true;
      // Each submitted question retains its own answer and verified sources.
      const response=await client.functions.invoke('dongjak-safety-ai',{body:{query,explanation:profile}});
      if(response.error){const code=Number(response.error?.context?.status||0);throw new Error(code===401?'로그인 정보가 만료됐습니다. 다시 로그인해 주세요.':'AI 서비스 응답을 확인할 수 없습니다.');}
      const data=response.data;
      if(!data||!Array.isArray(data.results))throw new Error('검색 응답 형식이 올바르지 않습니다.');
      setStatus(data.answer||'검색 결과가 없습니다.');
      for(const item of data.results)results.append(put(item));
      if(!data.results.length)results.append(el('p','dj-ai-empty','근거 자료가 없다고 안전한 지역이라는 뜻은 아닙니다.'));
      // Preserve the viewport at the submitted question; never jump to the last result.
    }catch(error){setStatus(error?.message||'검색에 실패했습니다. 다시 시도해 주세요.');}
    finally{pending=false;submit.disabled=!profile;}
  }
  // iOS may dispatch a delayed click to the element UNDER a dismissed
  // station/sheet window. The pointer must have started on the AI entry itself.
  let pointerStart=null;
  const capturePointer=event=>{pointerStart={target:event.target,at:Date.now()};};
  document.addEventListener('pointerdown',capturePointer,true);
  function onExplicitEntryClick(event){
    if(!event.isTrusted)return;
    if(event.detail!==0){
      if(!pointerStart || Date.now()-pointerStart.at>1400 ||
         !event.currentTarget.contains(pointerStart.target))return;
    }
    open();
  }
  const onOrbOpen=()=>open();
  document.addEventListener('dongjak:explicit-ai-open',onOrbOpen);
  trigger?.addEventListener('click',onExplicitEntryClick);
  quickEntry?.addEventListener('click',onExplicitEntryClick);
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
    document.removeEventListener('pointerdown',capturePointer,true);
    document.removeEventListener('dongjak:explicit-ai-open',onOrbOpen);
    document.removeEventListener('dongjak:transport-dismiss-start',guardTransportDismiss);
    trigger?.remove();quickEntry?.remove();modal.remove();marker?.remove();
  };
}
