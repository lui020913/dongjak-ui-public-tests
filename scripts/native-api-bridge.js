/* Only same-origin API requests go to the fixed public Production host. */
(() => {
 const original=window.fetch.bind(window),base='https://dongjak-walk-safety-preview.pages.dev';
 window.fetch=async function(input,init){
 const u=new URL(input instanceof Request?input.url:String(input),location.href);
 if(u.protocol!==location.protocol||u.host!==location.host||!/^\/(api|routing)\//.test(u.pathname))return original(input,init);
 const request=new Request(input,init),cap=window.Capacitor;
 if(request.signal.aborted)throw new DOMException('Aborted','AbortError');
 if(!cap||typeof cap.nativePromise!=='function')throw Error('Native HTTP bridge unavailable');
 const headers=Object.fromEntries(request.headers),opts={url:base+u.pathname+u.search,method:request.method,headers,responseType:'text',connectTimeout:15000,readTimeout:30000};
 if(!['GET','HEAD'].includes(request.method)){const body=await request.text();opts.data=/application\/json/i.test(headers['content-type']||'')&&body?JSON.parse(body):body;}
 if(request.signal.aborted)throw new DOMException('Aborted','AbortError');
 let onAbort;
 try{const reply=await Promise.race([cap.nativePromise('CapacitorHttp','request',opts),new Promise((_,reject)=>{onAbort=()=>reject(new DOMException('Aborted','AbortError'));request.signal.addEventListener('abort',onAbort,{once:true});})]);const code=Number(reply.status);if(!Number.isInteger(code)||code<200||code>599)throw Error('Invalid native status');const body=request.method==='HEAD'||[204,205,304].includes(code)?null:typeof reply.data==='string'?reply.data:JSON.stringify(reply.data??null);return new Response(body,{status:code,headers:reply.headers||{}});}finally{if(onAbort)request.signal.removeEventListener('abort',onAbort);}
 };
})();
