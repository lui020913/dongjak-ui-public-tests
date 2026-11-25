/** Desktop safety workbench: two-level, non-scrolling information architecture.
 * Keeps every existing toggle and data ID; only changes which detail set is shown.
 */
export const SAFETY_DESKTOP_PANES = Object.freeze({
  'dj-safety-data': ['사고·횡단', '추가 자료', 'CCTV', '지형·교통약자'],
  'dj-safety-facilities': ['음향신호기·AED', '생활 안전시설']
});

export function installDesktopSafetyPanes(doc = document, win = window) {
  const panel = doc.getElementById('map-safety-controls');
  if (!panel || panel.dataset.dj819Ready === 'true') return () => {};
  panel.dataset.dj819Ready = 'true';
  const media = win.matchMedia?.('(min-width:1080px)');
  const listeners = [];
  const groups = Object.entries(SAFETY_DESKTOP_PANES).map(([id, labels]) => {
    const group = doc.getElementById(id);
    const body = group?.querySelector('.dj-safety-group-body');
    if (!group || !body) return null;
    let targets = [];
    if (id === 'dj-safety-data') {
      // The existing .dj-import-grid has four category headings, each followed
      // by its own entries. Preserve DOM order and the underlying handlers.
      const grid = body.querySelector('.dj-import-grid');
      let current = -1;
      for (const child of Array.from(grid?.children || [])) {
        if (child.matches('.dj-import-category')) current++;
        child.dataset.dj819PaneIndex = String(Math.max(0, Math.min(current, labels.length - 1)));
        targets.push(child);
      }
    } else {
      targets = Array.from(body.children).filter(el => el.matches('section'));
      targets.forEach((el, index) => el.dataset.dj819PaneIndex = String(Math.min(index, labels.length - 1)));
    }
    if (!targets.length) return null;
    const tabbar = doc.createElement('div');
    tabbar.className = 'dj819-subnav';
    tabbar.setAttribute('role','group');
    tabbar.setAttribute('aria-label',`${group.querySelector('.dj-safety-group-name strong')?.textContent || '안전정보'} 세부 메뉴`);
    const buttons = labels.map((label,index) => {
      const button = doc.createElement('button');
      button.type = 'button';
      button.className = 'dj819-subnav-button';
      button.textContent = label;
      button.dataset.dj819Select = String(index);
      button.setAttribute('aria-pressed',String(index === 0));
      tabbar.append(button);
      return button;
    });
    body.prepend(tabbar);
    let selected = 0;
    const apply = () => {
      const desktop = Boolean(media?.matches);
      group.dataset.dj819Subpane = String(selected);
      tabbar.hidden = !desktop;
      for (const el of targets) {
        const hide = desktop && Number(el.dataset.dj819PaneIndex) !== selected;
        el.toggleAttribute('data-dj819-inactive',hide);
      }
      for (const [index,button] of buttons.entries()) button.setAttribute('aria-pressed',String(index === selected));
    };
    const onClick = event => {
      const button = event.target.closest?.('.dj819-subnav-button');
      if (!button || !tabbar.contains(button)) return;
      const next = Number(button.dataset.dj819Select);
      if (!Number.isInteger(next) || next < 0 || next >= labels.length || next === selected) return;
      selected = next;
      apply();
    };
    tabbar.addEventListener('click',onClick);
    listeners.push(() => tabbar.removeEventListener('click',onClick));
    apply();
    return {tabbar,targets,apply};
  }).filter(Boolean);
  const onMediaChange=()=>groups.forEach(g=>g.apply());
  media?.addEventListener?.('change',onMediaChange);
  return () => {
    media?.removeEventListener?.('change',onMediaChange);
    listeners.forEach(uninstall=>uninstall());
    for(const group of groups){
      for(const target of group.targets){delete target.dataset.dj819PaneIndex;target.removeAttribute('data-dj819-inactive');}
      group.tabbar.remove();
    }
    delete panel.dataset.dj819Ready;
  };
}

if(typeof document !== 'undefined') {
  const start=()=>installDesktopSafetyPanes();
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
}
