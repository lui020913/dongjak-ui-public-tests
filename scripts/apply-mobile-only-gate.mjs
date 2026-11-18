import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

export function isMobilePhoneContext({userAgent='',platform='',userAgentDataMobile=false,width=390}={}) {
  const ua=String(userAgent);
  const applePhone=/iPhone|iPod/i.test(ua)||/iPhone|iPod/i.test(String(platform));
  const androidPhone=/Android/i.test(ua)&&(/Mobile/i.test(ua)||userAgentDataMobile===true);
  const legacyPhone=/Windows Phone|IEMobile|BlackBerry|Opera Mini/i.test(ua);
  return (applePhone||androidPhone||legacyPhone)&&Number(width)>0&&Number(width)<=699;
}

function replaceExactly(source,search,replacement,label) {
  const count=source.split(search).length-1;
  if(count!==1) throw new Error('Expected exactly one '+label+'; found '+count);
  return source.replace(search,replacement);
}

function removeTag(html,tag) {
  return html.replaceAll('    '+tag,'').replaceAll(tag,'');
}

export function applyMobileOnlyGate({indexHtml,mainJs,platformEntry}) {
  const bootstrap=[
    '<script id="dj-mobile-only-gate-bootstrap">',
    '(function(){',
    "  var nav=window.navigator||{};",
    "  var ua=String(nav.userAgent||'');",
    "  var platform=String(nav.platform||'');",
    "  var applePhone=/iPhone|iPod/i.test(ua)||/iPhone|iPod/i.test(platform);",
    "  var androidPhone=/Android/i.test(ua)&&(/Mobile/i.test(ua)||(nav.userAgentData&&nav.userAgentData.mobile===true));",
    "  var legacyPhone=/Windows Phone|IEMobile|BlackBerry|Opera Mini/i.test(ua);",
    "  var root=document.documentElement;",
    "  function update(){",
    "    var width=Number(window.innerWidth||root.clientWidth||0);",
    "    var next=((applePhone||androidPhone||legacyPhone)&&width>0&&width<=699)?'allowed':'blocked';",
    "    var previous=root.dataset.djMobileOnly;",
    "    root.dataset.djMobileOnly=next;",
    "    if(previous==='blocked'&&next==='allowed'&&document.readyState!=='loading')window.location.reload();",
    "  }",
    "  update();",
    "  window.addEventListener('resize',update,{passive:true});",
    "  window.addEventListener('orientationchange',update,{passive:true});",
    '})();',
    '</script>'
  ].join('\n');

  const gateStyle=[
    '<style id="dj-mobile-only-gate-style">',
    '#dj-mobile-only-screen{display:none}',
    'html[data-dj-mobile-only="blocked"] body>:not(#dj-mobile-only-screen){display:none!important}',
    'html[data-dj-mobile-only="blocked"] #dj-mobile-only-screen{',
    '  position:fixed!important;inset:0!important;z-index:2147483647!important;',
    '  display:grid!important;place-items:center!important;box-sizing:border-box!important;',
    '  padding:28px!important;background:#f5f7f5!important;color:#203b30!important;',
    '  text-align:center!important;font-family:system-ui,sans-serif!important;',
    '}',
    'html[data-theme="dark"][data-dj-mobile-only="blocked"] #dj-mobile-only-screen{background:#101f25!important;color:#edf7f2!important}',
    '#dj-mobile-only-screen .dj-mobile-only-message{width:min(420px,100%);margin:0 auto}',
    '#dj-mobile-only-screen h1{margin:0;font-size:22px;font-weight:800;line-height:1.4;letter-spacing:-.04em}',
    '#dj-mobile-only-screen p{margin:12px 0 0;color:#718177;font-size:14px;line-height:1.65}',
    'html[data-theme="dark"][data-dj-mobile-only="blocked"] #dj-mobile-only-screen p{color:#a0b9af}',
    '</style>'
  ].join('\n');

  if(!indexHtml.includes('id="dj-mobile-only-gate-bootstrap"')) {
    const viewport=/<meta name="viewport"[^>]*\/>/;
    if(!viewport.test(indexHtml)) throw new Error('Viewport meta tag is missing');
    indexHtml=indexHtml.replace(viewport,match=>match+'\n    '+bootstrap);
  }
  if(!indexHtml.includes('id="dj-mobile-only-gate-style"')) {
    indexHtml=replaceExactly(indexHtml,'</head>',gateStyle+'\n  </head>','head close tag');
  }
  if(!indexHtml.includes('id="dj-mobile-only-screen"')) {
    const screen=[
      '<main id="dj-mobile-only-screen" role="main" aria-labelledby="dj-mobile-only-title">',
      '  <div class="dj-mobile-only-message">',
      '    <h1 id="dj-mobile-only-title">모바일로 접속해 주세요</h1>',
      '    <p>동작하는 안전지도는 모바일 웹사이트와 모바일 앱에서 이용할 수 있습니다.</p>',
      '  </div>',
      '</main>'
    ].join('\n');
    indexHtml=replaceExactly(indexHtml,'<body>','<body>\n    '+screen,'body opening tag');
  }

  for(const file of ['v815-pc-visual-fixes.css','v853-pc-responsive-fixes.css','v872-pc-onboarding-weather.css']) {
    const tag='<link rel="stylesheet" href="/src/'+file+'" />';
    indexHtml=removeTag(indexHtml,tag);
  }
  for(const file of ['v854-weather-desktop.js','v862-pc-mobile-separation.js','v876-desktop-final.js']) {
    const tag='<script type="module" src="/src/'+file+'"></script>';
    indexHtml=removeTag(indexHtml,tag);
  }

  const desktopImports=[
    "import {installDesktopSafetyRail} from './v713-desktop-rail.js';",
    "import './v726-desktop-polish.css';",
    "import './v729-pc-consistency.css';",
    "import './v881-desktop-ui.css';",
    "import './v881-portrait-zoom-responsive.css';",
    "import './v881-tablet-workspace.css';",
    "import './v881-tablet-header-unified.css';",
    "import './v881-tablet-tool-rail.js';",
    "import './v913-pc-design-system.css';"
  ];
  for(const line of desktopImports) mainJs=replaceExactly(mainJs,line+'\n','',line);
  mainJs=replaceExactly(mainJs,'installDesktopSafetyRail({app});\n','',"desktop rail initializer");
  if(!mainJs.includes("if (document.documentElement.dataset.djMobileOnly !== 'blocked') {")) {
    mainJs=replaceExactly(mainJs,'maplibregl.setWorkerUrl(workerUrl);',
      "if (document.documentElement.dataset.djMobileOnly !== 'blocked') {\nmaplibregl.setWorkerUrl(workerUrl);",
      'MapLibre startup anchor');
    mainJs+='\n}\n';
  }

  const oldPlatform=[
    "if(target==='ios-pwa')await import('./ios-pwa/entry.js');",
    "else if(target==='android')await import('./android/entry.js');",
    "else await import('./pc-chromium/entry.js');",
    '// Mobile sheet presentation has its own entry, separate from desktop/MapLibre.',
    "if(target==='ios-pwa'||target==='android')await import('./shared/mobile-panel-layout.js');"
  ].join('\n');
  const newPlatform=[
    "if(typeof document==='undefined'||document.documentElement.dataset.djMobileOnly!=='blocked'){",
    "  if(target==='ios-pwa')await import('./ios-pwa/entry.js');",
    "  else if(target==='android')await import('./android/entry.js');",
    "  else await import('./pc-chromium/entry.js');",
    '  // Mobile sheet presentation remains available to supported phone platforms.',
    "  if(target==='ios-pwa'||target==='android')await import('./shared/mobile-panel-layout.js');",
    '}'
  ].join('\n');
  platformEntry=replaceExactly(platformEntry,oldPlatform,newPlatform,'platform entry dispatch');

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
  console.log('Applied phone-only UI gate; PC/tablet map boot and dedicated presentation imports are disabled.');
}
