const platformLinks=[
  '/src/mobile-chrome-v790.css','/src/mobile-ui-v792-fixes.css',
  '/src/ios-pwa-overlay-chrome.css','/src/mobile-toolbar-v794.css',
  '/src/mobile-ui-v795.css'
];
const platformScripts=[
  '/src/mobile-chrome-v790.js','/src/mobile-ui-v792-fixes.js',
  '/src/ios-pwa-overlay-chrome.js','/src/mobile-toolbar-v794.js'
];
function stripTags(html,srcs){
  return srcs.reduce((current,src)=>current.split('\n').filter(line=>!line.includes(`href="${src}"`) && !line.includes(`src="${src}"`)).join('\n'),html);
}
export function platformHtml(html,target){
  if(target==='pc-chromium'){
    html=stripTags(html,[...platformLinks,...platformScripts]);
    html=stripTags(html,['/manifest.webmanifest','/manifest-light.webmanifest','/manifest-dark.webmanifest','/icons/dongjak-light-180.png','/icons/dongjak-dark-180.png']);
  }
  if(target==='android'){
    html=stripTags(html,['/src/ios-pwa-overlay-chrome.css','/src/ios-pwa-overlay-chrome.js',
      '/manifest.webmanifest','/manifest-light.webmanifest','/manifest-dark.webmanifest','/icons/dongjak-light-180.png','/icons/dongjak-dark-180.png']);
  }
  return html;
}
