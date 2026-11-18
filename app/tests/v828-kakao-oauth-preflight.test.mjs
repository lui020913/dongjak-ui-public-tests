import test from 'node:test';
import assert from 'node:assert/strict';
import {parseEnvFile,kakaoRedirectInfo,maskPublicClientId,inspectKakaoAuthorize} from '../scripts/check-kakao-oauth.mjs';

test('v828: env parser accepts only assignments, inline comments and quoted values',()=>{
  const data=parseEnvFile('VITE_SUPABASE_URL="https://sample.supabase.co"\n# ignore\nexport VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_abcd # comment');
  assert.equal(data.VITE_SUPABASE_URL,'https://sample.supabase.co');
  assert.equal(data.VITE_SUPABASE_PUBLISHABLE_KEY,'sb_publishable_abcd');
});
test('v828: Kakao redirect extracts the actual client ID, callback and required scopes',()=>{
  const url='https://kauth.kakao.com/oauth/authorize?client_id=abc123456789012&redirect_uri=https%3A%2F%2Fsample.supabase.co%2Fauth%2Fv1%2Fcallback&scope=account_email%20profile_image%20profile_nickname&response_type=code';
  const result=kakaoRedirectInfo(url);
  assert.equal(result.clientId,'abc123456789012');
  assert.deepEqual(result.scopes,['account_email','profile_image','profile_nickname']);
  assert.equal(result.redirectUri,'https://sample.supabase.co/auth/v1/callback');
  assert.equal(maskPublicClientId(result.clientId),'abc1…9012');
});
test('v828: rejects an arbitrary external auth redirect (no SSRF following)',async()=>{
  const fetchFn=async()=>({status:302,headers:{get:()=> 'https://malicious.example/authorize?client_id=abc'}});
  await assert.rejects(inspectKakaoAuthorize({url:'https://sample.supabase.co',publicKey:'sb_publishable_testpublickey123',fetchFn}),/예상하지 않은 로그인 대상/);
});
test('v828: follows the Supabase response to Kakao without making a Kakao network request',async()=>{
  const calls=[];
  const fetchFn=async(input,init)=>{
    calls.push([input,init]);return {status:302,headers:{get:key=>key==='location'?'https://kauth.kakao.com/oauth/authorize?client_id=rest1234567890&scope=account_email%20profile_image%20profile_nickname&redirect_uri=https%3A%2F%2Fsample.supabase.co%2Fauth%2Fv1%2Fcallback':null}};
  };
  const result=await inspectKakaoAuthorize({url:'https://sample.supabase.co',publicKey:'sb_publishable_testpublickey123',fetchFn});
  assert.equal(result.clientId,'rest1234567890');assert.equal(calls.length,1);
  assert.equal(calls[0][1].redirect,'manual');
  assert.equal(calls[0][0].includes('provider=kakao'),true);
});
