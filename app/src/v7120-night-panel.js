/** v7.12.0 – night analysis progressive disclosure; original inputs remain in DOM. */
export function installNightPanelSections(doc=document){
  const app=doc.getElementById('app');
  const panel=doc.getElementById('night-visibility-float');
  const controls=doc.getElementById('night-visibility-controls');
  if(!app||!panel||!controls)return ()=>{};
  const head=panel.querySelector('.night-visibility-float-heading');
  head?.querySelector('strong')?.replaceChildren(doc.createTextNode('야간 보행 시야'));
  const build=()=>{
    if(controls.dataset.djGrouped==='true')return;
    // Do not change the sequence or IDs of event-bearing elements; groups are
    // made only once, after the original controls have been mounted.
    const exclude=doc.getElementById('night-visibility-exclude-major');
    if(!exclude || !controls.contains(exclude))return;
    const children=[...controls.children];
    const advanced=doc.createElement('details');advanced.className='dj-night-group dj-night-group-options';
    const summary=doc.createElement('summary');summary.textContent='표시 항목 · 세부 설정';advanced.append(summary);
    const top=doc.createElement('details');top.className='dj-night-group dj-night-group-results';
    const topSummary=doc.createElement('summary');topSummary.textContent='분석 수치 · 미도달 구간';top.append(topSummary);
    const refs=new Set(['night-visibility-exclude-major','night-visibility-show-alley','night-visibility-show-path']);
    const resultIds=new Set(['night-visibility-stats','night-visibility-top','night-occlusion-details']);
    for(const node of children){
      if(refs.has(node.querySelector?.('input')?.id)||node.classList.contains('night-visibility-legend')||node.classList.contains('night-coverage-legend')||node.classList.contains('night-result-legend')) advanced.append(node);
      else if(resultIds.has(node.id)||node.classList.contains('night-visibility-explanation'))top.append(node);
    }
    controls.append(advanced,top);
    controls.dataset.djGrouped='true';
  };
  const observer=new MutationObserver(build);
  observer.observe(controls,{childList:true,subtree:false});build();
  return ()=>observer.disconnect();
}
if(typeof document!=='undefined'){
  const boot=()=>installNightPanelSections();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
}
