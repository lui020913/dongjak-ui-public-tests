// Only fixed, anonymous classification is permitted. Never pass raw logs or source to Gemini.
export const MAX_ATTEMPTS=3;
export const VIEWPORTS=Object.freeze(['mobile375','mobile390','tablet768','tablet820','tablet1024','tablet1180','pc1280','pc1440','pc1920']);
export const CATEGORIES=Object.freeze(['runner','network','browser-start','motion-timing','geometry','surface-state','theme','application-test','source-guard','build-test','build-deploy','unknown']);
export const ADVICE=Object.freeze({
 runner:'러너 또는 설치 환경 확인',network:'네트워크 연결 및 외부 서비스 확인','browser-start':'Chromium 실행 환경 확인','motion-timing':'애니메이션 프레임 및 타이밍 확인',geometry:'패널 크기·위치·CSS 충돌 검토','surface-state':'창 열림·닫힘 및 상태 전환 검토',theme:'테마 전환 및 색상 우선순위 검토','application-test':'실제 실패한 애플리케이션 동작 수정','source-guard':'최신 소스 및 Preview 일치 여부 확인','build-test':'실패한 단위 테스트 지문을 비공개 소스에서 확인','build-deploy':'빌드 또는 배포 실패 단계 확인',unknown:'로그를 확인하여 원인 분류'
});
export function sourcePin(title){
 const m=/^v911 UI source=([a-f0-9]{40}) build=([1-9][0-9]*)$/.exec(title||'');
 return m?{sha:m[1],build:m[2]}:null;
}
export function classify(job,log=''){
 const vp=/^ui \(([^)]+)\)$/.exec(job?.name||'')?.[1];
 const viewport=VIEWPORTS.includes(vp)?vp:null;
 const fails=(job.steps||[]).filter(s=>s.conclusion==='failure').map(s=>s.name||'');
 const has=s=>fails.some(n=>n.includes(s));
 let category='unknown';
 if(has('Verify exact Preview')||has('verify-release-source.mjs'))category='source-guard';
 else if(!viewport)category=has('Run full unit suite')?'build-test':'build-deploy';
 else if(has('Verify preinstalled Chromium')||/browserType\.launch:.*(Target page|Executable doesn't exist|Failed to launch)/i.test(log))category='browser-start';
 else if(has('Install pinned JS')||has('Set up job')||has('Initialize containers')||has('checkout@')||has('setup-node@')||has('cache@'))category='runner';
 else if(/TRANSIT_GRIP_DIAGNOSTIC|toBeGreaterThanOrEqual|toBeLessThan(?:OrEqual)?|toHaveCSS\('object-fit'/i.test(log))category='geometry';
 else if(/toBeHidden|toBeVisible|UI_HIT_DIAGNOSTIC/i.test(log))category='surface-state';
 else if(/background-color|data-theme.*dark/i.test(log))category='theme';
 else if(/net::ERR_(?:CONNECTION_RESET|TIMED_OUT|INTERNET_DISCONNECTED|NAME_NOT_RESOLVED)|ECONNRESET|ETIMEDOUT|EAI_AGAIN/i.test(log))category='network';
 else if(/at enter \(/.test(log)&&/toBeGreaterThan/.test(log)&&/window\.__auditFrames\.length/.test(log)&&!/\b[2-9]\s+failed\b/.test(log))category='motion-timing';
 else if(has('playwright test'))category='application-test';
 return {viewport,category};
}
export function recoveryDecision({attempt,diagnostics,exactCandidate,isUi}){
 if(!isUi||!exactCandidate||!Number.isInteger(attempt)||attempt<1||attempt>=MAX_ATTEMPTS||!diagnostics.length)return 'review';
 if(diagnostics.every(d=>['runner','network','browser-start'].includes(d.category)))return 'retry';
 if(attempt===1&&diagnostics.every(d=>d.category==='motion-timing'))return 'retry';
 return 'review';
}
export function modelInput(diagnostics){return diagnostics.map(d=>({viewport:VIEWPORTS.includes(d.viewport)?d.viewport:null,category:CATEGORIES.includes(d.category)?d.category:'unknown'}));}
