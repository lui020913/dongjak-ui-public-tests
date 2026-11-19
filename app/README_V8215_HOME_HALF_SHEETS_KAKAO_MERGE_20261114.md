# v8.2.15 HOME_HALF_SHEETS + KAKAO + MY_INFO/REVIEWS merge

- 원본: DongjakApp_FULL_v8.2.14_HOME_HALF_SHEETS_KAKAO_INTEGRATED_20261114(1).zip
- 기능 패치: Dongjak_v8.2.15_MY_INFO_PLACE_REVIEWS_SHORTCUTS_DeltaPatch_20261114.zip
- 결과 버전: 8.2.15

## 병합 원칙
- 기존 홈(중앙 안전지도), 공통 하단 반쪽 패널 및 손잡이 스와이프, 행정동 선택, 지도 홈 초기화 로직 유지
- 카카오 OAuth 팝업 중복 인증 방지 및 Supabase Auth 진단 링크 유지
- 더보기 기능 상단표시 토글, 원형 버튼 가변폭, 내 정보/프로필, 시설 리뷰 추가
- 로그인 및 계정 관리는 기존 v824-favorites-cloud 모듈이 계속 담당. 리뷰 모듈은 같은 Supabase 클라이언트를 참조
- 대중교통 API, GPS, 지도 경로탐색 엔진은 변경하지 않음

## 시설 리뷰
- 로그인하지 않은 리뷰/서버 미설정 리뷰는 이 브라우저의 저장소에만 저장됩니다.
- 다른 사용자에게 리뷰를 공개하려면 Supabase SQL Editor에서 `supabase/place_reviews.sql`을 적용해야 합니다.
- 파일에 암호나 Supabase Secret을 포함하지 않았습니다. 이전에 설정한 환경변수는 별도로 유지하십시오.

## 검사 결과
- `npm test`: 1,203 / 1,203 통과
- `npm run check:release`: 8.2.15 통과
- JavaScript 문법검사: 통과
- npm ci --offline: 패키지 캐시에 yauzl이 없어 설치 불가
- Vite 전체 빌드, iPhone 실기기 및 실제 Supabase 서버 공유 동작: 미검증

## 로컬 실행 및 배포 (Windows PowerShell / VS Code)
```powershell
npm ci
npm test
npm run check:release
npm run build
npm run deploy:pages
```
