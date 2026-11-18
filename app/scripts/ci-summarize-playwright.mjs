import { readFileSync, existsSync, writeFileSync, mkdirSync, appendFileSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';

const outputFolder = 'test-results';
mkdirSync(outputFolder, { recursive: true });
const sourceFile = process.env.PLAYWRIGHT_JSON_OUTPUT_FILE || 'playwright-results.json';
const stats = {
  generatedAt: new Date().toISOString(),
  jsonReportPresent: existsSync(sourceFile),
  projectCases: 0,
  expected: 0,
  unexpected: 0,
  flaky: 0,
  skipped: 0,
  other: 0,
  failures: [],
  visual: { screens: 0, layoutWarnings: 0, interactionWarnings: 0, javascriptErrors: 0, byViewport: [] }
};
const failuresLimit = 30;

function scanSuites(suites) {
  for (const suite of suites || []) {
    for (const spec of suite.specs || []) {
      for (const test of spec.tests || []) {
        stats.projectCases++;
        const last = (test.results || []).at(-1);
        let status = test.status;
        if (!status) status = last?.status === 'passed' ? 'expected' : last?.status || 'other';
        if (status in stats && typeof stats[status] === 'number') stats[status]++;
        else stats.other++;
        if (status === 'unexpected' || status === 'failed' || status === 'timedOut') {
          if (stats.failures.length < failuresLimit) {
            stats.failures.push({
              project: test.projectName || 'unspecified',
              title: String(spec.title || spec.id || 'untitled').slice(0, 180),
              status,
              error: String(last?.error?.message || '').slice(0, 320)
            });
          }
        }
      }
    }
    scanSuites(suite.suites);
  }
}

if (stats.jsonReportPresent) {
  try {
    const report = JSON.parse(readFileSync(sourceFile, 'utf8'));
    scanSuites(report.suites);
  } catch (error) {
    stats.reportParseError = String(error.message || error).slice(0, 250);
  }
}

function scanDirectory(dir, depth = 0) {
  if (depth > 7 || !existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDirectory(path, depth + 1);
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith('-audit.json')) continue;
    try {
      const audit = JSON.parse(readFileSync(path, 'utf8'));
      const v = audit.viewport?.name || basename(entry.name, '-audit.json');
      const summary = audit.summary || {};
      const record = {
        viewport: v,
        screens: summary.capturedScreens || 0,
        layoutWarnings: summary.layoutWarnings || 0,
        interactionWarnings: summary.interactionWarnings || 0,
        javascriptErrors: summary.javascriptErrors || 0
      };
      stats.visual.byViewport.push(record);
      stats.visual.screens += record.screens;
      stats.visual.layoutWarnings += record.layoutWarnings;
      stats.visual.interactionWarnings += record.interactionWarnings;
      stats.visual.javascriptErrors += record.javascriptErrors;
    } catch {}
  }
}
scanDirectory(outputFolder);
stats.visual.byViewport.sort((a, b) => a.viewport.localeCompare(b.viewport));

const lines = [
  '## 동작구 안전지도 · Playwright 자동 검사 결과',
  '',
  '검사 시각 (UTC): ' + stats.generatedAt,
  '',
  '| 검사 지표 | 값 |',
  '|---|---:|',
  '| Playwright 프로젝트별 테스트 | ' + stats.projectCases + ' |',
  '| 예상대로 완료된 테스트 | ' + stats.expected + ' |',
  '| 예상 밖 실패 | ' + stats.unexpected + ' |',
  '| 재시도 후 통과(flaky) | ' + stats.flaky + ' |',
  '| 건너뜀 | ' + stats.skipped + ' |',
  '| 저장된 UI 화면 | ' + stats.visual.screens + ' |',
  '| 레이아웃 경고 | ' + stats.visual.layoutWarnings + ' |',
  '| 상호작용 경고 | ' + stats.visual.interactionWarnings + ' |',
  '| JS 런타임 오류(수집) | ' + stats.visual.javascriptErrors + ' |',
  '',
  '레이아웃 경고는 잠재적 이상 징후이며, 실제 디자인 오류 확정이나 테스트 통과를 의미하지 않습니다.',
  ''
];
if (!stats.jsonReportPresent || stats.reportParseError) {
  lines.push('**주의:** Playwright JSON 보고서가 없거나 파싱되지 않았습니다. 테스트 실행 단계를 별도로 확인하세요.', '');
}
if (stats.visual.byViewport.length) {
  lines.push('### 해상도별 증거', '', '| 화면 | 캡처 | 레이아웃 경고 | 조작 경고 |',
    '|---|---:|---:|---:|');
  for (const v of stats.visual.byViewport) {
    lines.push('| ' + v.viewport + ' | ' + v.screens + ' | ' + v.layoutWarnings + ' | ' + v.interactionWarnings + ' |');
  }
  lines.push('');
}
if (stats.failures.length) {
  lines.push('### 실패한 테스트 (최대 30개)', '');
  for (const f of stats.failures) {
    const title = f.title.replace(/[|\r\n]/g, ' ');
    lines.push('- **' + f.project + '**: ' + title + ' (' + f.status + ')');
  }
  lines.push('');
}
lines.push('상세 스크린샷·Trace·HTML 보고서는 해당 Actions 실행의 Artifacts에서 다운로드하세요.');
const markdown = lines.join('\n') + '\n';
writeFileSync(join(outputFolder, 'ci-summary.json'), JSON.stringify(stats, null, 2), 'utf8');
writeFileSync(join(outputFolder, 'ci-summary.md'), markdown, 'utf8');
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown);
process.stdout.write(markdown);
