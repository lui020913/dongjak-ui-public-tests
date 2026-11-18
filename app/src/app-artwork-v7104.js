/** v7.10.4: switch supplied artwork between light/dark. */
export function installAppArtwork(doc=document){
  const app=doc.getElementById('app');if(!app)return ()=>{};
  const sync=()=>{
    const mode=app.dataset.theme==='dark'?'dark':'light';
    doc.querySelectorAll('img.dj-app-artwork').forEach(img=>{
      const target=`/icons/dongjak-${mode}-${img.closest('.map-startup-logo')?'512':'192'}.png`;
      if(img.getAttribute('src')!==target)img.setAttribute('src',target);
    });
    // The iPhone Home Screen icon uses its own background-free artwork and
    // must stay unchanged when the application theme changes.
    const manifest=doc.getElementById('dj-app-manifest');
    if(manifest)manifest.href=`/manifest-${mode}.webmanifest`;
  };
  const observer=new MutationObserver(sync);observer.observe(app,{attributes:true,attributeFilter:['data-theme']});sync();
  return ()=>observer.disconnect();
}
if(typeof document!=='undefined'){
  const start=()=>installAppArtwork();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
}
