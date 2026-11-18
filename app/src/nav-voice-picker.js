// Browser SpeechSynthesis walking navigator voice picker.
import './nav-voice-picker.css';
import {VOICE_PREFERENCE_KEY,isKoreanSpeechVoice,voiceGenderHint,voiceIdentity,filterKoreanVoices,readVoicePreference} from './nav-voice-logic.js';
let preference={mode:'auto',voiceURI:'',name:'',lang:''};
function voices(){
  try{return window.speechSynthesis?.getVoices?.()||[];}catch{return [];}
}
function resolve(){
  if(preference.mode==='auto')return null;
  const choices=filterKoreanVoices(voices(),preference.mode);
  return choices.find(v=>v.voiceURI===preference.voiceURI&&v.name===preference.name&&v.lang===preference.lang)
    ||choices.find(v=>v.voiceURI===preference.voiceURI&&v.lang===preference.lang)
    ||choices[0]||null;
}
export function applySelectedNavVoice(message){
  if(!message)return false;
  const chosen=resolve();
  if(chosen){message.voice=chosen;message.lang=chosen.lang||'ko-KR';return true;}
  message.lang='ko-KR';return false;
}
function persist(){
  try{localStorage.setItem(VOICE_PREFERENCE_KEY,JSON.stringify(preference));}catch{}
}
export function installNavVoicePicker({onChange=()=>{}}={}){
  const panel=document.getElementById('nav-live-card');
  if(!panel||panel.querySelector('.dj816-voice-box'))return;
  try{preference=readVoicePreference(localStorage.getItem(VOICE_PREFERENCE_KEY));}catch{}
  const element=document.createElement('details');
  element.className='dj816-voice-box';
  element.innerHTML=`
    <summary><span aria-hidden="true">◖))</span> 안내 목소리 선택 <span class="dj816-voice-current">자동</span></summary>
    <div class="dj816-voice-content">
      <label for="dj816-voice-mode">음성 종류</label>
      <select id="dj816-voice-mode" aria-label="안내 목소리 종류">
        <option value="auto">기기 기본 음성</option>
        <option value="female">여성 목소리</option>
        <option value="male">남성 목소리</option>
        <option value="all">전체 한국어 목소리</option>
      </select>
      <label for="dj816-voice-choice">설치된 한국어 목소리</label>
      <select id="dj816-voice-choice" aria-label="안내에 사용할 목소리"></select>
      <div class="dj816-voice-actions"><button id="dj816-voice-preview" type="button">음성 미리 듣기</button></div>
      <p class="dj816-voice-status" role="status" aria-live="polite"></p>
      <p class="dj816-voice-note">음성 종류는 목소리 이름으로 추정합니다. 기기마다 제공되는 목소리가 다르며, 목록에 없으면 ‘전체 한국어 목소리’에서 직접 듣고 선택하세요.</p>
    </div>`;
  const controls=panel.querySelector('.nav-live-options');
  if(controls)controls.insertAdjacentElement('afterend',element);
  else panel.append(element);
  const mode=element.querySelector('#dj816-voice-mode');
  const select=element.querySelector('#dj816-voice-choice');
  const preview=element.querySelector('#dj816-voice-preview');
  const status=element.querySelector('.dj816-voice-status');
  const current=element.querySelector('.dj816-voice-current');
  mode.value=preference.mode;
  function display(){
    const list=filterKoreanVoices(voices(),mode.value);
    select.replaceChildren();
    const selected=resolve();
    if(mode.value!=='auto')list.forEach((voice)=>{
      const option=document.createElement('option');
      option.value=voiceIdentity(voice);
      option.textContent=`${voice.name}${voice.localService?' · 기기':' · 브라우저'}`;
      select.append(option);
    });
    if(selected)select.value=voiceIdentity(selected);
    if(mode.value==='auto'){
      const option=document.createElement('option');option.value='';option.textContent='기기 기본 한국어 음성';select.append(option);
    }
    select.disabled=mode.value==='auto'||!list.length;
    preview.disabled=mode.value!=='auto'&&!list.length;
    current.textContent=({auto:'자동',female:'여성',male:'남성',all:'직접 선택'})[mode.value]||'자동';
    if(!window.speechSynthesis||!window.SpeechSynthesisUtterance){status.textContent='이 브라우저에서는 음성 합성을 지원하지 않습니다.';preview.disabled=true;return;}
    if(mode.value==='auto'){status.textContent='현재 기기의 한국어 기본 목소리로 안내합니다.';return;}
    if(!list.length){status.textContent=mode.value==='all'?'한국어 목소리를 불러오지 못했습니다. 기기 TTS 설정을 확인해 주세요.':'이 기기에서 해당 종류로 식별되는 한국어 목소리가 없습니다. 안내에서는 기본 음성을 사용합니다. 전체 한국어 목소리도 확인해 주세요.';return;}
    status.textContent=`사용 가능한 ${mode.value==='female'?'여성':mode.value==='male'?'남성':'한국어'} 목소리 ${list.length}개 · 선택한 목소리로 안내합니다.`;
  }
  mode.addEventListener('change',()=>{
    preference={mode:mode.value,voiceURI:'',name:'',lang:''};
    const first=filterKoreanVoices(voices(),mode.value)[0];
    if(first)Object.assign(preference,{voiceURI:first.voiceURI||'',name:first.name||'',lang:first.lang||''});
    persist();display();onChange();
    try{window.speechSynthesis?.cancel?.();}catch{}
  });
  select.addEventListener('change',()=>{
    const voice=filterKoreanVoices(voices(),mode.value).find(v=>voiceIdentity(v)===select.value);
    if(!voice)return;
    preference={mode:mode.value,voiceURI:voice.voiceURI||'',name:voice.name||'',lang:voice.lang||''};
    persist();display();onChange();
    try{window.speechSynthesis?.cancel?.();}catch{}
  });
  preview.addEventListener('click',()=>{
    if(preview.disabled)return;
    try{
      const utterance=new window.SpeechSynthesisUtterance('안녕하세요. 동작구 보행 안내입니다. 100미터 앞에서 우회전하세요.');
      utterance.rate=1.03;utterance.volume=0.92;applySelectedNavVoice(utterance);
      if(mode.value!=='auto'&&!utterance.voice){status.textContent='선택한 음성을 이용할 수 없습니다. 전체 한국어 목소리에서 다시 선택해 주세요.';return;}
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
      status.textContent=`${utterance.voice?.name||'기기 기본 음성'} 미리 듣는 중…`;
      utterance.onerror=()=>{status.textContent='음성 재생에 실패했습니다. 기기 미디어 음량과 TTS 설정을 확인하세요.';};
    }catch{status.textContent='음성 재생에 실패했습니다. 이 기기의 TTS 지원 상태를 확인하세요.';}
  });
  const refresh=()=>display();
  window.speechSynthesis?.addEventListener?.('voiceschanged',refresh);
  // Safari sometimes exposes voices only after the picker receives focus.
  element.addEventListener('toggle',()=>{if(element.open)display();});
  display();
}
