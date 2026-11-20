/* Notification-only worker: no fetch handler, cache, or mapping interception. */
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('push',event=>{
 let message;try{message=event.data?.json();}catch{return;}
 if(message?.kind!=='community-notice')return;
 event.waitUntil(self.registration.showNotification('동작하는 안전지도',{body:'새로운 커뮤니티 알림이 있습니다. 앱에서 확인해 주세요.',icon:'/icons/dongjak-light-192.png',tag:'dongjak-community-notice',data:{kind:'community-notice'}}));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 if(event.notification.data?.kind!=='community-notice')return;
 event.waitUntil((async()=>{const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});const win=windows.find(w=>{try{return new URL(w.url).origin===self.location.origin;}catch{return false;}});
 if(win){await win.focus();win.postMessage({kind:'community-notice-open'});}else await self.clients.openWindow('/#community-notices');})());
});
