/** v7.10.3 — Mobile-only floating tabs. The map/transport code is untouched.
 * Move existing DOM nodes (never clone functional controls) so event listeners,
 * input values and async news/record containers survive unchanged.
 */
import './mobile-panel-layout.css';
import './mobile-actions-v7104.css';
import './mobile-actions-v7104.js';

export const MOBILE_PAGE_IDS = Object.freeze(['route-panel','participation-panel','news-panel','mine-panel']);

export function installMobilePanelLayout(doc=document, win=window) {
  const app = doc.getElementById('app');
  if (!app || !win.matchMedia) return () => {};
  const mobile = win.matchMedia('(max-width:699px)');
  const originals = new Map();
  const restored = () => originals.size === 0;

  function attach() {
    if (!mobile.matches || !restored()) return;
    for (const id of MOBILE_PAGE_IDS) {
      const panel = doc.getElementById(id);
      const heading = panel?.querySelector(':scope > .page-heading');
      if (!panel || !heading) continue;
      const panelNodes = Array.from(panel.childNodes);
      const headingNodes = Array.from(heading.childNodes);
      const header = doc.createElement('div');
      header.className = 'dj-mobile-page-header';
      const content = doc.createElement('div');
      content.className = 'dj-mobile-page-content';
      const title = doc.createElement('div');
      title.className = 'dj-mobile-page-title';
      const tab = panel.dataset.page;
      const tabIcon = app.querySelector(`#bottom-nav .nav-tab[data-tab="${tab}"] .nav-icon`);
      if (tabIcon) {
        const icon = tabIcon.cloneNode(true);
        icon.classList.add('dj-mobile-title-icon');
        icon.setAttribute('aria-hidden','true');
        title.appendChild(icon);
      }
      const h2 = heading.querySelector('h2');
      if (h2) title.appendChild(h2);
      heading.appendChild(title);
      // Unlike the fixed title, introductory paragraphs belong to the scroll area.
      for (const lead of Array.from(heading.querySelectorAll(':scope > p'))) content.appendChild(lead);
      const dismiss = panel.querySelector(':scope > .page-dismiss') || heading.querySelector(':scope > .page-dismiss');
      if (dismiss) header.appendChild(dismiss);
      header.appendChild(heading);
      for (const node of panelNodes) {
        if (node === heading || node === dismiss) continue;
        content.appendChild(node);
      }
      panel.replaceChildren(header,content);
      panel.classList.add('dj-mobile-panel-split');
      originals.set(id,{panel,heading,panelNodes,headingNodes});
    }
  }
  function detach() {
    for (const {panel,heading,panelNodes,headingNodes} of originals.values()) {
      heading.replaceChildren(...headingNodes);
      panel.replaceChildren(...panelNodes);
      panel.classList.remove('dj-mobile-panel-split');
    }
    originals.clear();
  }
  const sync = () => mobile.matches ? attach() : detach();
  // Avoid document-level mutation observers: map layers update frequently.
  mobile.addEventListener?.('change',sync);
  sync();
  return () => {mobile.removeEventListener?.('change',sync);detach();};
}

/** Split the existing district picker into the same fixed header / scrolling body
 * used by the four bottom-tab sheets. Preserve all child-node identities so
 * map boundary selection and dynamic list rendering remain attached. */
export function installMobileAdminPickerLayout(doc=document, win=window) {
  const picker=doc.getElementById('admin-dong-picker');
  const heading=picker?.querySelector(':scope > .admin-dong-heading');
  const titleGroup=heading?.firstElementChild;
  if(!picker || !heading || !titleGroup || !win.matchMedia)return ()=>{};
  const media=win.matchMedia('(max-width:699px)');
  const nodes=Array.from(picker.childNodes);
  const titleNodes=Array.from(titleGroup.childNodes);
  let content=null;
  function attach(){
    if(!media.matches || content)return;
    const status=doc.getElementById('admin-dong-status');
    const grid=doc.getElementById('admin-dong-list');
    const clear=doc.getElementById('admin-dong-clear');
    if(!status || !grid || !clear)return;
    content=doc.createElement('div');
    content.className='dj-mobile-admin-content';
    const icon=doc.querySelector('#bottom-nav .nav-tab[data-tab="map"] .nav-icon')?.cloneNode(true);
    if(icon){icon.classList.add('dj-mobile-title-icon');icon.setAttribute('aria-hidden','true');titleGroup.prepend(icon);}
    content.append(status,grid,clear);
    picker.append(content);
    picker.classList.add('dj-mobile-admin-sheet');
  }
  function detach(){
    if(!content)return;
    titleGroup.replaceChildren(...titleNodes);
    picker.replaceChildren(...nodes);
    picker.classList.remove('dj-mobile-admin-sheet');
    content=null;
  }
  const sync=()=>media.matches?attach():detach();
  media.addEventListener?.('change',sync);
  sync();
  return ()=>{media.removeEventListener?.('change',sync);detach();};
}

/** Open the existing administrative-dong picker, without replicating layer logic. */
export function installMobileDongPickerShortcut(doc=document,win=window) {
  const app=doc.getElementById('app');
  const tab=doc.querySelector('#bottom-nav .nav-tab[data-tab="map"]');
  if(!app||!tab)return ()=>{};
  const onClick=()=>{
    if(!win.matchMedia?.('(max-width:699px)')?.matches)return;
    win.requestAnimationFrame(()=>{
      if(app.dataset.tab!=='map')return;
      const overview=doc.getElementById('overview-sheet');
      const picker=doc.getElementById('admin-dong-picker');
      const open=doc.getElementById('open-admin-dongs');
      if(!picker || !open || !overview)return;
      // The v7.10.1 shortcut previously opened TWO independent sheets:
      // the obsolete overview and the admin-dong picker. Keep ONLY the picker.
      // Reuse its original click handler to preserve boundary selection logic.
      if(picker.hidden)open.click();
      overview.hidden=true;
    });
  };
  tab.addEventListener('click',onClick);
  return ()=>tab.removeEventListener('click',onClick);
}

if(typeof window!=='undefined' && typeof document!=='undefined'){
  const initialize=()=>{
    installMobilePanelLayout();
    installMobileAdminPickerLayout();
    installMobileDongPickerShortcut();
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});
  else initialize();
}
