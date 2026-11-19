# 2026-11-06 | 지하철 호선별 역 아이콘·출구 번호 표시 수정

## 반영 내용

1. **축척별 환승역 표시** — 멀리서 볼 때는 노량진 `1·9`, 동작 `4·9`, 대림 `2·7`, 보라매 `7·신림`처럼 한 개의 다색 통합 배지로 표시합니다. 확대 기준(13.05) 이상에서는 각 노선의 승강장 위치에 숫자 배지를 분리해 표시합니다. 두 표현은 같은 시점에 중복 노출하지 않습니다.
2. **역 마커는 노선 위** — MapLibre GeoJSON 역 마커를 각 호선의 선형에 스냅하며, 공공 GIS 노선 데이터가 나중에 로드되어 지도의 노선 선형이 변경되면 역 위치도 해당 보이는 선형으로 다시 맞춥니다. 호선별 마커를 별도의 픽셀 오프셋으로 노선 밖에 끌어내지 않습니다.
3. **출입구는 실제 번호만** — 출구번호가 확인된 아이콘에 `1`, `2`, `3-1`과 같은 번호를 표시하고, 번호가 확인되지 않은 출구는 지도에서 숨깁니다. 임의 번호나 `출` 문자는 표시하지 않습니다. 데이터 출처가 제공한 시설/출입구 위치는 변경하지 않습니다.
4. **역 클릭 기능 유지** — 마커 클릭 시 선택한 노선의 실시간 도착정보 조회, 경로 출발/도착 선택 등의 기존 동작을 유지합니다.

## 변경 파일
- `src/transport-map.js`: 축척별 통합·분리 마커 레이어, 통합 배지 클릭 시 전체 호선 선택, 상세 배지는 선택 호선만 조회
- `src/metro-marker-geodata.js`: 통합 요약 마커와 노선별 상세 마커 GeoJSON, 동일 역명 라벨 중복 방지
- `src/station-accessibility.js`: 실제 번호가 확인된 출구만 표시, 숫자 텍스트 표시
- `src/main.js`, `src/base-layer-controls.js`: 제거된 요약 마커 레이어 참조 삭제
- `tests/metro-per-line-badges-v54.test.mjs`: 호선 분리·선형 일치·출구 숫자 표시 자동 검증
- 기존 레거시 테스트 4개: 변경된 표시 사양에 맞게 검증 기대값 갱신

## Windows VS Code에서 확인

```powershell
cd C:\DongjakApp\DongjakApp_CLEAN_LATEST
npm.cmd ci
npm.cmd test
npm.cmd run dev
```

브라우저 `http://127.0.0.1:5195/`에 접속해 노량진역·동작역·대림역·신림역을 확대해 보세요. 확대 화면에서 각 아이콘이 해당 **색상 노선 위**에 있고, 환승역의 각 노선별 번호 배지가 보이는지 확인하세요. 출구 번호가 없는 출구는 가려진 것이 정상입니다.

## 웹 + API Cloudflare Pages 배포

```powershell
cd C:\DongjakApp\DongjakApp_CLEAN_LATEST
npm.cmd ci
npm.cmd test
npm.cmd run build
npx.cmd wrangler login
npx.cmd wrangler pages secret list --project-name dongjak-walk-safety-preview
npx.cmd wrangler pages deploy dist --project-name dongjak-walk-safety-preview --branch main
```

`functions/api/transport/[[path]].js` 등 기존 Pages Functions가 함께 배포됩니다. Cloudflare Secrets의 API 키 값은 ZIP에 포함되지 않으며, 로컬 API 키도 원본 `.env`를 별도로 복원해야 합니다.

배포 확인: `https://dongjak-walk-safety-preview.pages.dev/`, `https://dongjak-walk-safety-preview.pages.dev/api/transport/status`

## 검증 및 한계
- 소스와 테스트를 이 실행 환경에서 검증했습니다. **227/227 테스트 통과**.
- 기존 `node_modules`에 Windows용 네이티브 모듈만 있어 Linux 실행 환경의 실제 Vite 빌드는 완료되지 않았습니다. Windows에서는 `npm.cmd ci`로 로컬 PC에 맞는 패키지를 다시 설치해 주세요.
- 노선 위 배치란 **현재 지도에서 표시되는 선형** 기준이며, 공식 공간정보가 로드되지 않았을 때는 기존 오프라인 근사 선형 기준입니다. 실측 선로 중심선·역 승강장 지점이라는 뜻은 아닙니다.
- 파일 안의 `dist` 폴더는 이전 배포 산출물입니다. 배포하기 전에 반드시 다시 빌드하세요.
