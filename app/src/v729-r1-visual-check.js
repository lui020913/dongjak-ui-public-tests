/** Optional visual diagnostics, isolated from the map initialization path.
 * Active ONLY on ?mapdiag=1. No map object or app state is mutated.
 */
const params = new URLSearchParams(location.search);
if (params.get('mapdiag') === '1') {
  const errors = [];
  addEventListener('error', event => errors.push({kind:'js',message:String(event.message||event.error||'error')}));
  addEventListener('unhandledrejection', event => errors.push({kind:'promise',message:String(event.reason?.message||event.reason||'rejection')}));
  function inspect() {
    const map = document.getElementById('map');
    const overlay = document.getElementById('map-startup-overlay');
    const rect = map?.getBoundingClientRect();
    const center = {x:Math.round(innerWidth/2),y:Math.round(innerHeight/2)};
    const stack = document.elementsFromPoint(center.x,center.y).slice(0,9).map(el=>({
      tag:el.tagName,id:el.id||'',className:typeof el.className==='string'?el.className.slice(0,160):'',
    }));
    const style = el => el ? {
      hidden:el.hidden,display:getComputedStyle(el).display,
      visibility:getComputedStyle(el).visibility,
      opacity:getComputedStyle(el).opacity,
      zIndex:getComputedStyle(el).zIndex,
      pointerEvents:getComputedStyle(el).pointerEvents,
    } : null;
    return {
      signature:'v729-r1-from-original-20261112',at:new Date().toISOString(),url:location.href,
      viewport:{width:innerWidth,height:innerHeight},
      map:{exists:!!map,rect:rect?{x:rect.x,y:rect.y,width:rect.width,height:rect.height}:null,
        ...style(map),canvasCount:map?.querySelectorAll('canvas').length||0},
      startupOverlay:style(overlay),
      startupOverlayBlocking:Boolean(overlay&&!overlay.hidden&&
        getComputedStyle(overlay).display!=='none'&&getComputedStyle(overlay).opacity!=='0'),
      centerStack:stack,errors
    };
  }
  function download(){
    const blob = new Blob([JSON.stringify(inspect(),null,2)],{type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download='dongjak-v729-r1-visual-diagnostics.json';
    a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  const panel=document.createElement('div');
  panel.id='v729-r1-diag-panel';
  panel.style.cssText='position:fixed;z-index:2147483000;bottom:90px;right:12px;max-width:270px;padding:10px 12px;background:#153b32;color:white;border-radius:12px;box-shadow:0 5px 18px #0004;font:12px/1.5 system-ui;';
  const title=document.createElement('strong');title.textContent='v7.9.0 · 화면 진단';
  const state=document.createElement('div');state.style.margin='6px 0';
  const button=document.createElement('button');button.type='button';button.textContent='JSON 저장';
  button.style.cssText='padding:7px 11px;border:0;border-radius:7px;background:#fff;color:#153b32;cursor:pointer';
  button.addEventListener('click',download);
  panel.append(title,state,button);
  function update(){const d=inspect();state.textContent=`캔버스 ${d.map.canvasCount}개 · 로딩 화면 ${d.startupOverlayBlocking?'표시 중':'해제됨'} · 오류 ${errors.length}개`;}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{document.body.append(panel);update();},{once:true});
  else{document.body.append(panel);update();}
  setTimeout(update,2500);
  setTimeout(update,8000);
}
