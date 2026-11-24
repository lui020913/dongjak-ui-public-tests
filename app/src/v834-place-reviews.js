/** Shared facility reviews use RLS-protected public.place_reviews.
 * Historical device records are read-only; failed publication retains the form. */
import {cloudConfiguration,getActiveCloudClient} from './v824-favorites-cloud.js';
const PREFIX='dj834_facility_reviews_v1:';
const clean=(value,max=800)=>String(value||'').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max);
export function reviewPlaceKey(place){
 const name=clean(place?.name,90).normalize('NFC').toLowerCase().replace(/\s+/g,' ');
 const lng=Number(place?.lng),lat=Number(place?.lat);
 if(!name||!Number.isFinite(lng)||!Number.isFinite(lat))return '';
 return `${name}|${lng.toFixed(5)},${lat.toFixed(5)}`;
}
export function validateReview(rating,body){
 const score=Number(rating),note=clean(body);
 if(!Number.isInteger(score)||score<1||score>5)return '별점은 1~5점으로 선택해 주세요.';
 if(note.length<5)return '리뷰 내용을 5자 이상 입력해 주세요.';
 if(note.length>800)return '리뷰는 800자 이내로 입력해 주세요.';
 return '';
}
function localRead(key){
 try{const raw=JSON.parse(localStorage.getItem(PREFIX+key)||'[]');return Array.isArray(raw)?raw.slice(-20):[];}catch{return [];}
}
function makeElement(tag,className,content){
 const el=document.createElement(tag);if(className)el.className=className;
 if(content!=null)el.textContent=content;return el;
}
async function signedReviewUser(client){
 const {data,error}=await client.auth.getSession();if(error)throw error;
 const user=data.session?.user;if(!user?.id||user.is_anonymous)throw Error('로그인 후 이용해 주세요.');return user;
}
export async function readMyPlaceReviews(){
 const client=getActiveCloudClient();if(!client)throw Error('서버 연결을 확인해 주세요.');
 const user=await signedReviewUser(client);
 const {data,error}=await client.from('place_reviews').select('id,place_key,place_name,author_name,rating,body,created_at').eq('user_id',user.id).order('created_at',{ascending:false});
 if(error)throw error;return data||[];
}
async function deleteOwnReview(id){
 const client=getActiveCloudClient();if(!client)throw Error('서버 연결을 확인해 주세요.');
 const user=await signedReviewUser(client);
 const {data,error}=await client.from('place_reviews').delete().eq('id',id).eq('user_id',user.id).select('id').single();
 if(error||!data?.id)throw error||Error('삭제를 확인하지 못했습니다.');
}
function reviewEditorPortal(form,status,placeName,onClose){
 const doc=form.ownerDocument,win=doc.defaultView;
 const host=makeElement('section','dj834-review-editor-portal');
 host.setAttribute('role','dialog');host.setAttribute('aria-modal','true');host.setAttribute('aria-label','리뷰 작성 및 수정');
 const top=makeElement('header','dj834-review-editor-header');
 top.append(makeElement('strong',null,placeName+' 리뷰'));
 const close=makeElement('button','dj834-review-cancel','닫기');close.type='button';top.append(close);
 const anchor=doc.createComment('review-form-origin');form.before(anchor);
 const statusAnchor=doc.createComment('review-status-origin');status.before(statusAnchor);
 const app=doc.getElementById('app'),wasInert=app?.inert;
 host.append(top,status,form);doc.body.append(host);doc.body.dataset.djReviewEditor='open';if(app)app.inert=true;
 const sync=()=>{const v=win.visualViewport;host.style.top=(v?.offsetTop||0)+'px';host.style.height=(v?.height||win.innerHeight)+'px';};
 let closed=false;
 const finish=()=>{if(closed)return;closed=true;
  if(host.contains(doc.activeElement))doc.activeElement.blur();
  win.visualViewport?.removeEventListener('resize',sync);win.visualViewport?.removeEventListener('scroll',sync);win.removeEventListener('resize',sync);
  anchor.replaceWith(form);statusAnchor.replaceWith(status);form.hidden=true;host.remove();delete doc.body.dataset.djReviewEditor;if(app)app.inert=wasInert;onClose?.();
 };
 close.addEventListener('click',finish);win.visualViewport?.addEventListener('resize',sync,{passive:true});win.visualViewport?.addEventListener('scroll',sync,{passive:true});win.addEventListener('resize',sync,{passive:true});sync();
 return finish;
}
export function installPlaceReviews(root,place,{history=false,onChange}={}){

 if(!root||!place||root.querySelector('.dj834-reviews'))return null;
 const key=history?place.place_key:reviewPlaceKey(place);if(!key)return null;
 const section=makeElement('section','dj834-reviews');
 const heading=makeElement('div','dj834-review-head');
 const title=makeElement('strong',null,history?place.place_name:'시설 방문 리뷰');
 const write=makeElement('button','dj834-review-open','리뷰 작성');write.type='button';
 heading.append(title,write);
 const status=makeElement('p','dj834-review-status','직접 방문한 경험을 기록할 수 있습니다.');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const form=makeElement('form','dj834-review-form');form.hidden=true;
 const ratingLabel=makeElement('label',null,'방문 평가');const rating=makeElement('select');rating.required=true;
 for(const [value,text] of [['','별점 선택'],['5','★★★★★ (5점)'],['4','★★★★☆ (4점)'],['3','★★★☆☆ (3점)'],['2','★★☆☆☆ (2점)'],['1','★☆☆☆☆ (1점)']]){
  const opt=makeElement('option',null,text);opt.value=value;rating.appendChild(opt);
 }
 ratingLabel.append(rating);
 const bodyLabel=makeElement('label',null,'리뷰 내용');const body=makeElement('textarea');body.required=true;body.minLength=5;body.maxLength=800;body.rows=3;body.placeholder='직접 방문한 경험과 시설 이용 정보를 작성해 주세요.';bodyLabel.append(body);
 const buttons=makeElement('div','dj834-review-buttons');const save=makeElement('button','dj834-review-submit','공개 리뷰 등록');save.type='submit';const cancel=makeElement('button','dj834-review-cancel','취소');cancel.type='button';buttons.append(save,cancel);
 const consent=makeElement('p','dj834-review-disclaimer','로그인 후 등록하면 리뷰와 표시 이름이 다른 이용자에게 공개됩니다. 서버 등록에 실패하면 작성 내용은 유지됩니다.');
 form.append(ratingLabel,bodyLabel,buttons,consent);
 const list=makeElement('div','dj834-review-list');section.append(heading,status,form,list);
 // Place the review action above the generated AI description.
 root.append(section);
 let alive=true,ownIds=new Set(),closeEditor=null,editingId=null;
 const openEditor=(record=null)=>{if(closeEditor)return;editingId=record?.id||null;rating.value=record?String(record.rating):'';body.value=record?.body||'';save.textContent=record?'리뷰 수정 저장':'공개 리뷰 등록';form.hidden=false;write.setAttribute('aria-expanded','true');closeEditor=reviewEditorPortal(form,status,history?place.place_name:place.name,()=>{closeEditor=null;write.setAttribute('aria-expanded','false');});};
 if(history)write.hidden=true;
 const render=(rows,local=false)=>{
  if(!alive)return;list.replaceChildren();
  for(const record of rows.slice(0,20)){
   const card=makeElement('article','dj834-review-item');
   const header=makeElement('div','dj834-review-item-head');
   const author=makeElement('strong',null,local?'이 기기 작성':clean(record.author_name,32)||'이용자');
   const stars=makeElement('span','dj834-review-stars','★'.repeat(Math.min(5,Math.max(1,Number(record.rating)||1))));
   header.append(author,stars);
   card.append(header,makeElement('p',null,clean(record.body)));
   const stamp=new Date(record.created_at||Date.now());
   if(Number.isFinite(stamp.getTime()))card.append(makeElement('small',null,stamp.toLocaleDateString('ko-KR')));
   if(!local&&ownIds.has(record.id)){
    const actions=makeElement('div','dj834-review-own-actions');
    const edit=makeElement('button',null,'수정');edit.type='button';edit.addEventListener('click',()=>openEditor(record));
    const del=makeElement('button',null,'삭제');del.type='button';del.addEventListener('click',async()=>{
     if(!window.confirm('이 리뷰를 삭제하시겠습니까?'))return;del.disabled=true;
     try{await deleteOwnReview(record.id);status.textContent='리뷰를 삭제했습니다.';await refresh();onChange?.();}
     catch{status.textContent='리뷰를 삭제하지 못했습니다.';del.disabled=false;}
    });actions.append(edit,del);card.append(actions);
   }
   list.append(card);
  }
 };
 async function refresh(){
  const local=history?[]:localRead(key);
  const client=getActiveCloudClient();
  try{
   let data;ownIds=new Set();
   if(client){try{const user=await signedReviewUser(client);const own=await client.from('place_reviews').select('id').eq('user_id',user.id).eq('place_key',key);if(!own.error)ownIds=new Set((own.data||[]).map(x=>x.id));}catch{}}
   if(history){const user=await signedReviewUser(client);const own=await client.from('place_reviews').select('id,place_key,place_name,author_name,rating,body,created_at').eq('user_id',user.id).eq('place_key',key);if(own.error)throw own.error;data=own.data||[];ownIds=new Set(data.map(x=>x.id));}
   else if(client){const response=await client.from('place_reviews').select('id,author_name,body,rating,created_at').eq('place_key',key).order('created_at',{ascending:false}).limit(20);if(response.error)throw response.error;data=response.data;}
   else{
    const cfg=cloudConfiguration();if(!cfg.configured)throw new Error('공개 서버 설정 없음');
    const url=new URL(cfg.url.replace(/\/$/,'')+'/rest/v1/place_reviews');
    url.searchParams.set('select','id,author_name,body,rating,created_at');url.searchParams.set('place_key','eq.'+key);url.searchParams.set('order','created_at.desc');url.searchParams.set('limit','20');
    const response=await fetch(url,{headers:{apikey:cfg.key},signal:AbortSignal.timeout(10000)});if(!response.ok)throw new Error('공개 리뷰 HTTP '+response.status);data=await response.json();
   }
   render(Array.isArray(data)?data:[]);
   if(!data?.length&&!local.length)list.append(makeElement('p','dj834-review-empty','아직 등록된 리뷰가 없습니다.'));
   if(local.length){const note=makeElement('p','dj834-review-local-note','이 기기에만 저장된 리뷰');list.append(note);
      for(const item of local){const node=makeElement('p','dj834-review-local-body',`★ ${item.rating} · ${clean(item.body)}`);list.append(node);}}
  }catch{
   render(local,true);
   status.textContent='공개 리뷰 서버가 설정되지 않았거나 일시적으로 연결되지 않았습니다. 지금은 이 기기에 저장된 리뷰만 표시합니다.';
  }
 }
 write.addEventListener('click',()=>openEditor());
 cancel.addEventListener('click',()=>closeEditor?.());
 form.addEventListener('submit',async e=>{
  e.preventDefault();if(save.disabled)return;const error=validateReview(rating.value,body.value);
  if(error){status.textContent=error;return;}
  save.disabled=true;status.textContent='리뷰를 저장하고 있습니다…';
  const record={place_key:key,place_name:clean(history?place.place_name:place.name,90),rating:Number(rating.value),body:clean(body.value),created_at:new Date().toISOString()};
  let published=false,why='';const client=getActiveCloudClient();
  if(client){
   try{
    const {data:{session},error:sessionError}=await client.auth.getSession();
    if(sessionError)throw sessionError;
    if(session?.user?.id&&!session.user.is_anonymous){
     const author=clean(session.user.user_metadata?.display_name||session.user.user_metadata?.full_name||'이용자',32);
     const payload={...record,user_id:session.user.id,author_name:author};
     delete payload.created_at;
     const {data:stored,error:saveError}=editingId
       ?await client.from('place_reviews').update({rating:record.rating,body:record.body,updated_at:new Date().toISOString()}).eq('id',editingId).eq('user_id',session.user.id).select('id').single()
       :await client.from('place_reviews').upsert(payload,{onConflict:'place_key,user_id'}).select('id').single();
     if(saveError||!stored?.id)throw saveError||new Error('서버 등록 확인 실패');
     published=true;
    }else why='로그인하지 않아';
   }catch{why='리뷰 서버가 준비되지 않았거나 연결되지 않아';}
  }else why='서버 연결이 없어';
  save.disabled=false;
  if(!published){
   status.textContent=(why||'공개 서버를 이용할 수 없어')+' 공개 등록하지 못했습니다. 로그인과 연결 상태를 확인해 주세요. 작성 내용은 유지됩니다.';
   form.hidden=false;return;
  }
  status.textContent='리뷰가 공개 서버에 저장되었습니다.';
  closeEditor?.();form.hidden=true;write.setAttribute('aria-expanded','false');body.value='';rating.value='';
  await refresh();onChange?.();
 });
 void refresh();return {element:section,close(){closeEditor?.();alive=false;}};
}
