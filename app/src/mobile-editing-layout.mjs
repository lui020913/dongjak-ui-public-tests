// One authoritative keyboard/scroll owner for primary phone pages.
// Inline important declarations override the historical layered production CSS.
// Only leased properties are restored; the independent report portal is excluded.
export function createMobileEditingLayout({app,doc,win,nav}){
 let lease=new Map(),focusedLast=null,baseline=Math.max(win.innerHeight||0,doc?.documentElement?.clientHeight||0),seenShrink=false,editingSession=false;
 const write=(node,key,value)=>{
  if(!node?.style)return;
  let props=lease.get(node);if(!props){props=new Map();lease.set(node,props);}
  if(!props.has(key))props.set(key,[node.style.getPropertyValue(key),node.style.getPropertyPriority(key)]);
  if(node.style.getPropertyValue(key)!==value||node.style.getPropertyPriority(key)!=='important')node.style.setProperty(key,value,'important');
 };
 function restore(){for(const [node,props] of lease)for(const [key,[value,priority]] of props){if(value)node.style.setProperty(key,value,priority);else node.style.removeProperty(key);}lease.clear();}
 const phone=()=>win.matchMedia?.('(max-width:699px)')?.matches===true;
 const input=()=>{let n=doc?.activeElement;while(n?.shadowRoot?.activeElement)n=n.shadowRoot.activeElement;return n?.matches?.('textarea,input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=button]):not([type=submit]):not([type=range]):not([type=hidden]),[contenteditable=true]')?n:null;};
 const setState=active=>{if(active){if(app.dataset.djEditingKeyboard!=='true')app.dataset.djEditingKeyboard='true';}else if('djEditingKeyboard' in app.dataset)delete app.dataset.djEditingKeyboard;};
 let prevPanel=null,prevKeyboard=false;
 function sync(){
  if(!doc||!app.dataset||!phone()||doc.body?.dataset.djCommunityEditor){restore();if(app.dataset)setState(false);focusedLast=null;editingSession=false;seenShrink=false;prevPanel=null;return;}
  const vv=win.visualViewport,top=Math.max(0,vv?.offsetTop||0),height=Math.round(vv?.height||win.innerHeight||0);
  const full=Math.max(win.innerHeight||0,doc.documentElement?.clientHeight||0),focus=input(),owned=focus&&(app.contains(focus)||focus.getRootNode?.().host&&app.contains(focus.getRootNode().host));
  if(owned&&focus!==focusedLast){editingSession=true;seenShrink=false;}
  // iOS may retain focus when the keyboard closes; a new viewport contraction
  // re-enters the editing state even if the input node did not change.
  if(owned&&!editingSession&&baseline-height>80){editingSession=true;seenShrink=true;}
  if(editingSession&&baseline-height>80)seenShrink=true;
  if(editingSession&&seenShrink&&baseline-height<=60)editingSession=false;
  if(!owned&&baseline-height<=60)editingSession=false;
  if(!editingSession&&!owned)baseline=full;
  focusedLast=owned?focus:null;
  const keyboard=editingSession&&(Boolean(owned)||baseline-height>80);
  const panelId=({participate:'participation-panel',news:'news-panel',mine:'mine-panel'})[app.dataset.tab];
  const panel=panelId?doc.getElementById(panelId):null,sc=panel?.querySelector(':scope > .dj836-sheet-body');
  if(panel!==prevPanel||keyboard!==prevKeyboard){restore();prevPanel=panel;prevKeyboard=keyboard;}
  setState(keyboard);
  if(keyboard){
   write(nav,'display','none');write(nav,'visibility','hidden');write(nav,'pointer-events','none');
  }
  if(panel&&!panel.hidden&&sc){
   write(panel,'padding-bottom','0px');
   write(sc,'padding-bottom',keyboard?'20px':'calc(100px + env(safe-area-inset-bottom,0px))');
   write(sc,'scroll-padding-bottom',keyboard?'20px':'calc(100px + env(safe-area-inset-bottom,0px))');
   if(keyboard){
    write(panel,'top',top+'px');write(panel,'bottom','auto');write(panel,'height',height+'px');write(panel,'max-height',height+'px');write(panel,'min-height','0px');
    write(sc,'flex','1 1 0%');write(sc,'min-height','0px');write(sc,'overflow-y','auto');
    if(owned&&panel.contains(focus)){
     const target=focus.closest('.community-comment-form')||focus;
     const bounds=sc.getBoundingClientRect(),r=target.getBoundingClientRect(),bottom=Math.min(bounds.bottom,top+height)-12;
     if(r.bottom>bottom)sc.scrollTop+=r.bottom-bottom;
    }
   }
  }
 }
 return {sync,dispose(){restore();if(app.dataset)setState(false);}};
}
