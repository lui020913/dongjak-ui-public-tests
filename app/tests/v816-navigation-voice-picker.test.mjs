import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isKoreanSpeechVoice,voiceGenderHint,voiceIdentity,filterKoreanVoices,readVoicePreference} from '../src/nav-voice-logic.js';
const load = name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const voices=[
  {name:'Microsoft InJoon - Korean (Korea)',lang:'ko-KR',voiceURI:'male-ko'},
  {name:'Microsoft SunHi - Korean (Korea)',lang:'ko-KR',voiceURI:'female-ko'},
  {name:'Google 한국어',lang:'ko_KR',voiceURI:'unknown-ko'},
  {name:'Microsoft David',lang:'en-US',voiceURI:'en'}
];
test('TTS options use Korean voices only and do not assign unverified gender',()=>{
  assert.equal(isKoreanSpeechVoice(voices[2]),true);
  assert.equal(isKoreanSpeechVoice(voices[3]),false);
  assert.equal(voiceGenderHint(voices[0]),'male');
  assert.equal(voiceGenderHint(voices[1]),'female');
  assert.equal(voiceGenderHint(voices[2]),'unknown');
  assert.deepEqual(filterKoreanVoices(voices,'male'),[voices[0]]);
  assert.deepEqual(filterKoreanVoices(voices,'female'),[voices[1]]);
  assert.equal(filterKoreanVoices(voices,'all').length,3);
});
test('voice IDs distinguish language, name and URI across engines',()=>{
  assert.notEqual(voiceIdentity(voices[0]),voiceIdentity({...voices[0],lang:'en-US'}));
  assert.notEqual(voiceIdentity(voices[0]),voiceIdentity(voices[1]));
});
test('stored preferences reject unknown modes and retain voice selection across sessions',()=>{
  assert.equal(readVoicePreference('invalid').mode,'auto');
  assert.equal(readVoicePreference('{"mode":"nope"}').mode,'auto');
  assert.deepEqual(readVoicePreference(JSON.stringify({mode:'male',voiceURI:'male-ko',name:'InJoon',lang:'ko-KR'})),{mode:'male',voiceURI:'male-ko',name:'InJoon',lang:'ko-KR'});
});
test('live navigator applies chosen voice to real speech utterances and adds preview button',()=>{
  const main=load('src/main.js'), picker=load('src/nav-voice-picker.js');
  assert.match(main,/import \{installNavVoicePicker,applySelectedNavVoice\} from '\.\/nav-voice-picker\.js'/);
  assert.match(main,/const message=new window\.SpeechSynthesisUtterance\(text\);[\s\S]{0,200}applySelectedNavVoice\(message\)/);
  assert.match(main,/installNavVoicePicker\(\{onChange:/);
  assert.match(picker,/id=\\?"dj816-voice-mode/);
  assert.match(picker,/id=\\?"dj816-voice-preview/);
  assert.match(picker,/voiceschanged/);
  assert.match(picker,/speechSynthesis\.speak\(utterance\)/);
});
