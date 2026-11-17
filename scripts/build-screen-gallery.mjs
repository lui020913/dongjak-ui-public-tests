import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
const root = 'quality-report/screen-captures';
if (!existsSync(root)) process.exit(0);
const escape = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const reports = readdirSync(root).filter(x=>x.endsWith('.json')).map(x=>JSON.parse(readFileSync(root+'/'+x,'utf8'))).filter(r=>r.viewport && Array.isArray(r.screens));
const cards = reports.flatMap(report => report.screens.map(s => {
  const status = s.status === 'captured' ? '<img loading="lazy" src="'+encodeURIComponent(s.file)+'" alt="'+escape(s.tab)+'">' : '<p class="missing">화면 자동 탐색 미완료: '+escape(s.reason||s.status)+'</p>';
  const m = s.metrics || {};
  return '<article><h2>'+escape(report.viewport.name)+' / '+escape(report.theme||'unknown')+' / '+escape(s.tab)+'</h2>'+status+'<p>탭: '+escape(m.activeTab||'확인 불가')+' · 문서 폭: '+escape(m.documentWidth??'-')+'px · 뷰포트: '+escape(m.viewportWidth??'-')+'px</p></article>';
})).join('\n');
const html = `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>동작 안전지도 자동 화면 점검</title><style>body{font-family:system-ui,sans-serif;background:#f1f5f3;color:#163c31;margin:0;padding:24px}header{max-width:1100px;margin:auto}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px;max-width:1400px;margin:24px auto}article{background:white;border:1px solid #d5e1db;border-radius:16px;padding:14px;min-width:0}h2{font-size:16px}img{display:block;width:100%;height:440px;object-fit:contain;background:#e9eeeb;border-radius:10px}p{font-size:12px;color:#516b60}.missing{padding:30px;background:#fff2df;border-radius:8px}</style><header><h1>실제 운영 앱 화면별 자동 캡처</h1><p>GitHub Actions 익명 접속 결과. 시각적 품질 개선 판정 및 Production 코드 수정은 별도 단계입니다. 탐색 실패는 성공으로 표시하지 않습니다.</p></header><main>${cards}</main></html>`;
writeFileSync(root+'/index.html',html);
console.log('Screen inventory: '+reports.length+' viewport reports, '+reports.flatMap(x=>x.screens).filter(x=>x.status==='captured').length+' captures');
