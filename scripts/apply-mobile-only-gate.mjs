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

  const gateStyle='<style id="dj-mobile-only-gate-style">\\n'+
'#dj-mobile-only-screen{display:none}\\n'+
'html[data-dj-mobile-only="blocked"] body>:not(#dj-mobile-only-screen){display:none!important}\\n'+
'html[data-dj-mobile-only="blocked"] #dj-mobile-only-screen{\\n'+
'  position:fixed!important;inset:0!important;z-index:2147483647!important;\\n'+
'  display:block!important;width:100vw!important;height:100vh!important;height:100dvh!important;\\n'+
'  margin:0!important;padding:0!important;background:#fff!important;color:#111!important;\\n'+
'}\\n'+
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
    const screen='<main id="dj-mobile-only-screen" role="main" aria-label="모바일 기기에서 이용해 주세요"></main>';
    indexHtml=replaceExactly(indexHtml,'<body>','<body>\\n    '+screen,'body opening tag');
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
