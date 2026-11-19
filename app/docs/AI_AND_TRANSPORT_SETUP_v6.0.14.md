# 동작구 안전지도 v6.0.14 — 교통 API 및 시설 AI 설명 설정

## 1. 버스·지하철 데이터 상태 진단

Cloudflare Pages 배포 후 다음 주소를 엽니다.

- `https://dongjak-walk-safety-preview.pages.dev/api/transport/status`
- `https://dongjak-walk-safety-preview.pages.dev/api/place-insight`

또는 `node scripts/check-public-api-status.mjs`를 실행합니다. 이 확인은 **키가 설정됐는지**만 검사합니다. 키 유효성과 외부 API 응답은 별도로 검증해야 합니다.

교통 정보에 필요한 서버 측 환경변수:
- `SEOUL_BUS_SERVICE_KEY` — 서울시 버스 정류소·도착정보 API 인증키
- `SEOUL_SUBWAY_API_KEY` — 서울시 실시간 지하철 API 인증키
- `SEOUL_OPEN_API_KEY` — 서울 열린데이터광장 역별 열차 시간표 API 인증키

**중요:** 로컬 `.env`는 배포 시 Cloudflare로 자동 업로드되지 않습니다. Cloudflare Pages 프로젝트의 **Settings → Variables and Secrets**에서 Production 환경에 등록해야 합니다. 정류소 클릭 후 서울시 API가 401/403을 반환하면 서비스키 활용 승인·만료·호출 제한·프로젝트 배포 설정을 확인하십시오. `status.bus=true`는 인증키 존재 여부만 의미합니다. 버스 정류소 정보나 도착 시간을 임의로 생성하지 않습니다.

## 2. 장소 AI 설명 활성화

1. https://platform.openai.com/ 에 로그인합니다. ChatGPT 구독과 별도로 API 프로젝트/결제가 필요할 수 있습니다.
2. https://platform.openai.com/api-keys 에서 새 프로젝트 API 키를 발급합니다. **비밀키는 채팅, GitHub, 코드, `VITE_` 변수에 넣지 마십시오.**
3. 프로젝트 폴더에서 다음 명령을 실행합니다.

   `npx.cmd wrangler pages secret put OPENAI_API_KEY --project-name dongjak-walk-safety-preview`

   키 입력 프롬프트가 나타나면 발급받은 키를 입력합니다. 명령어 뒤에 키 자체를 작성하지 마십시오.
4. Cloudflare 대시보드 **Workers & Pages → dongjak-walk-safety-preview → Settings → Variables and Secrets → Add**에서 Production용 텍스트 변수 `AI_PLACE_ENABLED`를 `true`로 등록합니다.
5. 선택사항: `AI_PLACE_MODEL`에 서버 지원 모델 ID를 지정합니다. 미설정 시 기존 코드의 기본 모델인 `gpt-4.1-mini`를 사용합니다.
6. `npm.cmd run build`, `npx.cmd wrangler pages deploy dist --project-name dongjak-walk-safety-preview --branch main`으로 프로덕션 재배포합니다.
7. `https://dongjak-walk-safety-preview.pages.dev/api/place-insight`에서 `{"enabled":true}`인지 확인합니다. 그 뒤 지도 시설을 클릭하여 `AI 설명` 버튼을 누릅니다.

AI 설명은 사용자가 클릭한 장소에 제공된 사실만 기반으로 1~2문장 작성하도록 서버에서 제한합니다. 정상 설정돼도 API 응답 장애·사용량 한도·결제 문제라면 동작하지 않을 수 있습니다. 요금은 OpenAI API 정책에 따릅니다.

## 3. 지하철 시간표

지하철역 클릭 → **시간표** 선택 → 시간표가 있는 경우 전체 시간표가 펼쳐집니다. 요일(평일·토요일·휴일), 호선, 상·하행 필터를 선택할 수 있습니다.

운영기관이 API로 제공하는 1~9호선 자료만 표시합니다. 신림선 등의 자료를 코드로 추정하거나 임의 시간을 만들어 넣지 않습니다. 시간표는 계획 운행 시각이며 실시간 도착정보와 다릅니다. 제공기관의 오류·미지원·키 누락 시 관련 안내가 표시됩니다.

## 4. 실제 배포 전 확인

- Windows 프로젝트 폴더에서 `npm.cmd ci`, `npm.cmd test`, `npm.cmd run build` 실행
- `dist/`가 생성된 경우에만 Cloudflare Pages 배포
- 메인 고정 주소 `https://dongjak-walk-safety-preview.pages.dev/` 확인
- 대교 좌표는 공개 교량 위치를 반영한 새 기준값이나 MapLibre 배경지도와의 시각 정합성은 배포 후 확인 필요
