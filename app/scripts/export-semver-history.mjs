import {writeFileSync} from 'node:fs';
import {VERSION_HISTORY,RENUMBERED_VERSION_HISTORY,LATEST_APP_RELEASE} from '../src/version-history.js';
import {LEGACY_VERSION_HISTORY} from '../src/version-history-legacy.js';
const h=RENUMBERED_VERSION_HISTORY;
const pkg=JSON.parse(await (await import('node:fs/promises')).readFile(new URL('../package.json',import.meta.url),'utf8'));
if(pkg.version!==LATEST_APP_RELEASE.version.slice(1))throw new Error(`Version mismatch package ${pkg.version} != latest release ${LATEST_APP_RELEASE.version}`);
const root=new URL('../docs/',import.meta.url);
const lines=[`# 동작구 보행안전 지도 — 새 기준 전체 업데이트 내역`, '',
  `현재 서비스 버전: **${LATEST_APP_RELEASE.version}** · 과거 소급 이력 마지막: ${h[0].version} · 보존 기록 ${h.length}건 · 원문 변경사항 ${h.reduce((sum,r)=>sum+r.items.length,0)}건`,
  '', '과거 변경 기록을 소급 재분류한 기록이며, 표시된 새 번호가 실제 과거 배포에 사용되었다는 의미는 아닙니다.',
  '구버전 번호는 릴리스 간 추적용이며, 구버전에서 동일한 번호로 기록된 경우에도 새 번호는 각각 부여합니다.',
  '', '## 번호 규칙', '', '- Major(X.0.0): 새로운 주요 기능 체계나 핵심 구조 변경',
  '- Minor(X.Y.0): 신규 사용자 기능, 중간 규모 UI 개편',
  '- Patch(X.Y.Z): 기능 오류, 성능, 데이터, 표시·안정화 수정', '', '## 전체 이력 (오래된 순)', ''];
for(const release of [...h].reverse()){
  lines.push(`### ${release.version} — ${release.scale==='major'?'대규모':release.scale==='minor'?'기능 개선':'작은 수정'}`);
  lines.push(`이전 기록: ${release.sourceVersion}${release.sourceVersion==='v7.0.25'?' (이전 기록의 중복 번호)':''}`, '');
  for(const item of release.items)lines.push(`- ${item}`);
  lines.push('');
}
writeFileSync(new URL('./CHANGELOG_SEMVER_FULL.md',root),lines.join('\n'),'utf8');
const csv=['chronological_index,new_version,scale,old_version,change_count'];
for(const r of [...h].reverse())csv.push([r.sourcePosition,r.version,r.scale,r.sourceVersion,r.items.length].map(s=>`"${String(s).replaceAll('"','""')}"`).join(','));
writeFileSync(new URL('./VERSION_MIGRATION_MAP.csv',root),csv.join('\n')+'\n','utf8');
console.log(`Exported ${h.length} archived releases and ${h.reduce((n,x)=>n+x.items.length,0)} notes; live ${LATEST_APP_RELEASE.version}`);
