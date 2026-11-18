/** Close class-controlled map drawers as one atomic DOM transition.
 * Prevents a stale backdrop/aria state from swallowing map clicks after X.
 * The feature's native controller is still responsible for opening the drawer.
 */
export function closeClassControlledSurface({id,doc,app}={}) {
  if (!doc || !app) return false;
  const configs = {
    'map-safety-controls': {
      state: 'map-safety-open', backdrop: 'map-safety-backdrop',
      trigger: 'map-safety-toggle', aria: 'aria-hidden', help: null,
      animation: 'dj875-map-safety-exiting'
    },
    'map-advanced-controls': {
      state: 'map-controls-open', backdrop: 'map-options-backdrop',
      trigger: 'map-tools-toggle', aria: 'aria-hidden', help: 'mobile-webapp-help',
      animation: 'dj875-map-options-exiting'
    }
  };
  const cfg = configs[id];
  if (!cfg) return false;
  app.classList.remove(cfg.state);
  const panel = doc.getElementById(id);
  panel?.classList?.remove(cfg.animation);
  panel?.setAttribute(cfg.aria, 'true');
  const backdrop = doc.getElementById(cfg.backdrop);
  if (backdrop) backdrop.hidden = true;
  doc.getElementById(cfg.trigger)?.setAttribute('aria-expanded', 'false');
  if (cfg.help) {
    const help = doc.getElementById(cfg.help);
    if (help) help.hidden = true;
  }
  return true;
}
