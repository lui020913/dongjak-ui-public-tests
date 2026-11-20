export const COMMUNITY_CATEGORIES = ['보행 불편','개선 제안','동네 질문','동네생활','생활정보','교통정보','자유게시판'];
export function makeCommunityPost({title,body,nickname,category,photo=null,location=null}, now=Date.now()) {
  const cleanCategory=COMMUNITY_CATEGORIES.includes(category)?category:'동네 질문';
  return {
    id: (globalThis.crypto?.randomUUID?.() || `${now}_${Math.random().toString(36).slice(2,9)}`),
    title:String(title||'').trim().slice(0,70),
    body:String(body||'').trim().slice(0,1200),
    nickname:String(nickname||'익명 주민').trim().slice(0,20)||'익명 주민',
    category:cleanCategory,
    photo:typeof photo==='string'&&photo.startsWith('data:image/jpeg;base64,')?photo:null,
    location:location&&Number.isFinite(location.lng)&&Number.isFinite(location.lat)?{lng:location.lng,lat:location.lat}:null,
    created:now, likes:0,liked:false,comments:[]
  };
}
export function updateCommunityLike(posts, id) {
  return posts.map(p=>p.id===id?{...p,liked:!p.liked,likes:Math.max(0,(p.likes||0)+(p.liked?-1:1))}:p);
}
export function appendCommunityComment(posts,id,body,now=Date.now()) {
  const post=posts.find(p=>p.id===id);
  if(!post || (post.comments||[]).length>=40)return null;
  const comment={id:`c_${now}_${Math.random().toString(36).slice(2,7)}`,nickname:'익명 주민',body:String(body||'').trim().slice(0,300),created:now};
  if(!comment.body)return null;
  return posts.map(p=>p.id===id?{...p,comments:[...(p.comments||[]),comment]}:p);
}
export function readCommunityPosts(raw) {
  try {
    const parsed=JSON.parse(raw||'[]');
    if(!Array.isArray(parsed))return [];
    return parsed.filter(p=>p&&typeof p.id==='string'&&typeof p.title==='string'&&typeof p.body==='string')
      .slice(0,35).map(p=>({
        id:p.id,title:p.title.slice(0,70),body:p.body.slice(0,1200),
        nickname:String(p.nickname||'익명 주민').slice(0,20),
        category:COMMUNITY_CATEGORIES.includes(p.category)?p.category:'동네 질문',
        photo:typeof p.photo==='string'&&p.photo.startsWith('data:image/jpeg;base64,')?p.photo:null,
        location:p.location&&Number.isFinite(p.location.lng)&&Number.isFinite(p.location.lat)?p.location:null,
        created:Number.isFinite(p.created)?p.created:0,
        likes:Number.isInteger(p.likes)?Math.max(0,p.likes):0,
        liked:!!p.liked,
        comments:Array.isArray(p.comments)?p.comments.filter(c=>c&&typeof c.body==='string').slice(0,40).map(c=>({id:String(c.id||''),nickname:'익명 주민',body:c.body.slice(0,300),created:Number.isFinite(c.created)?c.created:0})):[]
      }));
  }catch{return [];}
}
export function formatCommunityDate(timestamp) {
  return new Date(timestamp).toLocaleDateString('ko-KR',{month:'numeric',day:'numeric'});
}
