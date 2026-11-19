// Pure helpers: Web Speech API exposes voice names and languages, not a gender field.
export const VOICE_PREFERENCE_KEY='dongjak-nav-tts-voice-v1';
const MODES=new Set(['auto','female','male','all']);
const FEMALE_NAMES=/(sunhi|sun-hi|heami|haemi|ji[ -]?min|seo[ -]?hyeon|seohyun|yuna|yu-na|sora|so-ra|seoyeon|서혜연|서현|지민|유나|소라|선희|혜미|해미)/i;
const MALE_NAMES=/(in[ -]?joon|in[ -]?jun|hyun[ -]?su|hyunsu|현수|인준)/i;

export function isKoreanSpeechVoice(voice){return /^ko(?:[-_]|$)/i.test(String(voice?.lang||''));}
export function voiceGenderHint(voice){
  const name=String(voice?.name||'');
  if(MALE_NAMES.test(name))return 'male';
  if(FEMALE_NAMES.test(name))return 'female';
  return 'unknown';
}
export function voiceIdentity(voice){return [voice?.voiceURI||'',voice?.name||'',voice?.lang||''].join('\u0001');}
export function filterKoreanVoices(voices,mode='all'){
  const korean=Array.from(voices||[]).filter(isKoreanSpeechVoice);
  if(mode==='male'||mode==='female')return korean.filter(v=>voiceGenderHint(v)===mode);
  return korean;
}
export function readVoicePreference(raw){
  try{
    const value=JSON.parse(raw);
    if(value&&MODES.has(value.mode))return {mode:value.mode,voiceURI:String(value.voiceURI||''),name:String(value.name||''),lang:String(value.lang||'')};
  }catch{}
  return {mode:'auto',voiceURI:'',name:'',lang:''};
}
