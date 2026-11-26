import {TEAM_FACTORS,CURRENT_SIX_FACTORS} from './pri-data.mjs';
import {normalizeRoutePriFactors} from './pri-route-exposure.mjs';
import './route-pri-preferences.css';

// One native top-layer dialog, shared by the route editor and map result.
// The draft never mutates active route scoring until the user presses 적용.
export function installRoutePriPreferences({doc=document,onApply}={}){
  const existing=doc.getElementById('dj-route-pri-preferences-dialog');
  if(existing)throw new Error('PRI preferences already installed');
  let selected=[...CURRENT_SIX_FACTORS];
  const dialog=doc.createElement('dialog');
  dialog.id='dj-route-pri-preferences-dialog';
  dialog.setAttribute('aria-labelledby','dj-route-pri-title');
  dialog.innerHTML='<div class="dj-route-pri-card"><header><div><h2 id="dj-route-pri-title">PRI 평가 항목</h2><p>원하는 보행안전 지표만 선택해 경로 후보를 비교하세요.</p></div><button type="button" data-pri-close aria-label="닫기">×</button></header><div class="dj-route-pri-body"><div class="dj-route-pri-summary"><span data-pri-count aria-live="polite"></span><button type="button" data-pri-all>모두 선택</button></div><div class="dj-route-pri-factors" role="group" aria-label="보행안전 평가 지표"></div><p class="dj-route-pri-note">상도1동 조사 자료에 한해 기존 도보 경로 후보를 비교합니다. 선택 지표의 자료가 부족한 구간은 미평가로 표시하며, 안전한 통행을 보장하지 않습니다.</p></div><footer><button type="button" data-pri-cancel>취소</button><button type="button" data-pri-apply>적용</button></footer></div>';
  const list=dialog.querySelector('.dj-route-pri-factors');
  for(const factor of TEAM_FACTORS){
    const label=doc.createElement('label'),input=doc.createElement('input'),name=doc.createElement('span');
    input.type='checkbox';input.value=factor.id;name.textContent=factor.label;
    label.append(input,name);list.append(label);
  }
  const inputs=[...list.querySelectorAll('input')],apply=dialog.querySelector('[data-pri-apply]');
  const draft=()=>inputs.filter(input=>input.checked).map(input=>input.value);
  const sync=()=>{
    const count=draft().length;
    dialog.querySelector('[data-pri-count]').textContent=count+' / '+inputs.length+'개 선택';
    apply.disabled=count===0;
    dialog.querySelector('[data-pri-all]').disabled=count===inputs.length;
  };
  const close=()=>{if(dialog.open)dialog.close();};
  const open=()=>{
    if(dialog.open)return;
    for(const input of inputs)input.checked=selected.includes(input.value);
    sync();
    dialog.showModal();
  };
  list.addEventListener('change',sync);
  dialog.querySelector('[data-pri-all]').addEventListener('click',()=>{for(const input of inputs)input.checked=true;sync();});
  dialog.querySelector('[data-pri-close]').addEventListener('click',close);
  dialog.querySelector('[data-pri-cancel]').addEventListener('click',close);
  dialog.addEventListener('click',event=>{if(event.target===dialog)close();});
  apply.addEventListener('click',()=>{
    if(apply.disabled)return;
    const next=normalizeRoutePriFactors(draft());
    const changed=next.join(',')!==selected.join(',');
    selected=next;close();
    if(changed)onApply?.([...selected]);
  });
  doc.body.append(dialog);
  return {open,close,getSelected:()=>[...selected]};
}
