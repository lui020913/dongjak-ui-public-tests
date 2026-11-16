import { existsSync, readdirSync, readFileSync, mkdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';

const clean = (value, limit = 160) => String(value ?? '')
  .replace(/https?:\/\/\S+/gi, '[URL]')
  .replace(/(?:github_pat_[A-Za-z0-9_]+|gh[pousr]_[A-Za-z0-9_]{16,})/g, '[REDACTED]')
  .replace(/[\r\n\t|<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, limit);

export function aggregate(dir = 'playwright-json', meta = {}) {
  const files = existsSync(dir) ? readdirSync(dir).filter(f => f.endsWith('.json')).sort() : [];
  const grouped = new Map(), failures = [], invalid = [], tests = [];
  for (const file of files) {
    let data;
    try {
      data = JSON.parse(readFileSync(join(dir, file), 'utf8'));
      if (!Array.isArray(data.suites) || !data.stats) throw Error('Invalid Playwright report');
    } catch (error) { invalid.push({file: clean(file), reason: clean(error.message)}); continue; }
    const viewports = new Map((data.config?.projects || []).map(p => [p.name, p.use?.viewport]));
    function scan(suites, parent = '') {
      for (const suite of suites || []) {
        for (const spec of suite.specs || []) {
          for (const test of spec.tests || []) {
            const project = clean(test.projectName || 'unassigned');
            const vp = viewports.get(test.projectName);
            const viewport = vp && Number.isFinite(vp.width) && Number.isFinite(vp.height)
              ? vp.width + '×' + vp.height : 'not supplied';
            const status = test.status === 'expected' ? 'passed'
              : test.status === 'unexpected' ? 'failed'
              : test.status === 'flaky' ? 'flaky'
              : test.status === 'skipped' ? 'skipped' : 'unknown';
            const key = project + '/' + viewport;
            const row = grouped.get(key) || {project, viewport, passed:0, failed:0, flaky:0, skipped:0, unknown:0};
            row[status] += 1;
            grouped.set(key, row);
            const attempts = test.results || [];
            const error = attempts.flatMap(r => r.errors || (r.error ? [r.error] : []))
              .map(e => clean(e.message || e.value || '', 190)).find(Boolean) || '';
            const item = {project, viewport, status, name:clean(parent + ' / ' + spec.title), retries:Math.max(0, attempts.length - 1),
              durationMs:attempts.reduce((n,r)=>n + (Number(r.duration)||0),0)};
            if (status === 'failed' || status === 'flaky' || status === 'unknown') {
              if (error) item.error = error;
              failures.push(item);
            }
            tests.push(item);
          }
        }
        scan(suite.suites, parent + ' / ' + suite.title);
      }
    }
    scan(data.suites);
  }
  const groups = [...grouped.values()].sort((a,b)=>a.project.localeCompare(b.project) || a.viewport.localeCompare(b.viewport));
  const counts = {passed:0,failed:0,flaky:0,skipped:0,unknown:0};
  for (const row of groups) for (const k of Object.keys(counts)) counts[k] += row[k];
  const total = tests.length;
  const verdict = (!total || invalid.length) ? 'NO_VALID_RESULTS'
    : (counts.failed || counts.flaky || counts.unknown) ? 'FAIL' : 'PASS';
  let host = 'not supplied';
  try { host = new URL(meta.targetUrl || '').hostname || host; } catch {}
  return {schemaVersion:1, generatedAt:new Date().toISOString(),
    scope:clean(meta.scope || 'targeted',40),
    sourceSha:/^[a-f0-9]{40}$/i.test(meta.sha || '') ? meta.sha : 'not supplied',
    targetHost:clean(host,90), verdict, total, counts, groups, tests, failures, invalid, files};
}

export function markdown(report) {
  const c = report.counts;
  const lines = [
    '## 동작 안전지도 · PC/모바일 자동 품질 보고서', '',
    '**결과: ' + report.verdict + '** · 테스트 범위: ' + report.scope,
    '대상 호스트: ' + report.targetHost + ' · 소스 SHA: ' + report.sourceSha, '',
    '**전체 ' + report.total + '건** · 통과 ' + c.passed + ' / 실패 ' + c.failed +
      ' / 불안정 ' + c.flaky + ' / 건너뜀 ' + c.skipped + ' / 미확인 ' + c.unknown, '',
    '| 브라우저 프로젝트 | 실제 실행 화면 크기 | 통과 | 실패 | 불안정 | 건너뜀 |',
    '| --- | --- | ---: | ---: | ---: | ---: |',
    ...report.groups.map(r => '| ' + r.project + ' | ' + r.viewport + ' | ' + r.passed +
      ' | ' + r.failed + ' | ' + r.flaky + ' | ' + r.skipped + ' |')
  ];
  if (!report.groups.length) lines.push('| 검사 결과 없음 | - | 0 | 0 | 0 | 0 |');
  if (report.failures.length) {
    lines.push('', '### 실패·불안정 테스트 (최대 15개)', '');
    for (const [index,f] of report.failures.slice(0,15).entries())
      lines.push((index+1) + '. **' + clean(f.project) + '** ' + clean(f.name) +
        ' [' + f.status + ', retry ' + f.retries + ']' + (f.error ? ' — ' + clean(f.error,175) : ''));
  }
  if (report.invalid.length || !report.total) {
    lines.push('', '### 보고서 오류', '');
    for (const issue of report.invalid) lines.push('- ' + issue.file + ': ' + issue.reason);
    if (!report.total) lines.push('- 유효한 Playwright 결과가 없습니다. 성공으로 판정하지 않습니다.');
  }
  lines.push('', '참고: 실제 검사한 프로젝트·화면만 표시하며 전체 기능 검증을 의미하지 않습니다. 개인 데이터·토큰·비공개 소스는 수집하지 않습니다.', '');
  return lines.join('\n');
}

if (process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href) {
  const data = aggregate('playwright-json', {
    scope:process.env.DONGJAK_AUDIT_SCOPE,
    sha:process.env.DONGJAK_EXPECTED_SOURCE_SHA,
    targetUrl:process.env.DONGJAK_TARGET_URL
  });
  const output = markdown(data);
  mkdirSync('quality-report', {recursive:true});
  writeFileSync('quality-report/summary.json', JSON.stringify(data,null,2)+'\n');
  writeFileSync('quality-report/summary.md', output);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY,output+'\n');
  console.log(output);
}