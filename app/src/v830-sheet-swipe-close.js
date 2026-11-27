const SHEETS=[
  // Route editor and comparison own explicit back/close actions; no legacy swipe-dismiss.
  {id:'participation-panel',handle:'.page-heading',close:'[data-close-page="participate"]'},
  {id:'news-panel',handle:'.page-heading',close:'#news-close-to-map'},
  {id:'mine-panel',handle:'.page-heading',close:'[data-close-page="mine"]'},
  {id:'overview-sheet',handle:'.sheet-top',close:'#overview-sheet-close'},
  {id:'admin-dong-picker',handle:'.admin-dong-heading',close:'#admin-dong-close'},
  {id:'transport-sheet',handle:'.sheet-head',close:'#transport-close'},
  {id:'detail-sheet',handle:'.handle,.detail-topline',close:'#close-detail'},
  {id:'entry-sheet',handle:'.handle,.entry-head',close:'#cancel-add'},
  {id:'pza-road-sheet',handle:'.pza-sheet-head',close:'#pza-road-close'},
  {id:'night-visibility-float',handle:'.night-visibility-float-head',close:'#night-visibility-float-stop'},
  {id:'version-history-modal',handle:'.version-history-head',close:'#version-history-close'},
];

const INTERACTIVE='button,a,input,textarea,select,label,summary,[role="button"],[data-close-page]';

function isVisible(node,win=window){
  if(!node||node.hidden)return false;
  const cs=win.getComputedStyle(node);
  return cs.display!=='none'&&cs.visibility!=='hidden';
}

function installSwipeToDismiss(doc=document,win=window){
  if(!doc||!win)return ()=>{};
  const cleanup=[];
  const mobile=()=>win.matchMedia?.('(max-width: 1079px)')?.matches||false;
  const attached=new WeakSet();
  const bind=(config)=>{
    const panel=doc.getElementById(config.id);
    if(!panel||attached.has(panel))return;
    const handle=panel.querySelector(config.handle);
    if(!handle)return;
    attached.add(panel);
    handle.classList.add('dj830-drag-handle');
    let drag=null;

    const reset=()=>{
      panel.classList.remove('dj830-sheet-dragging');
      panel.style.removeProperty('transform');
      panel.style.removeProperty('opacity');
      panel.style.removeProperty('transition');
    };
    const closePanel=()=>{
      const button=panel.querySelector(config.close)||doc.querySelector(config.close);
      if(button)button.click();
      else panel.hidden=true;
    };
    const cancel=()=>{drag=null;reset();};

    const onPointerDown=(event)=>{
      if(!mobile()||!isVisible(panel,win))return;
      if(event.button!=null&&event.button!==0&&event.pointerType==='mouse')return;
      if(event.target?.closest?.(INTERACTIVE))return;
      drag={
        pointerId:event.pointerId,
        startX:event.clientX,
        startY:event.clientY,
        lastY:event.clientY,
        lastTime:performance.now(),
        active:false,
      };
      handle.setPointerCapture?.(event.pointerId);
    };

    const onPointerMove=(event)=>{
      if(!drag||event.pointerId!==drag.pointerId)return;
      const dx=event.clientX-drag.startX;
      const dy=event.clientY-drag.startY;
      const now=performance.now();
      const deltaTime=Math.max(1,now-drag.lastTime);
      drag.velocity=(event.clientY-drag.lastY)/deltaTime;
      drag.lastY=event.clientY;
      drag.lastTime=now;
      if(!drag.active){
        if(dy<8)return;
        if(Math.abs(dx)>Math.abs(dy)){cancel();return;}
        drag.active=true;
        panel.classList.add('dj830-sheet-dragging');
      }
      const translate=Math.max(0,dy);
      const fade=Math.max(0.52,1-(translate/360));
      panel.style.transition='none';
      panel.style.transform=`translateY(${translate}px)`;
      panel.style.opacity=String(fade);
      event.preventDefault();
    };

    const finish=(event)=>{
      if(!drag||event.pointerId!==drag.pointerId)return;
      const dy=Math.max(0,event.clientY-drag.startY);
      const threshold=Math.max(96,Math.min(180,panel.getBoundingClientRect().height*0.2));
      const fastFlick=(drag.velocity||0)>0.8&&dy>36;
      const shouldClose=drag.active&&(dy>=threshold||fastFlick);
      drag=null;
      if(!shouldClose){
        panel.style.transition='transform 180ms ease, opacity 180ms ease';
        panel.style.transform='translateY(0px)';
        panel.style.opacity='1';
        win.setTimeout(reset,190);
        return;
      }
      panel.style.transition='transform 170ms ease, opacity 170ms ease';
      panel.style.transform=`translateY(${Math.max(dy,threshold)+28}px)`;
      panel.style.opacity='0';
      win.setTimeout(()=>{reset();closePanel();},175);
    };

    const onPointerCancel=()=>{if(drag)cancel();};
    handle.addEventListener('pointerdown',onPointerDown,{passive:true});
    handle.addEventListener('pointermove',onPointerMove,{passive:false});
    handle.addEventListener('pointerup',finish);
    handle.addEventListener('pointercancel',onPointerCancel);
    cleanup.push(()=>{
      handle.removeEventListener('pointerdown',onPointerDown);
      handle.removeEventListener('pointermove',onPointerMove);
      handle.removeEventListener('pointerup',finish);
      handle.removeEventListener('pointercancel',onPointerCancel);
    });
  };

  const connect=()=>{for(const item of SHEETS)bind(item);};
  connect();
  const app=doc.getElementById('app');
  const observer=app?new MutationObserver(connect):null;
  observer?.observe(app,{childList:true,subtree:true});
  cleanup.push(()=>observer?.disconnect());
  return ()=>cleanup.splice(0).forEach(fn=>{try{fn();}catch{}});
}

if(typeof document!=='undefined'&&typeof window!=='undefined'){
  const boot=()=>installSwipeToDismiss(document,window);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
}

export {installSwipeToDismiss};
