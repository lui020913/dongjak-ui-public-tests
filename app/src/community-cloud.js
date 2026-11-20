import {cloudConfiguration,getActiveCloudClient} from './v824-favorites-cloud.js';
const POST_FIELDS='id,title,body,nickname,category,photo,lng,lat,created_at';
const COMMENT_FIELDS='id,post_id,body,nickname,photo,created_at';
async function select(table,fields,params={}){
 const client=getActiveCloudClient();
 if(client){let q=client.from(table).select(fields);if(params.order)q=q.order(params.order,{ascending:false});if(params.limit)q=q.limit(params.limit);if(params.ids)q=q.in('post_id',params.ids);if(params.owner)q=q.eq('author_id',params.owner);const {data,error}=await q;if(error)throw error;return data||[];}
 const cfg=cloudConfiguration();if(!cfg.configured)throw new Error('공유 게시판 연결 설정 없음');
 const url=new URL(cfg.url.replace(/\/$/,'')+'/rest/v1/'+table);url.searchParams.set('select',fields);
 if(params.order)url.searchParams.set('order',params.order+'.desc');if(params.limit)url.searchParams.set('limit',String(params.limit));if(params.ids)url.searchParams.set('post_id','in.('+params.ids.join(',')+')');
 if(params.owner)throw new Error('로그인이 필요합니다.');
 const res=await fetch(url,{headers:{apikey:cfg.key},signal:AbortSignal.timeout(10000)});if(!res.ok)throw new Error('공유 게시판 HTTP '+res.status);return await res.json();
}
async function user(){const client=getActiveCloudClient();if(!client)return null;const {data,error}=await client.auth.getSession();if(error)throw error;const u=data.session?.user;return u&&!u.is_anonymous?u:null;}
export async function readSharedCommunity(){
 const rows=await select('community_posts',POST_FIELDS,{order:'created_at',limit:50}),ids=rows.map(x=>x.id);
 const u=await user().catch(()=>null);if(!ids.length)return {posts:[],authenticated:!!u};
 const [comments,counts,mine,liked]=await Promise.all([
 select('community_comments',COMMENT_FIELDS,{ids,order:'created_at',limit:500}),
 select('community_like_counts','post_id,likes',{ids}),
 u?select('community_posts','id',{owner:u.id}):[],
 u?select('community_likes','post_id',{owner:u.id,ids}):[]
 ]);
 return {authenticated:!!u,posts:rows.map(row=>({id:row.id,title:row.title,body:row.body,nickname:row.nickname,category:row.category,photo:row.photo,location:Number.isFinite(row.lng)&&Number.isFinite(row.lat)?{lng:row.lng,lat:row.lat}:null,created:Date.parse(row.created_at),shared:true,mine:mine.some(x=>x.id===row.id),likes:counts.find(x=>x.post_id===row.id)?.likes||0,liked:liked.some(x=>x.post_id===row.id),comments:comments.filter(x=>x.post_id===row.id).reverse().map(x=>({id:x.id,body:x.body,nickname:x.nickname,photo:x.photo,created:Date.parse(x.created_at)}))}))};
}
async function mutate(table,action,values,id){
 const u=await user(),client=getActiveCloudClient();if(!u||!client)throw new Error('로그인 후 이용해 주세요.');
 let q=client.from(table);if(action==='insert')q=q.insert(values);else q=q.delete().eq(table==='community_posts'?'id':'post_id',id).eq('author_id',u.id);
 const {error}=await q;if(error)throw error;
}
export async function publishCommunityPost(p){if(p.photo&&p.photo.length>600000)throw new Error('사진 크기가 큽니다. 사진을 다시 선택해 주세요.');return submitModerated({kind:'post',title:p.title,body:p.body,nickname:p.nickname,category:p.category,photo:p.photo,lng:p.location?.lng??null,lat:p.location?.lat??null});}
export const deleteSharedCommunityPost=id=>mutate('community_posts','delete',null,id);
export const setSharedCommunityLike=(id,liked)=>mutate('community_likes',liked?'insert':'delete',{post_id:id},id);
export const addSharedCommunityComment=(id,body,photo=null)=>submitModerated({kind:'comment',post_id:id,body,photo,nickname:'익명 주민'});
async function submitModerated(payload){
 const client=getActiveCloudClient();if(!client||!await user())throw new Error('로그인 후 이용해 주세요.');
 const {data,error}=await client.functions.invoke('community-moderation',{body:payload});
 if(error){let message;try{message=(await error.context?.json())?.error;}catch{}throw new Error(message||'AI 검사에 실패했습니다. 작성 내용을 다시 확인해주세요.');}
 if(!['published','removed','review'].includes(data?.state))throw new Error('검사 결과를 확인하지 못했습니다.');
 return data;
}
export async function readCommunityNotifications(){
 const client=getActiveCloudClient();if(!client||!await user())return [];
 const {data,error}=await client.from('community_notifications').select('id,kind,reason,created_at,read_at').order('created_at',{ascending:false}).limit(50);if(error)throw error;const notices=data||[];if(!notices.length)return [];
 const {data:appeals,error:appealError}=await client.from('community_moderation_appeals').select('id,notification_id,state').in('notification_id',notices.map(n=>n.id));if(appealError)throw appealError;
 return notices.map(n=>({...n,appeal:(appeals||[]).find(a=>a.notification_id===n.id)||null}));
}
export async function appealCommunityNotice(notificationId,message){
 const client=getActiveCloudClient();if(!client||!await user())throw new Error('로그인 후 이용해 주세요.');
 const body=String(message||'').trim();if(!body||body.length>500)throw new Error('이의제기 사유는 1~500자입니다.');
 const {error}=await client.from('community_moderation_appeals').insert({notification_id:notificationId,message:body});if(error)throw new Error('이의제기를 접수하지 못했습니다. 이미 접수했는지 확인해 주세요.');
}
export async function markCommunityNoticeRead(id){
 const client=getActiveCloudClient();if(!client||!await user())return;
 const {error}=await client.from('community_notifications').update({read_at:new Date().toISOString()}).eq('id',id);if(error)throw error;
}
export const isCommunitySignedIn=async()=>Boolean(await user().catch(()=>null));
