# v8.1.1 — PC·모바일 탭·닫기 버튼·아이콘·버전 이력 통합 보정

기준 ZIP: `DongjakApp_FULL_v8.26.0_FAVORITES_GROUPS_SUPABASE_20261113.zip` (기존 표시 v8.26.0)

## 주요 수정

1. 커뮤니티(우리 동네 이야기), 길찾기, 내 기록, 동작 소식 페이지의 X 버튼을 카드 우측 상단에 16px 간격으로 고정했습니다. 이전 CSS에서 중복 생성되던 X 유사 아이콘은 제거하고 `v817` 단일 SVG만 유지합니다.
2. `#app[data-tab]`을 유일한 실제 페이지 상태로 판단합니다. 안전지도 메뉴는 커뮤니티·내 기록 등 다른 페이지에서 강조되지 않으며 `aria-current`, `aria-selected`, `aria-pressed`도 동기화됩니다. 지도 엔진 `src/main.js`는 변경하지 않았고, 별도 `v827-navigation-state.js`가 감시합니다.
3. 안전지도·길찾기·커뮤니티·동작 소식·내 기록은 모두 24×24 SVG 캔버스를 쓰고 실제 그림은 22px, stroke-width 2.2로 정리했습니다. 지도 옵션·보행안전·도로폭 실행 아이콘도 기본 22px로 맞췄습니다. 기존 이벤트 핸들러는 그대로 유지합니다.

## 버전 체계 전면 재정리

과거 원본 번호는 `sourceVersion` 필드에 보존하며, 화면·앱 소개·패키지·잠금 파일·빌드 메타데이터·업데이트 내역은 동일한 새 번호를 사용합니다.

| 표시 버전 | 이전 기록 번호 | 변경 성격 |
| --- | --- | --- |
| **v8.1.1** | 이번 보정 | 닫기 X·선택 상태·아이콘·이력 정리 |
| v8.1.0 | v8.26.0 | 즐겨찾기 그룹·대중교통 저장·Supabase 인증 구조 |
| v8.0.6 | v8.25.0 | 교통·시설 정보 UI 수정 |
| v8.0.5 | v8.24.0 | 시설·PC·모바일 레이아웃 보정 |
| v8.0.4 | v8.0.3 후속 수정 | 닫기 아이콘·검색·안전도구·페이드 등 누적 수정 |
| v8.0.3 이전 | 기존 보관 기록 | 원본 버전 및 변경사항 보존 |

**SemVer 정책**: 기존 오류·디자인 보정은 patch(마지막 숫자 +1), 사용자 워크플로/큰 기능 변경은 minor(가운데 숫자 +1 후 patch=0), 호환되지 않는 지도 데이터 구조 변경은 major 검토. 이미 부여한 이력은 재사용하지 않습니다.

### 버전 일관성 자동 갱신

- `package.json`이 앱 버전의 단일 기준입니다.
- `src/app-release-log.json`이 표시용 변경 이력 기준입니다. 새 항목은 중복 작성하지 않습니다.
- `node scripts/stamp-version.mjs`로 앱 소개·버전 칩·`src/app-version.js`·`public/version.json`·`src/build-info.json`을 동기화합니다.
- `npm run check:release`로 실제 버전 일치를 검증합니다.
- 다음 작은 수정: `npm run version:patch -- "변경사항"`
- 다음 기능 개선: `npm run version:next -- "변경사항"`

## 적용 및 실행

전체 ZIP은 새 폴더에 압축을 풀고 사용하세요. 델타 패치는 **기존 v8.26.0 통합 ZIP과 파일 해시가 정확히 일치하는 폴더에만** 적용하며, 실행 전 원본 변경 파일 백업을 생성합니다.

```powershell
npm ci
npm test
npm run check:release
npm run build
npm run deploy:pages
```

서버 접속 설정은 기존의 `.env.production.local`을 유지하고, 패치로 덮어쓰지 마세요. Supabase SQL 및 즐겨찾기 서버 연결은 기존 v8.26 기능을 유지합니다.

## 검증 범위

- 전체 자동 테스트 **1,072/1,072** 통과.
- 기존 지도 코어 `src/main.js`, MapLibre 스타일과 교통정보 렌더링 소스의 바이트가 기준 파일과 동일한 상태를 확인했습니다.
- `node scripts/check-release-version.mjs` 통과.
- 작업 환경의 Vite 미설치로 최종 번들 빌드는 미완료. Chromium 실행은 로컬 URI 접근 정책으로 차단되어 실제 브라우저 화면에서 픽셀 위치까지 검증하지 못했습니다.
