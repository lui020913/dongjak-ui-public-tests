/** Live local news UI. No headlines are fabricated; failures are visible. */
export function formatNewsDate(value){
  if(!value)return '';
  const text=String(value);
  const normalized=/^\d{8}$/.test(text)?`${text.slice(0,4)}-${text.slice(4,6)}-${text.slice(6,8)}`:text;
  const date=new Date(normalized);
  return Number.isNaN(date.getTime())?normalized.slice(0,19):new Intl.DateTimeFormat('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'Asia/Seoul'}).format(date);
}

export function renderDongjakNewsItems(root,items,{openExternal=(url)=>window.open(url,'_blank','noopener,noreferrer')}={}){
  root.replaceChildren();
  if(!Array.isArray(items)||!items.length){
    const empty=document.createElement('p');
    empty.className='news-empty';
    empty.textContent='표시할 최신 소식이 없습니다. 잠시 후 다시 조회하거나 공식 사이트에서 확인해 주세요.';
    root.append(empty);
    return;
  }
  for(const item of items){
    if(!item||!item.title)continue;
    const article=document.createElement('article');
    article.className='dongjak-news-item';
    const imageUrl=typeof item.imageUrl==='string'&&/^https:\/\/[^\s]+$/i.test(item.imageUrl)?item.imageUrl:'';
    // Missing/blocked images are omitted entirely; headlines remain readable.
    if(imageUrl){
      const img=document.createElement('img');img.className='dongjak-news-thumb';
      img.alt=`${item.source||'언론사'} 제공 기사 사진`;img.loading='lazy';img.decoding='async';img.referrerPolicy='strict-origin-when-cross-origin';
      img.addEventListener('error',()=>{
        img.remove();article.classList.add('dongjak-news-no-image');
      },{once:true});
      article.append(img);
      img.src=imageUrl;
    }else article.classList.add('dongjak-news-no-image');
    const meta=document.createElement('div');meta.className='dongjak-news-item-meta';
    const source=document.createElement('span');source.textContent=String(item.source||'출처 미확인');
    const date=document.createElement('time');date.textContent=formatNewsDate(item.publishedAt);
    meta.append(source,date);
    const heading=document.createElement('strong');heading.textContent=String(item.title);
    article.append(meta,heading);
    // The Dongjak office API supplies no verified per-article link. Link to its official portal only.
    const url=item.url;
    if(typeof url==='string'&&/^https:\/\//i.test(url)){
      const button=document.createElement('button');button.type='button';
      button.className='dongjak-news-open';button.textContent='원문 보기 ↗';
      button.addEventListener('click',()=>openExternal(url));
      article.append(button);
    }
    root.append(article);
  }
}

export function initDongjakNews({app,onToast=()=>{}}={}){
  const root=document.getElementById('dongjak-news-list');
  const notice=document.getElementById('dongjak-news-status');
  const refreshButton=document.getElementById('dongjak-news-refresh');
  const buttons=[...document.querySelectorAll('[data-news-source]')];
  const sources={media:'지역 뉴스',official:'동작구청 소식'};
  let category='media';let busy=false;let activeController=null;let loadSequence=0;
  const latest=new Map();
  const storageKey='dongjak-news-verified-cache-v728';
  const maxStoredAge=24*60*60*1000;
  const saveVerifiedCache=()=>{
    try{localStorage.setItem(storageKey,JSON.stringify(Object.fromEntries(latest)));}catch{}
  };
  try{
    const archived=JSON.parse(localStorage.getItem(storageKey)||'{}');
    for(const type of ['media','official']){
      const row=archived?.[type];
      if(row && Number.isFinite(row.at) && Date.now()-row.at<maxStoredAge && Array.isArray(row.items) && row.items.length){
        latest.set(type,{...row,notice:`이전 수집 자료 · ${row.notice||'업데이트 확인 중'}`});
      }
    }
  }catch{}
  let preloadPromise=null;
  async function prefetch(){
    // Start both requests as soon as the map opens. Do not mutate the visible
    // news tab while another page/category is selected.
    if(preloadPromise)return preloadPromise;
    preloadPromise=Promise.allSettled(['media','official'].map(async type=>{
      const ctrl=new AbortController();const timeout=setTimeout(()=>ctrl.abort(),13000);
      try{
        const response=await fetch(`/api/transport/news?type=${type}`,{signal:ctrl.signal});
        if(!response.ok)throw new Error(`HTTP ${response.status}`);
        const data=await response.json();
        const stamp=data.updatedAt?`갱신 ${formatNewsDate(data.updatedAt)}`:'갱신 완료';
        const fallbackNote=data.fallback?' · 공식 보도자료 대체':'';
        latest.set(type,{at:Date.now(),items:data.items||[],notice:`${stamp}${data.stale?' · 이전 자료':''}${fallbackNote}`});
        saveVerifiedCache();
      }finally{clearTimeout(timeout);}
    }));
    return preloadPromise;
  }
  async function load({force=false}={}){
    if(document.hidden)return;
    const type=category;
    const seq=++loadSequence;
    if(busy){activeController?.abort();busy=false;}
    const stored=latest.get(type);
    if(!force && stored && Date.now()-stored.at<10*60*1000){
      // Switching back to a category must restore THAT category's headlines,
      // not leave the previous category visible behind a cache hit.
      renderDongjakNewsItems(root,stored.items);
      notice.textContent=stored.notice;
      refreshButton.disabled=false;
      return;
    }
    busy=true;refreshButton.disabled=true;
    // Do not blank the verified feed while a refresh is pending or failing.
    if(stored?.items?.length){
      renderDongjakNewsItems(root,stored.items);
      notice.textContent=`${stored.notice} · 새 소식 확인 중`;
    }else notice.textContent=`${sources[type]}를 조회하고 있습니다…`;
    const ctrl=new AbortController();activeController=ctrl;
    const timer=setTimeout(()=>ctrl.abort(),14500);
    try{
      const response=await fetch(`/api/transport/news?type=${type}${force?'&refresh=1':''}`,{signal:ctrl.signal});
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||`뉴스 서버 오류 HTTP ${response.status}`);
      if(type!==category||seq!==loadSequence)return;
      renderDongjakNewsItems(root,data.items||[]);
      const stamp=data.updatedAt?`갱신 ${formatNewsDate(data.updatedAt)}`:'갱신 완료';
      const fallbackNote=data.fallback?' · 언론 RSS 연결 불가: 동작구청 공식 보도자료 대체 표시':'';
      notice.textContent=`${stamp}${data.stale?' · 이전 수집 자료':''}${fallbackNote}`;
      latest.set(type,{at:Date.now(),items:data.items||[],notice:notice.textContent});
      saveVerifiedCache();
    }catch(error){
      if(type!==category||seq!==loadSequence)return;
      const errorLabel=error.name==='AbortError'?'서버 응답 시간 초과':error.message;
      if(stored?.items?.length){
        renderDongjakNewsItems(root,stored.items);
        notice.textContent=`이전 수집 자료 표시 · 최신 소식 조회 실패: ${errorLabel}`;
        return;
      }
      notice.textContent=`소식 조회 실패: ${errorLabel}`;
      root.replaceChildren();
      const hint=document.createElement('p');hint.className='news-empty';
      hint.textContent=type==='official'
        ? '구청 소식을 불러오지 못했습니다. 아래 공식 게시판에서 최신 소식을 확인할 수 있습니다.'
        : '지역 뉴스를 불러오지 못했습니다. 아래 링크에서 최신 지역 뉴스를 확인해 주세요.';
      root.append(hint);
      {const a=document.createElement('a');a.href=type==='official'?'https://www.dongjak.go.kr/portal/bbs/B0000022/list.do?menuNo=200638':'https://news.google.com/search?q=%EB%8F%99%EC%9E%91%EA%B5%AC&hl=ko&gl=KR&ceid=KR%3Ako';a.target='_blank';a.rel='noopener noreferrer';a.textContent=type==='official'?'공식 공지사항 게시판 열기':'지역 뉴스 원문 검색 열기';root.append(a);}
      if(force)onToast('소식 조회에 실패했습니다. 연결 상태를 확인해 주세요.');
    }finally{clearTimeout(timer);if(seq===loadSequence){busy=false;activeController=null;refreshButton.disabled=false;}}
  }
  buttons.forEach(button=>button.addEventListener('click',()=>{
    category=button.dataset.newsSource;
    buttons.forEach(b=>{
      const active=b===button;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));
    });
    // Preserve per-category prefetch and previously verified cached headlines.
    void load();
  }));
  refreshButton?.addEventListener('click',()=>{void load({force:true});});
  const timer=setInterval(()=>{if(app.dataset.tab==='news'&&!document.hidden)void load();},5*60*1000);
  timer?.unref?.();
  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden && app.dataset.tab==='news')void load();
  });
  return {open(){void load();},prefetch,destroy(){clearInterval(timer);}};
}
