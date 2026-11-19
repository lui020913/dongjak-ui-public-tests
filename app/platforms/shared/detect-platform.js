/** Platform selection: one map engine and dataset, per-target presentation/configuration. */
export const TARGETS=Object.freeze(['ios-pwa','pc-chromium','android']);
export function detectPlatform({navigator:nav={},matchMedia=()=>({matches:false}),Capacitor={}}={},forced='universal'){
  if(TARGETS.includes(forced))return forced;
  const nativePlatform=Capacitor?.getPlatform?.();
  if(nativePlatform==='android')return 'android';
  if(nativePlatform==='ios')return 'ios-pwa';
  const agent=String(nav.userAgent||'');
  if(/Android/i.test(agent))return 'android';
  if(/iPhone|iPad|iPod/i.test(agent)||
    (nav.platform==='MacIntel'&&Number(nav.maxTouchPoints)>1))return 'ios-pwa';
  // Tablet/desktop Chromium shares the desktop layout; small non-iOS devices
  // can still use CSS mobile UI without accidentally receiving iOS-only PWA styles.
  return 'pc-chromium';
}
