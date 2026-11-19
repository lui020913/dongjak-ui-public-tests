import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {NOTICE_PREF,NOTICE_OWNER,NOTICE_INTENT,safeNoticePreference,planKakaoSignIn,consumeKakaoNoticeIntent,sendKakaoSelfLoginNotice} from '../src/v829-login-notice.js';
import {onRequestPost} from '../functions/api/account/login-notification.js';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
function store(){const map=new Map();return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)};}

test('v829: no Kakao message permission is requested without explicit same-account opt-in',()=>{
  const local=store(),sess=store();
  assert.deepEqual(planKakaoSignIn({store:local,sessionStore:sess,now:1000}),{});
  assert.equal(sess.getItem(NOTICE_INTENT),null);
  local.setItem(NOTICE_PREF,'1');local.setItem(NOTICE_OWNER,'user-A');
  assert.equal(safeNoticePreference(local,'user-B'),false);
  assert.equal(safeNoticePreference(local,'user-A'),true);
  assert.deepEqual(planKakaoSignIn({store:local,sessionStore:sess,now:1000}),{scopes:'talk_message'});
  assert.deepEqual(planKakaoSignIn({store:local,sessionStore:sess,now:1000,linkExisting:true}),{});
  assert.equal(sess.getItem(NOTICE_INTENT),null);
});

test('v829: OAuth provider token triggers notification only once for expected user, never on refresh',()=>{
  const local=store(),sess=store();local.setItem(NOTICE_PREF,'1');local.setItem(NOTICE_OWNER,'user-A');
  planKakaoSignIn({store:local,sessionStore:sess,now:1000});
  const session={provider_token:'valid-shortlived-token',user:{id:'user-A'}};
  assert.equal(consumeKakaoNoticeIntent({sessionStore:sess,session,now:1500})?.userId,'user-A');
  assert.equal(consumeKakaoNoticeIntent({sessionStore:sess,session,now:1600}),null);
  planKakaoSignIn({store:local,sessionStore:sess,now:1000});
  assert.equal(consumeKakaoNoticeIntent({sessionStore:sess,session:{...session,user:{id:'user-B'}},now:1200}),null);
  planKakaoSignIn({store:local,sessionStore:sess,now:1000});
  assert.equal(consumeKakaoNoticeIntent({sessionStore:sess,session,now:1000+16*60*1000}),null);
});

test('v829: current account pane scopes Kakao opt-in to the authenticated account',()=>{
  const auth=source('src/v824-favorites-cloud.js'),html=source('index.html');
  assert.match(auth,/section\.dataset\.authState=authenticated\?'signed-in':'guest'/);
  assert.match(auth,/noticeSettings\.hidden=!names\.includes\('kakao'\)/);
  assert.match(auth,/noticeCheckbox\.checked=safeNoticePreference\(safeLocalStorage\(\),user\.id\)/);
  assert.match(auth,/planKakaoSignIn\(/);
  assert.match(auth,/event==='SIGNED_IN'/);
  assert.match(auth,/sendKakaoSelfLoginNotice\(notice\.accessToken\)/);
  assert.match(auth,/consumeKakaoNoticeIntent\(/);
  assert.match(html,/v829-account-auth\.css/);
  assert.doesNotMatch(auth,/setValue\([^\n]+provider_token/);
});

test('v829: self-message API requires same origin and fixed event, never accepts arbitrary recipient',async()=>{
  let response=await onRequestPost({request:new Request('https://example.pages.dev/api/account/login-notification',{method:'POST',headers:{Origin:'https://evil.example','Authorization':'Bearer abcdefghijklmnopqrstuvwxyz','Content-Type':'application/json'},body:JSON.stringify({event:'interactive_kakao_login'})})});
  assert.equal(response.status,403);
  response=await onRequestPost({request:new Request('https://example.pages.dev/api/account/login-notification',{method:'POST',headers:{Origin:'https://example.pages.dev','Authorization':'Bearer abcdefghijklmnopqrstuvwxyz','Content-Type':'application/json'},body:JSON.stringify({event:'invalid',to:'other'})})});
  assert.equal(response.status,400);
  const prior=globalThis.fetch;
  try{
    let called=0;
    globalThis.fetch=async(url,opts)=>{called++;assert.equal(url,'https://kapi.kakao.com/v2/api/talk/memo/default/send');assert.equal(opts.method,'POST');const template=JSON.parse(new URLSearchParams(opts.body).get('template_object'));assert.match(template.text,/동작하는 안전지도/);assert.equal(template.link.mobile_web_url,'https://example.pages.dev/');return new Response(JSON.stringify({result_code:0}),{status:200});};
    response=await onRequestPost({request:new Request('https://example.pages.dev/api/account/login-notification',{method:'POST',headers:{Origin:'https://example.pages.dev','Authorization':'Bearer abcdefghijklmnopqrstuvwxyz','Content-Type':'application/json'},body:JSON.stringify({event:'interactive_kakao_login',to:'other'})})});
    assert.equal(response.status,200);assert.equal((await response.json()).sent,true);assert.equal(called,1);
  }finally{globalThis.fetch=prior;}
});

test('v829: client sender does not persist tokens and checks delivery acknowledgement',async()=>{
  let count=0;
  const fetcher=async(url,opts)=>{count++;assert.equal(url,'/api/account/login-notification');assert.match(opts.headers.Authorization,/Bearer/);return {ok:true,json:async()=>({sent:true})};};
  assert.equal(await sendKakaoSelfLoginNotice('abcdefghijklmnopqrstuvwxyz',{fetcher}),true);
  assert.equal(count,1);
});
