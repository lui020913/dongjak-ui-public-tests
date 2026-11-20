// Only known mobile push provider hosts; never request arbitrary subscriber-supplied URLs.
export function validPushEndpoint(value){
 if(typeof value!=='string'||value.length<20||value.length>2048)return false;
 try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&!u.hash&&['fcm.googleapis.com','updates.push.services.mozilla.com','web.push.apple.com'].includes(u.hostname)&&u.pathname.length>1;}catch{return false;}
}
export function validPushSubscription(value){
 return Boolean(value&&validPushEndpoint(value.endpoint)&&/^[A-Za-z0-9_-]{87}$/.test(value.keys?.p256dh||'')&&/^[A-Za-z0-9_-]{22}$/.test(value.keys?.auth||''));
}
export const notificationPayload=()=>JSON.stringify({kind:'community-notice'});
