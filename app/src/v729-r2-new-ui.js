/** v7.0.29-R2 — fresh UI-only adapter, independent of MapLibre and API.
 * Connects one compact mobile history button to the existing release dialog.
 * Does not create/map/request data, alter map startup, or manage any map state.
 */
export function installR2Ui(doc = document) {
  const mapOptionsButton = doc.getElementById('map-tools-toggle');
  const existing = doc.getElementById('version-history-trigger');
  const app = doc.getElementById('app');
  if (!mapOptionsButton || !existing || !app) return false;
  if (doc.getElementById('dj-r2-history-shortcut')) return true;

  const shortcut = doc.createElement('button');
  shortcut.type = 'button';
  shortcut.id = 'dj-r2-history-shortcut';
  shortcut.textContent = '업데이트';
  shortcut.title = '전체 업데이트 내역';
  shortcut.setAttribute('aria-label', '업데이트 내역 보기');
  shortcut.setAttribute('aria-controls', 'version-history-modal');
  shortcut.setAttribute('aria-haspopup', 'dialog');
  shortcut.addEventListener('click', () => {
    // Dismiss map options using its OWN registered close action. The modal is
    // still opened by the original version-history controller, exactly once.
    if (app.classList.contains('map-controls-open')) {
      const close = doc.getElementById('map-options-mobile-close');
      if (close && typeof close.click === 'function') close.click();
    }
    existing.click();
  });
  mapOptionsButton.insertAdjacentElement('afterend', shortcut);
  return true;
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => installR2Ui(document), {once:true});
  } else installR2Ui(document);
}
