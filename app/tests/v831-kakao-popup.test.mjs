import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readPopupCallback,isTrustedPopupEvent,waitForKakaoPopup} from '../src/v831-kakao-popup.js';

const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('Kakao callback parses implicit session and returns provider token only in memory',()=>{
  const callback=readPopupCallback('https://dongjak.example/oauth-popup.html#access_token=abc123&refresh_token=xyz999&provider_token=kakaotok');
  assert.deepEqual(callback,{accessToken:'abc123',refreshToken:'xyz999',providerToken:'kakaotok'});
  assert.deepEqual(readPopupCallback('https://dongjak.example/oauth-popup.html?code=auth-code'),{code:'auth-code'});
  assert.deepEqual(readPopupCallback('https://dongjak.example/oauth-popup.html#error=access_denied'),{error:'access_denied'});
  assert.equal(readPopupCallback('https://dongjak.example/oauth-popup.html'),null);
});

test('popup tokens are accepted only from originating same-origin WindowProxy',()=>{
  const popup={};const good={source:popup,origin:'https://dongjak.example',data:{type:'dongjak:kakao-popup-result:v831'}};
  assert.equal(isTrustedPopupEvent(good,popup,'https://dongjak.example'),true);
  assert.equal(isTrustedPopupEvent({...good,origin:'https://evil.example'},popup,'https://dongjak.example'),false);
  assert.equal(isTrustedPopupEvent({...good,source:{}},popup,'https://dongjak.example'),false);
  assert.equal(isTrustedPopupEvent({...good,data:{type:'other'}},popup,'https://dongjak.example'),false);
});

test('popup message resolves without redirect or touching main map',async()=>{
  let handler=null;
  const popup={closed:false,close(){this.closed=true;}};
  const win={location:{origin:'https://dongjak.example'},
    addEventListener(type,h){assert.equal(type,'message');handler=h;},
    removeEventListener(type,h){if(handler===h)handler=null;},
    setInterval(){return 1;},clearInterval(){},setTimeout(){return 2;},clearTimeout(){}};
  const pending=waitForKakaoPopup({popup,win});
  handler({source:popup,origin:'https://evil.example',data:{type:'dongjak:kakao-popup-result:v831',result:{code:'bad'}}});
  assert.equal(popup.closed,false);
  handler({source:popup,origin:'https://dongjak.example',data:{type:'dongjak:kakao-popup-result:v831',result:{code:'yes'}}});
  assert.deepEqual(await pending,{code:'yes'});
  assert.equal(popup.closed,true);
});

test('popup callback is a lightweight standalone page and existing main/index remain unchanged',()=>{
  const html=file('public/oauth-popup.html');
  const account=file('src/v824-favorites-cloud.js');
  assert.match(html,/postMessage\(/);
  assert.match(html,/history\.replaceState/);
  assert.doesNotMatch(html,/maplibre|\/src\/main\.js/);
  assert.match(account,/skipBrowserRedirect:Boolean\(popup\)/);
  assert.match(account,/new URL\('\/oauth-popup\.html'/);
  assert.match(account,/setSession\(\{access_token:result\.accessToken,refresh_token:result\.refreshToken\}\)/);
});
