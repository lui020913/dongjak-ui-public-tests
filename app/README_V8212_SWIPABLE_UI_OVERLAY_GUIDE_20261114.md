# 동작구 보행안전 지도 v8.2.12

기준: `DongjakApp_FULL_v8.2.11_STRUCTURAL_UI_OAUTH_FIX_20261114(1).zip`

## 통합 내용

- v8.2.11의 기존 카카오 OAuth 팝업/구조적 UI 수정 보존
- 이전 v8.2.11 스와이프 기능을 별도 JS/CSS로 추가: 원형 지도/보행안전 바로가기 43개, 좌우 스크롤, 가장자리 페이드, 우측 더보기 고정
- 모바일 지도 표시 옵션 패널: 하나의 내부 스크롤, 하위 지도 표시 설정 메뉴의 z-index/너비 충돌 정리, 하단 탭 뒤로 내용이 빠져나가지 않도록 처리
- 모바일 앱 로고: 원형 테마 버튼과 크기 유지, 이미지 중심 맞춤/클리핑 문제 방지
- 더보기 `···` 크기 확대 (아이콘만 변경, 버튼 크기 유지)
- 지도 조작 안내: 설명문 가중치 하향, 모바일에는 모바일 안내 우선 표시, iPhone 홈화면 안내는 펼침, 최근 업데이트 요약 간결화. PC 안내 문구는 소스에 보존
- 앱 버전 8.2.12 동기화

## 수정 범위

지도 데이터·경로안내·버스/지하철 API·Supabase/카카오 인증 로직에는 변경 없음.
실시간 차량 표시는 기존 데이터/API 설정과 연동됩니다. 이 패치는 새로운 차량 API를 추가하지 않습니다.

## 검증

- `npm test`: 1,170/1,170 성공
- `npm run check:release`: 통과
- 브라우저 CSS 레이아웃 검사: 320, 390, 430px 및 PC 1366px, 첫 표시 안내창 내부 스크롤 없음
- `npm run build`: 실행 환경에 vite 실행 파일이 없어 미완료; Windows에서 `npm ci`, `npm run build` 확인 필요

## 패치 적용

전체 ZIP을 새 폴더에 압축 해제하거나, 정확한 기준 ZIP 프로젝트에 델타 패치의 `APPLY_PATCH.cmd`를 실행합니다.
기준 `package.json` 버전/변경 파일 SHA-256을 확인하고, 패치 전 백업을 생성합니다.
문제 발생 시 `RESTORE_PATCH.cmd`로 복원합니다.

```powershell
npm ci
npm test
npm run check:release
npm run build
npm run dev
npm run deploy:pages
```

환경변수와 OAuth 비밀키는 ZIP에 포함되어 있지 않습니다. 기존 환경 파일의 값은 보호하고 저장소에 커밋하지 마세요.
