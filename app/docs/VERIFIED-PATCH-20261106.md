# 업로드 ZIP 실사 및 통합 패치 (2026-11-06)

- 기존 동작구 프로젝트는 React가 아닌 **Vite + vanilla JS + MapLibre** 프로젝트입니다.
- 잘못된 루트 `map-patch/` 모듈을 `src/map-patch/`로 이동했습니다.
- `public/Deploy-Dongjak-Cloudflare-20261106.ps1`은 공개 페이지에 노출될 수 있어 삭제하고 루트로 이동했습니다.
- 실제 지도 진입점인 `src/main.js`에 CSS와 고배율 건물명 모듈을 연결했습니다.
- 기존 `src/transport-map.js`의 정류장 레이어에서 저배율 점·고배율 ARS 번호 및 명칭을 보완했습니다. 별도의 버스 마커를 추가하지 않았습니다.
- 노량진역의 경우 기존 자료(`src/fixed-rail-data.js`, `src/transport-map.js`)에 선형 좌표를 맞추는 로직이 있어서, **근거 부족한 외부 주소 좌표를 강제 적용하지 않았습니다.** 위치 정합성은 현장 검증이 필요합니다.
- 기존 `map-immersive` 기능은 유지하되, **실제 맵 조작 중에도 검색창/상단 메뉴/왼쪽 내비게이션을 가리지 않도록** CSS에서 복구했습니다.
- `public/buildings/*.geojson`의 117,814개 건물 피처에는 건물명이 없으므로, 이름을 가진 배경지도 벡터 건물만 확대(17배율 이상) 시 라벨을 표시합니다. 공공 건축물명 데이터 추가 수집 전까지 모든 건물에 이름을 표시할 수는 없습니다.
- 원본 `.env`는 사용자 제공 ZIP에 있었으나 **수정된 ZIP에서는 제외**했습니다. Cloudflare Pages Secrets는 별도로 유지해야 합니다.
- `example-integration.jsx`는 React 예시이므로 `docs/`로 이동하여 참고용으로만 남겼습니다.
- 실행: `npm.cmd ci; npm.cmd test; npm.cmd run build; npx.cmd wrangler pages deploy dist --project-name dongjak-walk-safety-preview --branch main`
- 실제 Cloudflare 서버 배포 및 실서비스 API 호출은 이 검증 과정에서 수행하지 않았습니다.
