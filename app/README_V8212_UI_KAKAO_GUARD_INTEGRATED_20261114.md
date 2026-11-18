# 동작구 보행안전 지도 v8.2.12 UI·카카오 인증 보강 통합본

기준 원본: DongjakApp_FULL_v8.2.12_SWIPABLE_UI_OVERLAY_GUIDE_20261114(1).zip
적용 패치: DongjakApp_PATCH_v8.2.12_UI_KAKAO_GUARD_APPLIED_20261114.zip

포함 내용: 모바일 공통 헤더/닫기버튼 정렬, 행정동 패널의 지도버튼 겹침 방지,
공통 스와이프 종료 제어, 카카오 OAuth URL 검증 및 오류 진단 메시지 개선.
기존 v8.2.12 메뉴/UI 및 지도 엔진은 유지합니다.

확인 결과:
- 원본 파일에 패치 적용 및 중복 적용 무변경 확인
- npm test: 1,173/1,173 PASS
- node scripts/check-release-version.mjs: 통과
- Vite 의존성 설치 불가 환경이므로 전체 빌드 및 iPhone 동작 미검증

주의: 카카오의 'Unable to exchange external code'가 Supabase 서버 설정 때문에 발생했다면,
코드 패치만으로 로그인 성공을 보장할 수 없습니다. Kakao REST API key/Client Secret,
Supabase Auth 설정, callback redirect 등을 관리자 화면에서 일치시켜야 합니다.
이 ZIP에는 .env.local 등의 개인 설정·비밀키가 포함되지 않습니다.

사용법: 압축 해제 후 기존 .env.local / .env.production.local을 필요한 위치에 별도 구성하고
npm ci && npm test && npm run build 로 확인하세요.
