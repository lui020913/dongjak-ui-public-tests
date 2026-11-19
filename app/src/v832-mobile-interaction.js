/** v8.3.2: presentation-only coordination for location boundary, mobile panels
 * and sign-in prompt. Navigation/transport controllers remain the owners of data. */
export function installMobile832(doc=document,win=window){
  const app=doc.getElementById('app');
  if(!app||app.dataset.dj832Installed==='true')return ()=>{};
  app.dataset.dj832Installed='true';
  const nav=doc.getElementById('bottom-nav');
  const search=doc.querySelector('.topbar');
  const prompt=doc.getElementById('dj-transit-signin-prompt');
  const transport=doc.getElementById('transport-sheet');
  const modal=doc.createElement('section');
  modal.id='dj832-dongjak-boundary';modal.hidden=true;modal.setAttribute('role','alertdialog');
  modal.setAttribute('aria-modal','true');modal.setAttribute('aria-labelledby','dj832-boundary-title');
  modal.innerHTML=`<div class="dj832-boundary-backdrop"></div><div class="dj832-boundary-card">
    <button class="dj832-boundary-x" type="button" aria-label="안내 닫기">×</button>
    <div class="dj832-boundary-icon" aria-hidden="true">⌖</div>
    <h3 id="dj832-boundary-title">동작구 내 영역을 선택해주세요</h3>
    <p id="dj832-boundary-body">동작구 밖의 장소는 출발지·도착지·경유지로 지정할 수 없습니다.</p>
    <button class="dj832-boundary-confirm" type="button">확인</button>
  </div>`;
  app.append(modal);
  const close=()=>{modal.hidden=true;};
  const onDenied=e=>{
    const msg=modal.querySelector('#dj832-boundary-body');
    msg.textContent=e?.detail?.unavailable?'동작구 경계정보를 불러오지 못했습니다. 경계가 준비된 뒤 동작구 내 영역을 다시 선택해주세요.':'동작구 밖은 길찾기 대상에 포함되지 않습니다. 동작구 내 영역을 다시 선택해주세요.';
    modal.hidden=false;
    modal.querySelector('.dj832-boundary-confirm')?.focus({preventScroll:true});
  };
  const onKey=e=>{if(e.key==='Escape'&&!modal.hidden)close();};
  modal.querySelector('.dj832-boundary-x')?.addEventListener('click',close);
  modal.querySelector('.dj832-boundary-confirm')?.addEventListener('click',close);
  modal.querySelector('.dj832-boundary-backdrop')?.addEventListener('click',close);
  win.addEventListener('dongjak:route-boundary-denied',onDenied);
  doc.addEventListener('keydown',onKey);
  let pending=false;
  function sync(){
    pending=false;
    if(win.innerWidth>699)return;
    const a=app.getBoundingClientRect();
    const n=nav?.getBoundingClientRect();
    const h=search?.getBoundingClientRect();
    if(n?.height){
      app.style.setProperty('--dj832-nav-inset',Math.max(0,a.bottom-n.top+8)+'px');
      prompt?.style.setProperty('--dj832-signin-nav-offset',Math.max(0,win.innerHeight-n.top+9)+'px');
    }
    if(h?.height)app.style.setProperty('--dj832-search-edge',Math.max(0,h.bottom-a.top+7)+'px');
    // A real visible scale lives above the selected bottom panel rather than
    // underneath it. The scale dock itself computes top/left and collision.
  }
  function schedule(){if(pending)return;pending=true;win.requestAnimationFrame(sync);}
  const resize=()=>schedule();
  win.addEventListener('resize',resize,{passive:true});
  win.visualViewport?.addEventListener('resize',resize,{passive:true});
  const ro=typeof ResizeObserver!=='undefined'?new ResizeObserver(schedule):null;
  for(const node of [nav,search,transport])if(node)ro?.observe(node);
  schedule();
  return ()=>{modal.remove();win.removeEventListener('dongjak:route-boundary-denied',onDenied);doc.removeEventListener('keydown',onKey);win.removeEventListener('resize',resize);win.visualViewport?.removeEventListener('resize',resize);ro?.disconnect();delete app.dataset.dj832Installed;};
}
if(typeof document!=='undefined'&&typeof window!=='undefined'){
  const run=()=>installMobile832(document,window);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
}
