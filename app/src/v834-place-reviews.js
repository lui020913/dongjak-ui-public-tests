/** v8.2.15 facility reviews: guest drafts are device-only, signed-in reviews
 * use the existing Supabase client and RLS-protected public.place_reviews.
 * Never report a device-only record as a shared/published review. */
import {getActiveCloudClient} from './v824-favorites-cloud.js';
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
function localWrite(key,record){
 try{localStorage.setItem(PREFIX+key,JSON.stringify([record]));return true;}catch{return false;}
}
function makeElement(tag,className,content){
 const el=document.createElement(tag);if(className)el.className=className;
 if(content!=null)el.textContent=content;return el;
}
export function installPlaceReviews(root,place){
 if(!root||!place||root.querySelector('.dj834-reviews'))return null;
 const key=reviewPlaceKey(place);if(!key)return null;
 const section=makeElement('section','dj834-reviews');
 const heading=makeElement('div','dj834-review-head');
 const title=makeElement('strong',null,'시설 방문 리뷰');
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
 const buttons=makeElement('div','dj834-review-buttons');const save=makeElement('button','dj834-review-submit','리뷰 저장');save.type='submit';const cancel=makeElement('button','dj834-review-cancel','취소');cancel.type='button';buttons.append(save,cancel);
 const consent=makeElement('p','dj834-review-disclaimer','로그인하지 않으면 이 기기에만 저장됩니다. 로그인 상태의 공개 리뷰는 서버에 리뷰 테이블이 설정된 경우에만 공유됩니다.');
 form.append(ratingLabel,bodyLabel,buttons,consent);
 const list=makeElement('div','dj834-review-list');section.append(heading,status,form,list);
 // Place the review action above the generated AI description.
 root.append(section);
 let alive=true;
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
   list.append(card);
  }
 };
 async function refresh(){
  const local=localRead(key);
  const client=getActiveCloudClient();
  if(!client){render(local,true);if(!local.length)list.append(makeElement('p','dj834-review-empty','아직 등록된 리뷰가 없습니다.'));return;}
  try{
   const {data,error}=await client.from('place_reviews').select('id,author_name,body,rating,created_at').eq('place_key',key).order('created_at',{ascending:false}).limit(20);
   if(error)throw error;
   render(Array.isArray(data)?data:[]);
   if(!data?.length&&!local.length)list.append(makeElement('p','dj834-review-empty','아직 등록된 리뷰가 없습니다.'));
   if(local.length){const note=makeElement('p','dj834-review-local-note','이 기기에만 저장된 리뷰');list.append(note);
      for(const item of local){const node=makeElement('p','dj834-review-local-body',`★ ${item.rating} · ${clean(item.body)}`);list.append(node);}}
  }catch{
   render(local,true);
   status.textContent='공개 리뷰 서버가 설정되지 않았거나 일시적으로 연결되지 않았습니다. 지금은 이 기기에 저장된 리뷰만 표시합니다.';
  }
 }
 write.addEventListener('click',()=>{form.hidden=!form.hidden;write.setAttribute('aria-expanded',String(!form.hidden));if(!form.hidden)rating.focus();});
 cancel.addEventListener('click',()=>{form.hidden=true;write.setAttribute('aria-expanded','false');});
 form.addEventListener('submit',async e=>{
  e.preventDefault();const error=validateReview(rating.value,body.value);
  if(error){status.textContent=error;return;}
  save.disabled=true;status.textContent='리뷰를 저장하고 있습니다…';
  const record={place_key:key,place_name:clean(place.name,90),rating:Number(rating.value),body:clean(body.value),created_at:new Date().toISOString()};
  let published=false,why='';const client=getActiveCloudClient();
  if(client){
   try{
    const {data:{session},error:sessionError}=await client.auth.getSession();
    if(sessionError)throw sessionError;
    if(session?.user?.id){
     const author=clean(session.user.user_metadata?.display_name||session.user.user_metadata?.full_name||'이용자',32);
     const payload={...record,user_id:session.user.id,author_name:author};
     delete payload.created_at;
     const {error:saveError}=await client.from('place_reviews').upsert(payload,{onConflict:'place_key,user_id'});
     if(saveError)throw saveError;
     published=true;
    }else why='로그인하지 않아';
   }catch{why='리뷰 서버가 준비되지 않았거나 연결되지 않아';}
  }else why='서버 연결이 없어';
  if(published){status.textContent='리뷰가 공개 서버에 저장되었습니다.';}
  else{
   const ok=localWrite(key,record);
   status.textContent=ok?`${why||'공개 서버를 이용할 수 없어'} 이 기기에만 저장했습니다. 다른 사용자는 볼 수 없습니다.`:'리뷰 저장에 실패했습니다. 기기 저장 공간을 확인해 주세요.';
  }
  save.disabled=false;form.hidden=false;
  if(published||localRead(key).length){form.hidden=true;write.setAttribute('aria-expanded','false');body.value='';rating.value='';}
  await refresh();
 });
 void refresh();return {element:section,close(){alive=false;}};
}
