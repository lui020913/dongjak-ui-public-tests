/** GPS quality and optional vibration cues. No screen-wake toggle by design. */
export function gpsAccuracyStatus(meters){
  if(!Number.isFinite(meters))return {label:'GPS 대기',level:'idle'};
  if(meters<=20)return {label:'GPS 신호 양호',level:'good'};
  if(meters<=40)return {label:'GPS 위치 주의',level:'caution'};
  return {label:'GPS 오차 큼 · 안내 확인',level:'poor'};
}
export function hapticCue(instruction,accuracy){
  if(!instruction||!Number.isFinite(accuracy)||accuracy>40)return '';
  const turn=/우회전|좌회전|유턴|계단|에스컬레이터|출구|진입|회전교차로/.exec(instruction)?.[0];
  if(!turn)return '';
  const distance=/^(?:약\s*)?(\d+)\s*m\s*앞/.exec(instruction);
  if(!distance)return `turn:${turn}:now`;
  const meters=Number(distance[1]);
  if(meters<=35)return `turn:${turn}:30`;
  if(meters<=110)return `turn:${turn}:100`;
  return '';
}
export function initNavigationExtras(doc=document,win=window){
  const card=doc.getElementById('nav-live-card');
  const options=card?.querySelector('.nav-live-options');
  if(!options)return ()=>{};
  const vib=doc.createElement('button');vib.type='button';vib.id='dj804-nav-haptic';
  vib.textContent='진동 꺼짐';vib.setAttribute('aria-pressed','false');
  options.append(vib);
  const status=doc.createElement('div');status.className='dj804-nav-extra-options';
  status.innerHTML='<span id="dj804-nav-gps-quality" class="dj804-nav-gps-quality" role="status">GPS 연결 대기</span>';
  options.insertAdjacentElement('afterend',status);
  const quality=status.querySelector('#dj804-nav-gps-quality');
  const vibrate=win.navigator?.vibrate?.bind(win.navigator);
  let haptics=false,lastCue='',lastCueAt=0,inSession=false,closed=false;
  const guiding=()=>!card.hidden&&doc.getElementById('app')?.classList.contains('route-guiding');
  const update=()=>{
    if(closed)return;
    const active=guiding();
    if(active&&!inSession){inSession=true;lastCue='';lastCueAt=0;}
    if(!active&&inSession){inSession=false;lastCue='';}
    const raw=doc.getElementById('nav-accuracy')?.textContent||'';
    const found=(raw.match(/(?:오차|정확도)\s*(?:약)?\s*(\d+)/)||[])[1];
    const accuracy=found===undefined?NaN:Number(found);
    const state=gpsAccuracyStatus(accuracy);
    quality.textContent=active?state.label:'안내 시작 전 · GPS 대기';
    quality.dataset.level=active?state.level:'idle';
    if(!active||!haptics||!vibrate)return;
    const instruction=doc.getElementById('nav-instruction')?.textContent?.trim()||'';
    const cue=hapticCue(instruction,accuracy);
    const now=Date.now();
    if(cue && cue!==lastCue && now-lastCueAt>5000){
      lastCue=cue;lastCueAt=now;
      try{vibrate(cue.endsWith(':now')?[160,85,160]:[110]);}catch{}
    }
  };
  const onVibrate=()=>{
    if(!vibrate){vib.textContent='진동 미지원';vib.disabled=true;return;}
    haptics=!haptics;
    vib.setAttribute('aria-pressed',String(haptics));
    vib.textContent=haptics?'진동 켜짐':'진동 꺼짐';
    if(haptics){
      // Some platforms expose the function but reject a vibration request.
      try{if(vibrate(30)===false){haptics=false;vib.disabled=true;vib.setAttribute('aria-pressed','false');vib.textContent='진동 미지원';}}catch{haptics=false;vib.setAttribute('aria-pressed','false');vib.textContent='진동 미지원';}
    }else try{vibrate(0);}catch{}
  };
  const observer=new MutationObserver(update);
  for(const id of ['nav-live-card','nav-accuracy','nav-instruction']){
    const el=doc.getElementById(id);
    if(el)observer.observe(el,id==='nav-live-card'?{attributes:true,attributeFilter:['hidden']}:{childList:true,characterData:true,subtree:true});
  }
  vib.addEventListener('click',onVibrate);
  update();
  return ()=>{closed=true;observer.disconnect();vib.removeEventListener('click',onVibrate);if(haptics)try{vibrate?.(0);}catch{};vib.remove();status.remove();};
}
