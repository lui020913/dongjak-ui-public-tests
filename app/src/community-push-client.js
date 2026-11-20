const workerPath='/community-push-sw.js';
export function communityPushSupported(){return typeof window!=='undefined'&&window.isSecureContext&&'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window&&!window.Capacitor?.isNativePlatform?.();}
function isOwn(reg){return [reg?.active,reg?.waiting,reg?.installing].some(w=>w&&new URL(w.scriptURL).pathname===workerPath);}
async function existingRegistration(){if(!communityPushSupported())return null;const r=await navigator.serviceWorker.getRegistration('/');return isOwn(r)?r:null;}
async function invoke(client,body){if(!client)throw new Error('로그인 후 이용해 주세요.');const {data,error}=await client.functions.invoke('community-push',{body});if(error){let message;try{message=(await error.context?.json())?.error;}catch{}throw new Error(message||'기기 알림 서버에 연결하지 못했습니다.');}return data;}
function keyBytes(value){return Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-value.length%4)%4)),c=>c.charCodeAt(0));}
export async function enableCommunityPush(client){
 if(!communityPushSupported())throw new Error('이 환경에서는 기기 알림을 지원하지 않습니다. iPhone은 홈 화면에 추가한 웹앱에서 이용해 주세요.');
 if(await window.Notification.requestPermission()!=='granted')throw new Error('알림 권한이 허용되지 않았습니다.');
 const state=await invoke(client,{kind:'status'});if(!state?.configured||!state.publicKey)throw new Error('기기 알림 발송을 준비 중입니다.');
 const previous=await navigator.serviceWorker.getRegistration('/');
 if(previous&&!isOwn(previous))throw new Error('기존 서비스 워커와의 알림 호환성을 확인해야 합니다.');
 await navigator.serviceWorker.register(workerPath,{scope:'/'});
 const reg=await navigator.serviceWorker.ready;if(!isOwn(reg))throw new Error('알림 준비에 실패했습니다.');
 let sub=await reg.pushManager.getSubscription();
 if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:keyBytes(state.publicKey)});
 try{await invoke(client,{kind:'subscribe',subscription:sub.toJSON()});}catch(e){await sub.unsubscribe().catch(()=>{});throw e;}
 return true;
}
export async function disableCommunityPush(client){
 const reg=await existingRegistration();const sub=await reg?.pushManager.getSubscription();if(!sub)return false;
 // Always revoke the browser subscription, even in offline logout.
 try{await invoke(client,{kind:'unsubscribe',endpoint:sub.endpoint});}finally{await sub.unsubscribe();}
 return true;
}
export async function installCommunityPushControl(parent,client,toast){
 if(!communityPushSupported()||!client)return;
 const {data,error}=await client.auth.getSession();if(error||!data.session?.user||data.session.user.is_anonymous||!parent.isConnected)return;
 const button=document.createElement('button');button.type='button';button.className='community-push-control community-filter';
 const reg=await existingRegistration();let subscribed=Boolean(await reg?.pushManager.getSubscription());
 const sync=()=>{button.textContent=subscribed?'기기 알림 끄기':'기기 알림 켜기';button.setAttribute('aria-pressed',String(subscribed));};
 sync();if(!parent.isConnected||parent.querySelector('.community-push-control'))return;parent.prepend(button);
 button.addEventListener('click',async()=>{button.disabled=true;try{if(subscribed){await disableCommunityPush(client);subscribed=false;toast('기기 알림을 해제했습니다.');}else{await enableCommunityPush(client);subscribed=true;toast('기기 알림을 등록했습니다.');}}catch(e){const r=await existingRegistration().catch(()=>null);subscribed=Boolean(await r?.pushManager.getSubscription().catch(()=>null));toast(e.message||'기기 알림 설정 실패');}finally{sync();button.disabled=false;}});
}
