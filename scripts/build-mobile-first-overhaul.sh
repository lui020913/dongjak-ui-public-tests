#!/usr/bin/env bash
set -euo pipefail
REQUEST="$GITHUB_WORKSPACE/release/mobile-first-overhaul-request.json"
SOURCE_SHA="$GITHUB_SHA"
APP_VERSION="$(jq -er '.application_version' "$REQUEST")"
test "$(jq -er '.source' "$REQUEST")" = "public-app"
test "$(git -C "$GITHUB_WORKSPACE" rev-parse HEAD)" = "$SOURCE_SHA"
test -n "$VITE_SUPABASE_URL"
test -n "$VITE_SUPABASE_PUBLISHABLE_KEY"
work="$RUNNER_TEMP/public-application"
mkdir -m 700 "$work"
git -C "$GITHUB_WORKSPACE" archive "$SOURCE_SHA" app | tar -x -C "$work" --strip-components=1
git -C "$work" init -q
git -C "$work" add -f .
cd "$work"
test "$(node -p "require('./package.json').version")" = "8.26.1"
test -f wrangler.toml
grep -Fq "import './v914-mobile-ux-fixes.css';" src/main.js
grep -Fq "import './public-ui-production-overlay.css';" src/main.js
grep -Fq "public-ui-mobile-surface-coordinator.js" src/main.js
cp "$GITHUB_WORKSPACE/frontend/production/mobile-first-overhaul.css" src/mobile-first-overhaul.css
node "$GITHUB_WORKSPACE/scripts/apply-mobile-only-gate.mjs" "$work"
echo "CHECKPOINT: mobile-only visual gate applied"
node --input-type=module <<'NODE'
import {readFileSync,writeFileSync} from 'node:fs';
const path='src/main.js';
const source=readFileSync(path,'utf8');
const anchor="import './v914-mobile-ux-fixes.css';";
if(source.split(anchor).length!==2) throw new Error('Expected exactly one final mobile CSS import anchor');
if(source.includes("import './mobile-first-overhaul.css';")) throw new Error('Mobile overhaul already injected');
writeFileSync(path,source.replace(anchor,anchor+String.fromCharCode(10)+"import './mobile-first-overhaul.css';"));
NODE
echo "CHECKPOINT: mobile CSS import injected"
node "$GITHUB_WORKSPACE/scripts/apply-mobile-17-followup.mjs" "$work"
node --check src/mobile-17-followup.js
node "$GITHUB_WORKSPACE/scripts/apply-mobile-next.mjs" "$work"
node --check src/mobile-next.js
node --check src/main.js
node --check src/workers/dongjak-walk-worker.mjs
node --check src/lib/dongjakWalkSlopeRouter.mjs
cp "$GITHUB_WORKSPACE/frontend/production/mobile-next-build.test.mjs" tests/mobile-next-build.test.mjs
cp "$GITHUB_WORKSPACE/frontend/production/mobile-followup-build.test.mjs" tests/mobile-followup-build.test.mjs
git diff --check
echo "CHECKPOINT: whitespace check passed"
expected_changes="$(printf '%s\n' index.html src/dj-v8212-sheet-controller.js src/dongjak-local-routing.js src/dongjak-verified-data-layers.js src/lib/dongjakWalkSlopeRouter.mjs src/main.js src/map-appearance.js src/mobile-first-overhaul.css src/pedestrian-tools.js src/place-details.js src/public-ui-mobile-surface-coordinator.js src/transport-map.js src/v815-map-product.js src/v815-route-planner.js src/v824-favorites-cloud.js src/v831-swipe-feature-toolbar.js src/v840-coordinated-ui.js src/v860-onboarding.js src/workers/dongjak-walk-worker.mjs | LC_ALL=C sort)"
actual_changes="$(git diff --name-only | LC_ALL=C sort)"
echo "Expected changed files: $expected_changes"
echo "Actual changed files: $actual_changes"
if [ "$actual_changes" != "$expected_changes" ]; then echo "::error::Unexpected source change list"; exit 1; fi
echo "CHECKPOINT: changed-file allowlist passed"
# The public app snapshot is still 8.26.1. Reconstruct the released
# 9.0.0 entry before issuing the new patch, rather than mislabelling it 8.26.2.
release_kind="$(jq -er '.release_kind' "$REQUEST")"
requested_version="$APP_VERSION"
if [[ "$APP_VERSION" =~ ^9\.2\.([0-9]+)$ ]] && (( BASH_REMATCH[1] >= 18 )) && [ "$release_kind" = patch ]; then
  APP_VERSION=9.2.17
fi
if { [ "$APP_VERSION" = "9.0.1" ] && [ "$release_kind" = "patch" ]; } || { [ "$APP_VERSION" = "9.1.0" ] && [ "$release_kind" = "minor" ]; } || { [ "$APP_VERSION" = "9.1.1" ] && [ "$release_kind" = "patch" ]; } || { [ "$APP_VERSION" = "9.1.2" ] && [ "$release_kind" = "patch" ]; } || { [ "$APP_VERSION" = "9.1.3" ] && [ "$release_kind" = "patch" ]; } || { [ "$APP_VERSION" = "9.2.0" ] && [ "$release_kind" = "minor" ]; } || { [ "$APP_VERSION" = "9.2.1" ] && [ "$release_kind" = "patch" ]; } || { [ "$APP_VERSION" = "9.2.2" ] && [ "$release_kind" = "patch" ]; } || { [ "$APP_VERSION" = "9.2.3" ] && [ "$release_kind" = "patch" ]; } || { [ "$APP_VERSION" = "9.2.4" ] && [ "$release_kind" = "patch" ]; } || { [ "$APP_VERSION" = "9.2.5" ] && [ "$release_kind" = "patch" ]; } || { [ "$APP_VERSION" = "9.2.6" ] && [ "$release_kind" = "patch" ]; } || { [ "$APP_VERSION" = "9.2.7" ] && [ "$release_kind" = "patch" ]; } || { [ "$APP_VERSION" = "9.2.8" ] && [ "$release_kind" = "patch" ]; } || { [ "$APP_VERSION" = "9.2.9" ] && [ "$release_kind" = "patch" ]; } || { [ "$APP_VERSION" = "9.2.10" ] && [ "$release_kind" = "patch" ]; } || { [ "$APP_VERSION" = "9.2.11" ] && [ "$release_kind" = "patch" ]; } || { [ "$APP_VERSION" = "9.2.12" ] && [ "$release_kind" = "patch" ]; } || { [ "$APP_VERSION" = "9.2.13" ] && [ "$release_kind" = "patch" ]; } || { [ "$APP_VERSION" = "9.2.14" ] && [ "$release_kind" = "patch" ]; } || { [ "$APP_VERSION" = "9.2.15" ] && [ "$release_kind" = "patch" ]; } || { [ "$APP_VERSION" = "9.2.16" ] && [ "$release_kind" = "patch" ]; } || { [ "$APP_VERSION" = "9.2.17" ] && [ "$release_kind" = "patch" ]; }; then
  node scripts/bump-app-version.mjs major "모바일 상단 기능 고정 및 사용자 바로가기 최대 3개 설정" "첫 실행 권한 안내 및 음성 장소 검색" "최단·경사 회피·지하철 연계·잠정 종합 경로 비교" "주변 안전정보·잠금 표시·교통 정보·업데이트 UI 개선" >/dev/null
  node scripts/bump-app-version.mjs patch "모바일 창 공통 상승·하강 애니메이션 통합, 중복 페이드 제거 및 레이어 헤더 드래그 확장·축소" >/dev/null
  if [ "$APP_VERSION" = "9.1.0" ] || [ "$APP_VERSION" = "9.1.1" ] || [ "$APP_VERSION" = "9.1.2" ] || [ "$APP_VERSION" = "9.1.3" ] || [ "$APP_VERSION" = "9.2.0" ] || [ "$APP_VERSION" = "9.2.1" ] || [ "$APP_VERSION" = "9.2.2" ] || [ "$APP_VERSION" = "9.2.3" ] || [ "$APP_VERSION" = "9.2.4" ] || [ "$APP_VERSION" = "9.2.5" ] || [ "$APP_VERSION" = "9.2.6" ] || [ "$APP_VERSION" = "9.2.7" ] || [ "$APP_VERSION" = "9.2.8" ] || [ "$APP_VERSION" = "9.2.9" ] || [ "$APP_VERSION" = "9.2.10" ] || [ "$APP_VERSION" = "9.2.11" ] || [ "$APP_VERSION" = "9.2.12" ] || [ "$APP_VERSION" = "9.2.13" ] || [ "$APP_VERSION" = "9.2.14" ] || [ "$APP_VERSION" = "9.2.15" ] || [ "$APP_VERSION" = "9.2.16" ] || [ "$APP_VERSION" = "9.2.17" ]; then
    node scripts/bump-app-version.mjs minor "모바일 통합 V11: 탭·시트·권한·주변정보·날씨·제보 UI 안정화" "선로 기반 실시간 지하철 위치 추정 및 방향별 아이콘·열차 정보창 추적" "지도 조작 안내 페이드·로딩 진행 표시·PC 및 태블릿 모바일 이용 안내 개선" >/dev/null
  fi
  if [ "$APP_VERSION" = "9.1.1" ] || [ "$APP_VERSION" = "9.1.2" ] || [ "$APP_VERSION" = "9.1.3" ] || [ "$APP_VERSION" = "9.2.0" ] || [ "$APP_VERSION" = "9.2.1" ] || [ "$APP_VERSION" = "9.2.2" ] || [ "$APP_VERSION" = "9.2.3" ] || [ "$APP_VERSION" = "9.2.4" ] || [ "$APP_VERSION" = "9.2.5" ] || [ "$APP_VERSION" = "9.2.6" ] || [ "$APP_VERSION" = "9.2.7" ] || [ "$APP_VERSION" = "9.2.8" ] || [ "$APP_VERSION" = "9.2.9" ] || [ "$APP_VERSION" = "9.2.10" ] || [ "$APP_VERSION" = "9.2.11" ] || [ "$APP_VERSION" = "9.2.12" ] || [ "$APP_VERSION" = "9.2.13" ] || [ "$APP_VERSION" = "9.2.14" ] || [ "$APP_VERSION" = "9.2.15" ] || [ "$APP_VERSION" = "9.2.16" ] || [ "$APP_VERSION" = "9.2.17" ]; then
    node scripts/bump-app-version.mjs patch "모바일 정보창 안전영역 및 열차 위치 추적 보완" "보행안전 창 닫기와 선택 레이어 상태 분리" "권한·검색·길찾기·소식·내 정보 UI와 다크 테마 개선" "iOS 웹 상태 표시줄 경계 및 열차 아이콘 선명도 보완" >/dev/null
  fi
  if [ "$APP_VERSION" = "9.1.2" ] || [ "$APP_VERSION" = "9.1.3" ] || [ "$APP_VERSION" = "9.2.0" ] || [ "$APP_VERSION" = "9.2.1" ] || [ "$APP_VERSION" = "9.2.2" ] || [ "$APP_VERSION" = "9.2.3" ] || [ "$APP_VERSION" = "9.2.4" ] || [ "$APP_VERSION" = "9.2.5" ] || [ "$APP_VERSION" = "9.2.6" ] || [ "$APP_VERSION" = "9.2.7" ] || [ "$APP_VERSION" = "9.2.8" ] || [ "$APP_VERSION" = "9.2.9" ] || [ "$APP_VERSION" = "9.2.10" ] || [ "$APP_VERSION" = "9.2.11" ] || [ "$APP_VERSION" = "9.2.12" ] || [ "$APP_VERSION" = "9.2.13" ] || [ "$APP_VERSION" = "9.2.14" ] || [ "$APP_VERSION" = "9.2.15" ] || [ "$APP_VERSION" = "9.2.16" ] || [ "$APP_VERSION" = "9.2.17" ]; then
    node scripts/bump-app-version.mjs patch "기본지도 행정동 잠금 숨김 및 하단탭 방향 전환 안정화" "알약형 하단탭과 공통 버튼 그림자·다크 테마 보완" "소개·업데이트 창 페이드와 3자리 버전 표시" "iOS 상태바 경계, 영어 UI, AI 검색창·설정 개선" >/dev/null
  fi
  if [ "$APP_VERSION" = "9.1.3" ] || [ "$APP_VERSION" = "9.2.0" ] || [ "$APP_VERSION" = "9.2.1" ] || [ "$APP_VERSION" = "9.2.2" ] || [ "$APP_VERSION" = "9.2.3" ] || [ "$APP_VERSION" = "9.2.4" ] || [ "$APP_VERSION" = "9.2.5" ] || [ "$APP_VERSION" = "9.2.6" ] || [ "$APP_VERSION" = "9.2.7" ] || [ "$APP_VERSION" = "9.2.8" ] || [ "$APP_VERSION" = "9.2.9" ] || [ "$APP_VERSION" = "9.2.10" ] || [ "$APP_VERSION" = "9.2.11" ] || [ "$APP_VERSION" = "9.2.12" ] || [ "$APP_VERSION" = "9.2.13" ] || [ "$APP_VERSION" = "9.2.14" ] || [ "$APP_VERSION" = "9.2.15" ] || [ "$APP_VERSION" = "9.2.16" ] || [ "$APP_VERSION" = "9.2.17" ]; then
    node scripts/bump-app-version.mjs patch "주변 안전정보 높이 안정화 및 시설 선택 지도 위치 보정" "시설 위치핀·목록 복귀·동일 명칭 구분 개선" >/dev/null
  fi
  if [ "$APP_VERSION" = "9.2.0" ] || [ "$APP_VERSION" = "9.2.1" ] || [ "$APP_VERSION" = "9.2.2" ] || [ "$APP_VERSION" = "9.2.3" ] || [ "$APP_VERSION" = "9.2.4" ] || [ "$APP_VERSION" = "9.2.5" ] || [ "$APP_VERSION" = "9.2.6" ] || [ "$APP_VERSION" = "9.2.7" ] || [ "$APP_VERSION" = "9.2.8" ] || [ "$APP_VERSION" = "9.2.9" ] || [ "$APP_VERSION" = "9.2.10" ] || [ "$APP_VERSION" = "9.2.11" ] || [ "$APP_VERSION" = "9.2.12" ] || [ "$APP_VERSION" = "9.2.13" ] || [ "$APP_VERSION" = "9.2.14" ] || [ "$APP_VERSION" = "9.2.15" ] || [ "$APP_VERSION" = "9.2.16" ] || [ "$APP_VERSION" = "9.2.17" ]; then
    node scripts/bump-app-version.mjs minor "기기별 지도 렌더링 최적화 및 화면 밖 건물 캐시 관리" "웹사이트 이용 방식 선택창 및 Android·iOS 배포 기반" "기본지도 스타일 유지·임시 기본지도 안내·야간시야 차폐 보존" >/dev/null
  fi
  if [ "$APP_VERSION" = "9.2.1" ] || [ "$APP_VERSION" = "9.2.2" ] || [ "$APP_VERSION" = "9.2.3" ] || [ "$APP_VERSION" = "9.2.4" ] || [ "$APP_VERSION" = "9.2.5" ] || [ "$APP_VERSION" = "9.2.6" ] || [ "$APP_VERSION" = "9.2.7" ] || [ "$APP_VERSION" = "9.2.8" ] || [ "$APP_VERSION" = "9.2.9" ] || [ "$APP_VERSION" = "9.2.10" ] || [ "$APP_VERSION" = "9.2.11" ] || [ "$APP_VERSION" = "9.2.12" ] || [ "$APP_VERSION" = "9.2.13" ] || [ "$APP_VERSION" = "9.2.14" ] || [ "$APP_VERSION" = "9.2.15" ] || [ "$APP_VERSION" = "9.2.16" ] || [ "$APP_VERSION" = "9.2.17" ]; then
    node scripts/bump-app-version.mjs patch "웹사이트 전용 전체 화면 이용 방식 선택 페이지 및 알약형 버튼" "모바일·PC 접근 안내 통합, PWA와 네이티브 앱 직접 진입 유지" >/dev/null
  fi
  if [ "$APP_VERSION" = "9.2.2" ] || [ "$APP_VERSION" = "9.2.3" ] || [ "$APP_VERSION" = "9.2.4" ] || [ "$APP_VERSION" = "9.2.5" ] || [ "$APP_VERSION" = "9.2.6" ] || [ "$APP_VERSION" = "9.2.7" ] || [ "$APP_VERSION" = "9.2.8" ] || [ "$APP_VERSION" = "9.2.9" ] || [ "$APP_VERSION" = "9.2.10" ] || [ "$APP_VERSION" = "9.2.11" ] || [ "$APP_VERSION" = "9.2.12" ] || [ "$APP_VERSION" = "9.2.13" ] || [ "$APP_VERSION" = "9.2.14" ] || [ "$APP_VERSION" = "9.2.15" ] || [ "$APP_VERSION" = "9.2.16" ] || [ "$APP_VERSION" = "9.2.17" ]; then
    node scripts/bump-app-version.mjs patch "웹 시작 화면 흰색 안전지도 아이콘 통일" "Android·iOS 홈 화면 앱 아이콘을 기존 안전지도 원본으로 생성" >/dev/null
  fi
  if [ "$APP_VERSION" = "9.2.3" ] || [ "$APP_VERSION" = "9.2.4" ] || [ "$APP_VERSION" = "9.2.5" ] || [ "$APP_VERSION" = "9.2.6" ] || [ "$APP_VERSION" = "9.2.7" ] || [ "$APP_VERSION" = "9.2.8" ] || [ "$APP_VERSION" = "9.2.9" ] || [ "$APP_VERSION" = "9.2.10" ] || [ "$APP_VERSION" = "9.2.11" ] || [ "$APP_VERSION" = "9.2.12" ] || [ "$APP_VERSION" = "9.2.13" ] || [ "$APP_VERSION" = "9.2.14" ] || [ "$APP_VERSION" = "9.2.15" ] || [ "$APP_VERSION" = "9.2.16" ] || [ "$APP_VERSION" = "9.2.17" ]; then
    node scripts/bump-app-version.mjs patch "iPhone 앱 다운로드 추후 업데이트 예정 표시 및 네이티브 자동 빌드 중지" "iPhone 웹사이트와 PWA 이용 유지" >/dev/null
  fi
  if [ "$APP_VERSION" = "9.2.4" ] || [ "$APP_VERSION" = "9.2.5" ] || [ "$APP_VERSION" = "9.2.6" ] || [ "$APP_VERSION" = "9.2.7" ] || [ "$APP_VERSION" = "9.2.8" ] || [ "$APP_VERSION" = "9.2.9" ] || [ "$APP_VERSION" = "9.2.10" ] || [ "$APP_VERSION" = "9.2.11" ] || [ "$APP_VERSION" = "9.2.12" ] || [ "$APP_VERSION" = "9.2.13" ] || [ "$APP_VERSION" = "9.2.14" ] || [ "$APP_VERSION" = "9.2.15" ] || [ "$APP_VERSION" = "9.2.16" ] || [ "$APP_VERSION" = "9.2.17" ]; then
    node scripts/bump-app-version.mjs patch "Android 고정 서명 테스트 APK 자동 다운로드" "안드로이드 시스템 라이트·다크 아이콘 리소스 및 앱 이름 검증" >/dev/null
  fi
  if [ "$APP_VERSION" = "9.2.5" ] || [ "$APP_VERSION" = "9.2.6" ] || [ "$APP_VERSION" = "9.2.7" ] || [ "$APP_VERSION" = "9.2.8" ] || [ "$APP_VERSION" = "9.2.9" ] || [ "$APP_VERSION" = "9.2.10" ] || [ "$APP_VERSION" = "9.2.11" ] || [ "$APP_VERSION" = "9.2.12" ] || [ "$APP_VERSION" = "9.2.13" ] || [ "$APP_VERSION" = "9.2.14" ] || [ "$APP_VERSION" = "9.2.15" ] || [ "$APP_VERSION" = "9.2.16" ] || [ "$APP_VERSION" = "9.2.17" ]; then
    node scripts/bump-app-version.mjs patch "모바일 공통 버튼 및 레이어 헤더 개선" "상단 바로가기 추가 버튼 단일화와 커뮤니티 간격 개선" >/dev/null
  fi
  if [ "$APP_VERSION" = "9.2.6" ] || [ "$APP_VERSION" = "9.2.7" ] || [ "$APP_VERSION" = "9.2.8" ] || [ "$APP_VERSION" = "9.2.9" ] || [ "$APP_VERSION" = "9.2.10" ] || [ "$APP_VERSION" = "9.2.11" ] || [ "$APP_VERSION" = "9.2.12" ] || [ "$APP_VERSION" = "9.2.13" ] || [ "$APP_VERSION" = "9.2.14" ] || [ "$APP_VERSION" = "9.2.15" ] || [ "$APP_VERSION" = "9.2.16" ] || [ "$APP_VERSION" = "9.2.17" ]; then
    node scripts/bump-app-version.mjs patch "내 정보 글자 설정 및 AI 검색창 개선" "iOS 다크모드 상단 연결 개선" >/dev/null
  fi
  if [ "$APP_VERSION" = "9.2.7" ] || [ "$APP_VERSION" = "9.2.8" ] || [ "$APP_VERSION" = "9.2.9" ] || [ "$APP_VERSION" = "9.2.10" ] || [ "$APP_VERSION" = "9.2.11" ] || [ "$APP_VERSION" = "9.2.12" ] || [ "$APP_VERSION" = "9.2.13" ] || [ "$APP_VERSION" = "9.2.14" ] || [ "$APP_VERSION" = "9.2.15" ] || [ "$APP_VERSION" = "9.2.16" ] || [ "$APP_VERSION" = "9.2.17" ]; then
    node scripts/bump-app-version.mjs patch "지도 레이어 우선순위 통합 및 반복 렌더링 방지" >/dev/null
  fi
  if [ "$APP_VERSION" = "9.2.8" ] || [ "$APP_VERSION" = "9.2.9" ] || [ "$APP_VERSION" = "9.2.10" ] || [ "$APP_VERSION" = "9.2.11" ] || [ "$APP_VERSION" = "9.2.12" ] || [ "$APP_VERSION" = "9.2.13" ] || [ "$APP_VERSION" = "9.2.14" ] || [ "$APP_VERSION" = "9.2.15" ] || [ "$APP_VERSION" = "9.2.16" ] || [ "$APP_VERSION" = "9.2.17" ]; then
    node scripts/bump-app-version.mjs patch "Android 외부 APK 설치 제한 및 안전한 웹앱 대체 이용 안내" "이용 방식 선택 버튼 호버 및 터치 눌림 효과" >/dev/null
  fi
  if [ "$APP_VERSION" = "9.2.9" ] || [ "$APP_VERSION" = "9.2.10" ] || [ "$APP_VERSION" = "9.2.11" ] || [ "$APP_VERSION" = "9.2.12" ] || [ "$APP_VERSION" = "9.2.13" ] || [ "$APP_VERSION" = "9.2.14" ] || [ "$APP_VERSION" = "9.2.15" ] || [ "$APP_VERSION" = "9.2.16" ] || [ "$APP_VERSION" = "9.2.17" ]; then
    node scripts/bump-app-version.mjs patch "이용 방식 선택 버튼 클릭 영역 고정 및 PC 태블릿 안내 문구 정리" >/dev/null
  fi
  if [ "$APP_VERSION" = "9.2.10" ] || [ "$APP_VERSION" = "9.2.11" ] || [ "$APP_VERSION" = "9.2.12" ] || [ "$APP_VERSION" = "9.2.13" ] || [ "$APP_VERSION" = "9.2.14" ] || [ "$APP_VERSION" = "9.2.15" ] || [ "$APP_VERSION" = "9.2.16" ] || [ "$APP_VERSION" = "9.2.17" ]; then
    node scripts/bump-app-version.mjs patch "PC 태블릿 이용 안내 글자 크기 및 가독성 개선" >/dev/null
  fi
  if [ "$APP_VERSION" = "9.2.11" ] || [ "$APP_VERSION" = "9.2.12" ] || [ "$APP_VERSION" = "9.2.13" ] || [ "$APP_VERSION" = "9.2.14" ] || [ "$APP_VERSION" = "9.2.15" ] || [ "$APP_VERSION" = "9.2.16" ] || [ "$APP_VERSION" = "9.2.17" ]; then
    node scripts/bump-app-version.mjs patch "레이어 및 모바일 창 시각 오류 개선" "공통 닫기 버튼과 상단 기능 너비 개선" >/dev/null
  fi
  if [ "$APP_VERSION" = "9.2.12" ] || [ "$APP_VERSION" = "9.2.13" ] || [ "$APP_VERSION" = "9.2.14" ] || [ "$APP_VERSION" = "9.2.15" ] || [ "$APP_VERSION" = "9.2.16" ] || [ "$APP_VERSION" = "9.2.17" ]; then
    node scripts/bump-app-version.mjs patch "모바일 길찾기 주소 및 권한 개선" "로딩 진행률과 창 레이아웃 수정" >/dev/null
  fi
  if [ "$APP_VERSION" = "9.2.13" ] || [ "$APP_VERSION" = "9.2.14" ] || [ "$APP_VERSION" = "9.2.15" ] || [ "$APP_VERSION" = "9.2.16" ] || [ "$APP_VERSION" = "9.2.17" ]; then
    node scripts/bump-app-version.mjs patch "PC 태블릿 기기 안내 아이콘과 웹앱 QR 표시 개선" "버튼 즉시 반응과 Android 설치 안내 가독성 개선" >/dev/null
  fi
  if [ "$APP_VERSION" = "9.2.14" ] || [ "$APP_VERSION" = "9.2.15" ] || [ "$APP_VERSION" = "9.2.16" ] || [ "$APP_VERSION" = "9.2.17" ]; then
    node scripts/bump-app-version.mjs patch "이용 방식 선택 버튼의 선택 상태 및 접근성 표시" "Google Play 외부 Android 테스트 APK 보안 주의 문구 복원" "APK 미배포 상태에서도 Android 설치 안내와 웹앱 대안 제공" >/dev/null
  fi
  if [ "$APP_VERSION" = "9.2.15" ] || [ "$APP_VERSION" = "9.2.16" ] || [ "$APP_VERSION" = "9.2.17" ]; then
    node scripts/bump-app-version.mjs patch "Android 다운로드 릴리스 태그의 실제 Production 커밋 SHA 검증" "GitHub Release target_commitish 브랜치명 반환 호환" >/dev/null
  fi
  if [ "$APP_VERSION" = "9.2.16" ] || [ "$APP_VERSION" = "9.2.17" ]; then
    node scripts/bump-app-version.mjs patch "레이어 버튼 우측 고정 및 내 정보 메뉴 간격 통일" "바텀시트 전체 헤더 드래그 안정화" >/dev/null
  fi
  if [ "$APP_VERSION" = "9.2.17" ]; then
    node scripts/bump-app-version.mjs patch "레이어 바로가기 스위치와 이용 안내 정돈" "노선 지도 색상과 내 정보 그룹 통일" "공통 창 애니메이션 속도 조정" >/dev/null
  fi
else
  node scripts/bump-app-version.mjs "$(jq -er '.release_kind' "$REQUEST")" "모바일 상단 기능 고정 및 사용자 바로가기 최대 3개 설정" "첫 실행 권한 안내 및 음성 장소 검색" "최단·경사 회피·지하철 연계·잠정 종합 경로 비교" "주변 안전정보·잠금 표시·교통 정보·업데이트 UI 개선" >/dev/null
fi
APP_VERSION="$requested_version"
if [[ "$APP_VERSION" =~ ^9\.2\.([0-9]+)$ ]] && (( BASH_REMATCH[1] >= 18 )); then
  target_patch="${BASH_REMATCH[1]}"
  for ((patch=18; patch<=target_patch; patch++)); do
    case "$patch" in
      18) note="창 간 전환 복원 및 시설 정보창 중복 모션 정리";;
      19) note="탄성 헤더 제스처와 전환 연속성, 탭 및 로딩 피드백 개선";;
      20) note="다크 지하철 색상과 환승 배지 가독성, iOS 테마 재동기화 및 날씨창 개선";;
      21) note="보행안전 창 축소·열차 추적 및 프레임 기반 렌더링·서울시 공식 소식과 공개 커뮤니티";;
      22) note="상부 시점 열차 아이콘·선로 방향 회전·창 확대 축소 및 iOS 상단 연결 개선";;
      23) note="지하철 흰색 차체·곡면 전면 유리 및 호선 색 띠 형태 개선";;
      24) note="측면 시점 열차 창문 및 iOS 딤 처리 상단 블러 개선";;
      25) note="열차 전면 유리 위치 조정";;
      26) note="열차 전면 유리 사다리꼴 윤곽 개선";;
      27) note="열차 측면 원근과 전면부 실루엣 재설계";;
      28) note="버스 노선 선택 시 서울시 공식 운행 경로 표시 및 모바일 하단바 5열 안정화";;
      29) note="아이패드 홈 화면 웹앱 접속 제한 오류 및 하단바 선택 표시 애니메이션 수정";;
      30) note="iOS 웹앱 상단 딤 그라데이션 개선 및 아이패드 설치형 웹앱 접속 제한 복원";;
      *) note="모바일 안정성 및 상호작용 개선 (9.2.$patch)";;
    esac
    node scripts/bump-app-version.mjs patch "$note" >/dev/null
  done
fi
test "$(node -p "require('./package.json').version")" = "$APP_VERSION"
jq -e --arg version "$APP_VERSION" '.version==$version' public/version.json >/dev/null
echo "CHECKPOINT: version $APP_VERSION stamped"
test -s src/mobile-first-overhaul.css
echo "CHECKPOINT: mobile stylesheet exists"
safe=(env -i "PATH=$PATH" "HOME=$HOME" CI=true DONGJAK_UI_ONLY=1 "GITHUB_SHA=$SOURCE_SHA" "GITHUB_RUN_ID=$GITHUB_RUN_ID" "VITE_SUPABASE_URL=$VITE_SUPABASE_URL" "VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY")
log="$RUNNER_TEMP/private-build.log"
run_private(){
  title="$1"
  shift
  if "${safe[@]}" "$@" >"$log" 2>&1; then
    echo "$title passed"
  else
    echo "::error::$title failed; diagnostic output withheld"
    rm -f "$log"
    exit 1
  fi
  rm -f "$log"
}
run_private "Dependency installation" npm ci --no-audit --no-fund --prefer-offline
if "${safe[@]}" node "$GITHUB_WORKSPACE/scripts/run-mobile-regressions.mjs" "$work" >"$log" 2>&1; then
  node "$GITHUB_WORKSPACE/scripts/private-test-fingerprint.mjs" "$log"
  echo "Mobile/shared Node regression suite passed"
else
  node "$GITHUB_WORKSPACE/scripts/private-test-fingerprint.mjs" "$log"
  rm -f "$log"
  echo "::error::Mobile/shared Node regression suite failed; diagnostics withheld"
  exit 1
fi
rm -f "$log"
run_private "Public edition history and deployment-channel tests" node --test tests/release-editions.test.mjs
run_private "Application build" npm run build
run_private "Release consistency" npm run check:release
test -s dist/index.html
jq -e --arg version "$APP_VERSION" '.version==$version' dist/version.json >/dev/null
CSS_SHA="$(cat "$GITHUB_WORKSPACE/frontend/production/mobile-first-overhaul.css" "$GITHUB_WORKSPACE/frontend/production/mobile-17-followup.css" "$GITHUB_WORKSPACE/frontend/production/mobile-next.css" | sha256sum | cut -d' ' -f1)"
jq -n --arg source "$SOURCE_SHA" --arg public "$GITHUB_SHA" --arg css "$CSS_SHA" --arg version "$APP_VERSION" --arg build "$GITHUB_RUN_ID" --argjson beta "$(jq -er '.beta_number' "$REQUEST")" '{release_channel:"developer-beta",beta_number:$beta,source_commit:$source,public_ui_source_commit:$public,public_ui_overlay_sha256:$css,application_version:$version,build_run:$build,release_status:"CANDIDATE_PREVIEW_NOT_PRODUCTION"}' > dist/release-source.json
umask 077
tar -C "$RUNNER_TEMP/public-application" -czf "$RUNNER_TEMP/mobile-overhaul.tar.gz" dist functions server src package.json package-lock.json wrangler.toml
node "$GITHUB_WORKSPACE/scripts/seal-private-release.mjs" seal "$RUNNER_TEMP/mobile-overhaul.tar.gz" "$RUNNER_TEMP/mobile-overhaul.sealed" "$SOURCE_SHA"
rm -f "$RUNNER_TEMP/mobile-overhaul.tar.gz"
echo "source_sha=$SOURCE_SHA" >> "$GITHUB_OUTPUT"
echo "app_version=$APP_VERSION" >> "$GITHUB_OUTPUT"
echo "public_sha=$GITHUB_SHA" >> "$GITHUB_OUTPUT"
echo "css_sha=$CSS_SHA" >> "$GITHUB_OUTPUT"
rm -rf "$RUNNER_TEMP/public-application" "$RUNNER_TEMP/private-build.log"
echo "Public app source tested at exact commit; encrypted artifact created."
