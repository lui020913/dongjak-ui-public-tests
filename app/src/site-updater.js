// v17.9: Cloudflare Pages redeployment detection.
// This does not synchronize localStorage posts or points between devices.
import buildInfo from './build-info.json';
export function initSiteUpdateMonitor(){
  const banner=document.getElementById('site-update-banner');
  const reload=document.getElementById('site-update-reload');
  if(!banner||!reload)return;
  let busy=false;
  const check=async()=>{
    if(document.hidden || busy || !banner.hidden)return;
    busy=true;
    try{
      const url=`/version.json?check=${Date.now()}`;
      const response=await fetch(url,{cache:'no-store'});
      if(!response.ok)return;
      const latest=await response.json();
      if(latest?.builtAt && buildInfo?.builtAt && latest.builtAt!==buildInfo.builtAt)banner.hidden=false;
    }catch(error){
      // Offline visits continue normally; don't interrupt active map navigation.
      console.debug('[동작하는 안전지도] 배포 확인을 건너뜀',error?.message||error);
    }finally{busy=false;}
  };
  reload.addEventListener('click',()=>window.location.reload());
  const timer=setInterval(check,60000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)check();});
  window.addEventListener('beforeunload',()=>clearInterval(timer),{once:true});
  check();
}
