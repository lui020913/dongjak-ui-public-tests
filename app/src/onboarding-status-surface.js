/** Runtime owner of the onboarding page background.
 * Earlier layered and unlayered stylesheets can otherwise reinstate the
 * obsolete white --dj800-surface on the iOS full-screen tour after deploy.
 * Use inline important declarations for the PAGE, never for image or buttons.
 */
export const ONBOARDING_STATUS_TONE=Object.freeze({light:'#edf3ef',dark:'#22282e'});
export const ONBOARDING_SURFACE_SELECTORS=Object.freeze([
  ':scope > .dj860-card',
  ':scope > .dj860-card > .dj860-head',
  ':scope > .dj860-card > .dj860-content',
  ':scope > .dj860-card > .dj860-footer'
]);

export function syncOnboardingStatusSurface({app,doc,win,overlay}={}){
  if(!overlay)return null;
  const phone=win?.matchMedia?.('(max-width: 699px)')?.matches ?? true;
  const targets=[overlay,...ONBOARDING_SURFACE_SELECTORS.map(selector=>overlay.querySelector?.(selector))].filter(Boolean);
  if(!phone){
    for(const target of targets){
      target.style?.removeProperty?.('background');
      target.style?.removeProperty?.('background-color');
      target.style?.removeProperty?.('background-image');
    }
    return null;
  }
  const appTheme=app?.dataset?.theme;
  const rootTheme=doc?.documentElement?.dataset?.theme;
  const theme=appTheme==='light'||appTheme==='dark'?appTheme:rootTheme==='dark'?'dark':'light';
  const color=ONBOARDING_STATUS_TONE[theme];
  for(const target of targets){
    target.style?.setProperty?.('background',color,'important');
    target.style?.setProperty?.('background-color',color,'important');
    target.style?.setProperty?.('background-image','none','important');
  }
  return color;
}
