import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
const dir = 'quality-report/screen-captures';
if (!existsSync(dir)) process.exit(0);
const reports = readdirSync(dir).filter(f => f.endsWith('.json')).map(f => JSON.parse(readFileSync(dir+'/'+f,'utf8')));
const findings = [];
for (const report of reports) {
  for (const screen of report.screens) {
    const label = report.viewport.name + ' / ' + screen.tab;
    if (screen.status !== 'captured') {
      findings.push({ screen: label, severity: 'review', issue: '화면 자동 진입 실패', evidence: screen.reason || screen.status });
      continue;
    }
    const m = screen.metrics || {};
    if (Number.isFinite(m.documentWidth) && Number.isFinite(m.viewportWidth) && m.documentWidth - m.viewportWidth > 2) {
      findings.push({ screen: label, severity: 'high', issue: '가로 오버플로', evidence: '문서 '+m.documentWidth+'px / 뷰포트 '+m.viewportWidth+'px' });
    }
    if (m.nav && m.nav.bottom > report.viewport.height + 2) {
      findings.push({ screen: label, severity: 'high', issue: '하단 내비게이션 화면 밖 배치', evidence: '하단 '+m.nav.bottom+'px / 화면 '+report.viewport.height+'px' });
    }
    if (m.nav && m.nav.width < 0.6 * report.viewport.width && report.viewport.width < 500) {
      findings.push({ screen: label, severity: 'review', issue: '모바일 하단 내비게이션 폭 확인 필요', evidence: '내비게이션 '+m.nav.width+'px' });
    }
  }
}
const lines = [
  '# 실제 운영 앱 자동 화면 점검 결과',
  '',
  '자동 측정 결과만 포함합니다. 미적 완성도는 캡처를 보고 별도로 판단해야 합니다.',
  '',
  '검사 화면 수: '+reports.reduce((n,r)=>n+r.screens.length,0),
  '캡처 성공 수: '+reports.reduce((n,r)=>n+r.screens.filter(s=>s.status==='captured').length,0),
  '발견 사항: '+findings.length,
  '',
  '| 화면 | 심각도 | 항목 | 측정 근거 |',
  '|---|---|---|---|',
  ...findings.map(f=>'| '+[f.screen,f.severity,f.issue,f.evidence].map(v=>String(v).replaceAll('|','/')).join(' | ')+' |'),
  '',
  '## 다음 검토',
  '1. index.html에서 각 화면을 시각적으로 검토합니다.',
  '2. 버스·지하철·시설 상세창은 별도 안정적 진입 시나리오를 구현합니다.',
  '3. 개선 코드가 실제 운영 앱에 적용됐는지 공개 시제품과 구별하여 검증합니다.'
];
writeFileSync(dir+'/findings.md',lines.join('\n')+'\n');
writeFileSync(dir+'/findings.json',JSON.stringify(findings,null,2));
console.log('Automated geometry findings: '+findings.length);
