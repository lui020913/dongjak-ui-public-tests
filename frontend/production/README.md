# 기존 운영 앱과 호환되는 공개 UI 변경분

이 폴더는 독립 프런트엔드 시제품을 운영 앱으로 대체하기 위한 것이 **아닙니다**.

- `dongjak-production-overlay.css`만 기존 앱에 결합할 수 있는 승인 대상입니다.
- CSS는 공개 검증 스크립트 `frontend/scripts/check-production-overlay.mjs`의 셀렉터·속성 허용 목록을 통과해야 합니다.
- 스크립트나 네트워크 요청, 숨김/위치 강제, 외부 자원, 인증·API·GIS·지도 엔진 변경은 허용하지 않습니다.
- 실제 운영 앱은 기존의 비공개 검증된 소스에서 빌드됩니다. 공개 프로토타입의 `src/main.js` 또는 `src/styles.css`를 복사하지 않습니다.
- 기존 앱과 결합한 릴리스 후보는 별도 Cloudflare Preview에서 검사한 다음 Production 승격 여부를 판단합니다.
- `dongjak-safety-map` 비공개 저장소의 `.github/workflows/dongjak-public-ui-prod-gate.yml`이 매시간 49분에 변경된 CSS만 검사합니다.
- 현재 비교되는 기존 앱은 v8.9.1 검증 소스이며, 새로운 운영 릴리스가 등장하면 이 기준을 다시 검증·갱신해야 합니다.
- 변경사항이 없거나 회귀 테스트·비밀 설정 검증·Preview·운영 API/바인딩 검사 중 하나라도 실패하면 Production을 건드리지 않아야 합니다.
- 실제 Production 성공 여부는 해당 Actions 실행의 Production 작업 성공 및 Cloudflare 배포 ID와 HTTP 스모크 검증 결과를 확인해야 합니다.

**대상 정합성**: 이 파일은 데스크톱 검색·날씨 정렬, 모바일 바텀시트 제목·닫기 아이콘 정렬, 키보드 포커스 가시성처럼 기존 앱의 DOM에 실재하는 요소만 다룹니다. 전체 디자인 재편, JS 동작 변경, 애니메이션 컨트롤러, 복잡한 기능 이관은 별도 검토가 필요합니다.
