# 동작하는 안전지도 — 운영 버전 관리

최신 운영 버전의 원천은 `package.json`(버전 번호)과 `src/app-release-log.json`(변경 내역·등급)입니다. 생성 파일은 `scripts/stamp-version.mjs`가 동기화합니다.

## 변경 규모 기준

| 등급 | 증가 규칙 | 판정 기준 |
|---|---|---|
| Major | 9.0.0 | 기존 API·데이터 계약·저장 형식·핵심 사용자 흐름과의 하위 호환성을 깨거나 마이그레이션이 필요한 핵심 아키텍처 변경 |
| Minor | 8.27.0 | 기존 기능과 호환되는 신규 사용자 기능·데이터 연동·독립 사용자 흐름 또는 넓은 UX 구조 개편 |
| Patch | 8.26.1 | 오류·레이아웃·접근성·성능·안정성·테스트·외부 동작을 바꾸지 않는 내부 리팩터링 |

한 PR에 여러 변경이 섞이면 가장 높은 등급을 적용합니다. 파일 개수나 수정 줄 수만으로 판정하지 않습니다.

## AI 릴리스 분류

- `.github/workflows/dongjak-ai-semver-classifier.yml`가 앱 코드가 포함된 PR의 변경 파일·diff·설명을 Gemini로 분석합니다.
- Gemini는 `major | minor | patch | none`, 근거, 신뢰도, 릴리스 노트를 구조화해 반환합니다.
- Major는 호환성 파괴가 확인될 때만 허용합니다. 신뢰도가 기준 미만이거나 출력 형식이 잘못되면 자동 발급하지 않고 검토를 요청합니다.
- 분류 결과로 `package.json`, `package-lock.json`, `src/app-release-log.json`과 생성 버전 파일을 갱신하고 테스트한 뒤 PR 브랜치에 반영합니다.
- 같은 PR이 다시 업데이트되면 `sourcePr`를 기준으로 기존 항목을 갱신해 버전이 매번 중복 증가하지 않도록 합니다.
- 자동 분류에 필요한 `GEMINI_API_KEY`는 비공개 앱 저장소의 Actions Secret으로 등록해야 합니다. 공개 테스트 저장소의 Secret은 비공개 저장소에서 직접 읽을 수 없습니다.
- AI 분류는 릴리스 등급·변경 내역만 처리합니다. Production 배포나 PR 병합은 수행하지 않습니다.

## 수동 대체 절차

AI 서비스가 중단되거나 분류 신뢰도가 낮을 때만 담당자가 변경 규모를 판단하고 다음 명령을 사용합니다.

- `npm run version:major -- "변경사항"`
- `npm run version:minor -- "변경사항"`
- `npm run version:patch -- "변경사항"`

여러 변경사항은 여러 문자열 인자로 전달합니다. 한 릴리스에는 가장 높은 등급 하나만 적용합니다.

## 검증 순서

1. `npm run check:release`
2. `npm test`
3. `npm run build`
4. Preview 브라우저 검증
5. 사용자 승인 후 별도 Production 배포 절차 진행

Production 배포는 이 분류 워크플로에서 자동 실행되지 않습니다.
