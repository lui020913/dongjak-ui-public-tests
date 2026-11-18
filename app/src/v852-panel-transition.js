/**
 * v8.5.2 shared fade helpers for small transient panels.
 * Hidden state remains the source of truth; the close animation completes
 * before the hidden attribute is applied, and stale timers cannot hide a panel
 * that the user has reopened.
 */
export function fadePanelIn(node,win=window){
  if(!node)return;
  const token=(Number(node.dataset.dj852TransitionToken)||0)+1;
  node.dataset.dj852TransitionToken=String(token);
  node.classList.remove('dj852-panel-fade-out','dj852-panel-fade-in');
  node.hidden=false;
  if(win.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches)return;
  void node.offsetWidth;
  node.classList.add('dj852-panel-fade-in');
  const clear=()=>{
    node.removeEventListener('animationend',onEnd);
    if(node.dataset.dj852TransitionToken!==String(token))return;
    node.classList.remove('dj852-panel-fade-in');
  };
  const onEnd=event=>{if(event.target!==node)return;clear();};
  node.addEventListener('animationend',onEnd);
  win.setTimeout(clear,280);
}
export function fadePanelOut(node,win=window,duration=190){
  if(!node||node.hidden)return;
  const token=(Number(node.dataset.dj852TransitionToken)||0)+1;
  node.dataset.dj852TransitionToken=String(token);
  node.classList.remove('dj852-panel-fade-in','dj852-panel-fade-out');
  if(win.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches){node.hidden=true;return;}
  void node.offsetWidth;
  node.classList.add('dj852-panel-fade-out');
  let finished=false;
  const finish=()=>{
    node.removeEventListener('animationend',onEnd);
    if(finished||node.dataset.dj852TransitionToken!==String(token))return;
    finished=true;node.hidden=true;node.classList.remove('dj852-panel-fade-out');
  };
  const onEnd=event=>{if(event.target!==node)return;finish();};
  node.addEventListener('animationend',onEnd);
  win.setTimeout(finish,duration+80);
}
