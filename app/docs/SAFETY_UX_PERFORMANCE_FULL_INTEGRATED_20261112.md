# v7.11.0 보행안전 UI·가독성·성능 개선 통합본

원본: DongjakApp_FULL_v7.11.0_MOBILE_PC_UI_INTEGRATED_20261112(1).zip
통합 내용: Dongjak_v7110_SafetyUX_Performance_DeltaPatch_20261112.zip 의 manifest.json에 기재된 파일 9개를 검증하여 직접 반영했습니다.

- 보행안전 레이어의 개별 아이콘·밀집 숫자 배지 디자인 일관화
- 중복 데이터 요청 억제, 지도 시각화용 경사도 GeoJSON 경량화
- 테마색 iOS형 켜기/끄기 스위치 및 글꼴 크기·굵기 설정
- 검색 버튼 가로폭 확대, 모바일 안전/옵션 플로팅 창 제목 여백 조정
- 기존 src/main.js 및 다른 원본 파일은 그대로 유지

## 실행
압축 해제한 폴더에서 `npm ci` → `npm test` → `npm run build` → `npm run dev` 순서로 실행합니다.
로컬 확인 후 Cloudflare 배포를 진행하세요. 환경변수/API 키는 원본 안내대로 별도 설정해야 합니다.

## 주의
이 통합본에는 별도의 패치를 적용할 필요가 없습니다. 기존 프로젝트 폴더에 파일을 섞어 덮어쓰지 말고 새 폴더에 압축 해제해 사용하세요.
