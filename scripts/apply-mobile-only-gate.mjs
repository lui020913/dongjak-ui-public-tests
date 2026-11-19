import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

export function isMobilePhoneContext({userAgent='',platform='',userAgentDataMobile=false,width=390}={}) {
  const ua=String(userAgent);
  const applePhone=/iPhone|iPod/i.test(ua)||/iPhone|iPod/i.test(String(platform));
  const androidPhone=/Android/i.test(ua)&&(/Mobile/i.test(ua)||userAgentDataMobile===true);
  const legacyPhone=/Windows Phone|IEMobile|BlackBerry|Opera Mini/i.test(ua);
  return (applePhone||androidPhone||legacyPhone)&&Number(width)>0&&Number(width)<=1024;
}

function replaceExactly(source,search,replacement,label) {
  const count=source.split(search).length-1;
  if(count!==1) throw new Error('Expected exactly one '+label+'; found '+count);
  return source.replace(search,replacement);
}

export function applyMobileOnlyGate({indexHtml,mainJs,platformEntry}) {
  const bootstrap='<script id="dj-mobile-only-gate-bootstrap">\n'+
'(function(){\n'+
'  var nav=window.navigator||{};\n'+
'  var ua=String(nav.userAgent||\'\');\n'+
'  var platform=String(nav.platform||\'\');\n'+
'  var applePhone=/iPhone|iPod/i.test(ua)||/iPhone|iPod/i.test(platform);\n'+
'  var androidPhone=/Android/i.test(ua)&&(/Mobile/i.test(ua)||(nav.userAgentData&&nav.userAgentData.mobile===true));\n'+
'  var legacyPhone=/Windows Phone|IEMobile|BlackBerry|Opera Mini/i.test(ua);\n'+
'  var root=document.documentElement;\n'+
'  function update(){\n'+
'    var width=Number(window.innerWidth||root.clientWidth||0);\n'+
'    var next=((applePhone||androidPhone||legacyPhone)&&width>0&&width<=1024)?\'allowed\':\'blocked\';\n'+
'    var previous=root.dataset.djMobileOnly;\n'+
'    root.dataset.djMobileOnly=next;\n'+
'    if(previous===\'blocked\'&&next===\'allowed\'&&document.readyState!==\'loading\')window.location.reload();\n'+
'  }\n'+
'  update();\n'+
'  window.addEventListener(\'resize\',update,{passive:true});\n'+
'  window.addEventListener(\'orientationchange\',update,{passive:true});\n'+
'})();\n'+
'</script>';

  const gateStyle='<style id="dj-mobile-only-gate-style">\n'+
'#dj-mobile-only-screen{display:none}\n'+
'html[data-dj-mobile-only="blocked"],html[data-dj-mobile-only="blocked"] body{background:#fff!important}\n'+
'html[data-dj-mobile-only="blocked"] body{margin:0!important;overflow:hidden!important}\n'+
'html[data-dj-mobile-only="blocked"] body>:not(#dj-mobile-only-screen){display:none!important}\n'+
'html[data-dj-mobile-only="blocked"] #dj-mobile-only-screen{position:fixed!important;inset:0!important;z-index:2147483647!important;display:grid!important;place-items:center!important;box-sizing:border-box!important;width:100vw!important;height:100vh!important;height:100dvh!important;margin:0!important;padding:28px!important;border:0!important;background:#fff!important;color:#17221d!important;text-align:center!important;font-family:system-ui,-apple-system,BlinkMacSystemFont,sans-serif!important}\n'+
'#dj-mobile-only-screen .dj-mobile-only-message{width:min(920px,100%);min-width:0;margin:0 auto;box-sizing:border-box}\n'+
'#dj-mobile-only-screen .dj-mobile-only-devices{display:block;width:min(204px,100%);height:auto;margin:0 auto 24px;color:#16836b}\n'+
'#dj-mobile-only-screen h1{margin:0;font-size:clamp(22px,2.45vw,32px);font-weight:800;line-height:1.4;letter-spacing:-.04em;word-break:keep-all}\n'+
'#dj-mobile-only-screen p{margin:16px 0 0;color:#64746a;font-size:clamp(14px,1.65vw,21px);line-height:1.65;letter-spacing:-.025em;word-break:keep-all;overflow-wrap:anywhere}\n'+
'#dj-mobile-only-screen .dj-mobile-only-credit{position:absolute;inset:auto 16px max(26px,env(safe-area-inset-bottom,0px));margin:0;color:#64746a;font-size:13px;line-height:1.5;font-weight:500;letter-spacing:-.02em;text-align:center;word-break:keep-all}\n'+
'@media(min-width:600px){#dj-mobile-only-screen p{white-space:nowrap}}\n'+
'@media(max-height:300px){#dj-mobile-only-screen .dj-mobile-only-devices{width:min(128px,100%);margin-bottom:10px}#dj-mobile-only-screen p{margin-top:8px}#dj-mobile-only-screen .dj-mobile-only-message{transform:translateY(-12px)}#dj-mobile-only-screen .dj-mobile-only-credit{bottom:8px;font-size:11px}}\n'+
'@media(max-height:200px){html[data-dj-mobile-only="blocked"] #dj-mobile-only-screen{display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:flex-start!important;overflow:auto!important;padding:12px!important}#dj-mobile-only-screen .dj-mobile-only-message{flex:none;transform:none}#dj-mobile-only-screen .dj-mobile-only-credit{position:static;margin:14px 0 0;flex:none}}\n'+
'</style>';

  if(!indexHtml.includes('id="dj-mobile-only-gate-bootstrap"')) {
    const viewport=/<meta name="viewport"[^>]*\/>/;
    if(!viewport.test(indexHtml)) throw new Error('Viewport meta tag is missing');
    indexHtml=indexHtml.replace(viewport,match=>match+'\n    '+bootstrap);
  }
  if(!indexHtml.includes('id="dj-mobile-only-gate-style"')) {
    indexHtml=replaceExactly(indexHtml,'</head>',gateStyle+'\n  </head>','head close tag');
  }
  if(!indexHtml.includes('id="dj-mobile-only-screen"')) {
    const screen='<main id="dj-mobile-only-screen" role="main" aria-labelledby="dj-mobile-only-title"><div class="dj-mobile-only-message"><svg class="dj-mobile-only-devices" viewBox="0 0 204 76" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="4" y="12" width="64" height="40" rx="5"/><path d="M36 52v12m-13 0h26"/><rect x="76" y="9" width="38" height="56" rx="5"/><path d="M92 59h6"/><path d="M127 38h22m-8-8 8 8-8 8"/><rect x="162" y="6" width="32" height="64" rx="7"/><path d="M174 12h8m-7 51h6"/></svg><h1 id="dj-mobile-only-title">모바일로 접속해 주세요</h1><p>동작하는 안전지도는 모바일 웹사이트와 모바일 앱에서 이용할 수 있습니다.</p></div><footer class="dj-mobile-only-credit">동작구 아이디어리그 안전팀</footer></main>';
    indexHtml=replaceExactly(indexHtml,'<body>','<body>'+screen,'body opening tag');
  }

  return {indexHtml,mainJs,platformEntry};
}

const root=process.argv[2];
if(root){
  const indexPath=resolve(root,'index.html');
  const mainPath=resolve(root,'src/main.js');
  const platformPath=resolve(root,'platforms/entry.js');
  const patched=applyMobileOnlyGate({
    indexHtml:readFileSync(indexPath,'utf8'),
    mainJs:readFileSync(mainPath,'utf8'),
    platformEntry:readFileSync(platformPath,'utf8')
  });
  writeFileSync(indexPath,patched.indexHtml);
  writeFileSync(mainPath,patched.mainJs);
  writeFileSync(platformPath,patched.platformEntry);
  console.log('Applied phone-only visual gate; PC/tablet show a blank white screen without changing app startup or platform code.');
}
