/** Cloudflare Pages Function: send the token holder a FIXED Kakao "my chat" message.
 * Only an explicitly authorized Kakao talk_message token works. No phone numbers,
 * arbitrary recipients or user-defined message content are accepted. Never log tokens.
 */
export async function onRequestPost({request}){
  const origin=request.headers.get('Origin');
  const appOrigin=new URL(request.url).origin;
  if(origin!==appOrigin)return new Response(JSON.stringify({message:'같은 사이트에서만 요청할 수 있습니다.'}),{status:403,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
  const auth=request.headers.get('Authorization')||'';
  const token=auth.startsWith('Bearer ')?auth.slice(7).trim():'';
  if(token.length<16||token.length>8192)return new Response(JSON.stringify({message:'카카오 인증 토큰이 필요합니다.'}),{status:401,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
  const body=await request.json().catch(()=>null);
  if(body?.event!=='interactive_kakao_login')return new Response(JSON.stringify({message:'지원하지 않는 요청입니다.'}),{status:400,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
  const now=new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date());
  const template={
    object_type:'text',
    text:`[동작하는 안전지도] 카카오 계정으로 새 로그인이 확인되었습니다.\n시각: ${now} (한국 시간)\n본인이 로그인한 경우에는 별도의 조치가 필요하지 않습니다.`,
    link:{web_url:appOrigin+'/',mobile_web_url:appOrigin+'/'},
    button_title:'지도 열기'
  };
  let result;
  try{
    const response=await fetch('https://kapi.kakao.com/v2/api/talk/memo/default/send',{
      method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/x-www-form-urlencoded;charset=utf-8'},
      body:new URLSearchParams({template_object:JSON.stringify(template)})
    });
    const data=await response.json().catch(()=>({}));
    result=response.ok&&data.result_code===0
      ?new Response(JSON.stringify({sent:true}),{status:200})
      :new Response(JSON.stringify({sent:false,message:response.status===403?'카카오톡 메시지 전송(talk_message) 동의·권한이 필요합니다.':'카카오 API에서 메시지를 발송하지 못했습니다.',code:Number.isInteger(data.code)?data.code:null}),{status:502});
  }catch{
    result=new Response(JSON.stringify({sent:false,message:'카카오톡 메시지 서버에 연결할 수 없습니다.'}),{status:502});
  }
  const headers=new Headers(result.headers);headers.set('Content-Type','application/json; charset=utf-8');headers.set('Cache-Control','no-store');
  return new Response(result.body,{status:result.status,headers});
}
