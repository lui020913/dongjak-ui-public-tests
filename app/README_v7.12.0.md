# 동작하는 안전지도 v7.12.0 — 설정·테마 전환·야간 시야 UI 개선

## 적용 기준
- 사용자 첨부 **DongjakApp_FULL_v7.11.0_SAFETY_UX_PERFORMANCE_INTEGRATED_20261112.zip**
- 이 프로젝트를 바탕으로 한 전체 통합본 및 동일 기준 델타 패치입니다.

## 주요 내용
- 모바일: 검색창과 분리된 앱 로고를 누르면 지도 설정창 열기
- PC: 상단 설정 버튼으로 동일한 설정창 열기
- 공통 설정: 테마, 메뉴 글자 크기, 애니메이션 감소, 날씨 버튼, 지도 조작 버튼 (기기별 저장)
- 테마 및 야간 시야 전환: 라이트/다크 테마별 유리 카드·진행 애니메이션·중앙 안내
- 야간 시야 분석 패널: 카드형 설정, 슬라이더 가독성 향상, 세부 레이어·통계 접기
- PC: 도움말 물음표 강조, 지도 옵션과 보행안전 도구 버튼의 표면·모서리·테두리 통일

## 보호 항목
- src/main.js, src/transport-map.js, src/night-visibility-map.js, src/pedestrian-tools.js
  파일 내용은 사용자 첨부 v7.11.0과 바이트 단위로 동일합니다.
- 기존 보행안전 정보, 교통정보, 3D 건물 및 공개 데이터 파일 유지

## 검증
- npm test: 840/840 통과
- Chromium 독립 UI 검사: 320/390/430/699/1280px, 설정창 열기·닫기, 글자 옵션, 야간 시야 분석 노드 보존
- 실제 Vite 빌드: 실행 환경에 vite 없음 (vite: not found)
- 실제 iPhone PWA/Android 기기 렌더링: 미검증

## 로컬 실행
```powershell
npm ci
npm test
npm run build
npm run dev
```

기존 Cloudflare 배포본에는 적용하지 않았습니다.
