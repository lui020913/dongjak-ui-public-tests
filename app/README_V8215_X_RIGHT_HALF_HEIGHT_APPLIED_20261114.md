# 동작구 안전지도 v8.2.15 — X 버튼 우측 배치 및 플로팅 시트 절반 높이 수정

기준: `DongjakApp_FULL_v8.2.15_HOME_HALF_SHEETS_KAKAO_REVIEWS_MERGED_20261114(1).zip` (v8.2.15)

## 이번 패치
- 모바일에서 길찾기·커뮤니티·내 기록·동작구 소식 헤더의 X 버튼이 오른쪽에 배치되도록 **기존 레이아웃 원본 CSS 자체 수정**
- 새 헤더 스타일이 빠져도 X 위치가 왼쪽으로 되돌아가지 않도록 fallback 스타일 수정
- 길찾기 단독 61dvh 규칙을 제거하여 다른 주 화면과 같은 50dvh 최대 높이 적용
- 모바일 공통 높이 토큰 `--dj829-sheet-max-height` 사용
- v8.2.15에서 추가된 리뷰·홈·카카오·개인화 코드 보존

## 적용 방법
압축 해제 후 `APPLY_PATCH.cmd` 실행하고, **v8.2.15 프로젝트 폴더**를 선택합니다.
파일 해시가 다르면 원본을 수정하지 않고 중단합니다. 수정 파일은 `_patch_backups` 폴더로 백업됩니다.
전체 통합본 ZIP을 쓰는 경우 이 패치를 추가 적용하지 마세요.

```powershell
npm ci
npm test
npm run check:release
npm run build
npm run deploy:pages
```

## 검증 결과
- 패치 적용본 `npm test`: **1205/1205 통과**
- `npm run check:release`: 통과 (v8.2.15, release log 136건)
- 패치 파일 해시: 모든 항목 검증
- 전체 Vite 빌드 / iPhone PWA 실기기 검사: 미완료
- 기존 Supabase 카카오 OAuth 인증 실패: 이번 CSS 패치 대상 아님. 서버 설정 별도 확인 필요
