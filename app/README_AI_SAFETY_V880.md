# v8.8.0 — Supabase AI 보행안전 검색 (개발 브랜치)

- 기준 코드: 검증 완료 커밋 `02ecfaba26a1a4ba2122c1d119b12ea622fb5b6b`.
- 대상: `feature/v8.8.0-supabase-safety-ai`. 운영 `main`, 지도 엔진, 기존 앱 UI, 경로 알고리즘을 변경하지 않음.
- Supabase Project: `dongjak-walk-safety` (`phijvaiakrsxrqkuutds`).
- `public.dj_safety_ai_evidence`: 기존 보호구역 GeoJSON 9개 시설과 사고다발지역 폴리곤 9개를 원본 경로/출처/한계와 함께 복사한 공개 사실 테이블. 기존 `user_favorite_state`는 미변경.
- RLS: 인증된 사용자만 조회, 익명 SELECT 금지. `dj_safety_ai_find` 검색 RPC도 인증 계정만 호출 가능.
- Edge Function: `dongjak-safety-ai`, `verify_jwt=true`, `auth.getUser` 서버 재검증, `service_role`을 브라우저에 전달하지 않음.
- 한국어 검색: **검증된 키워드 검색**이 결과의 근거입니다. Supabase 내장 `gte-small`은 영어 전용이므로 한국어 문장의 자유 의미검색이 아닙니다. 영어 고정 카테고리 벡터는 보조로만 쓰며, 실패 시 키워드 검색을 유지합니다.
- AI 생성 답변은 원본의 기록에 있는 내용에 한정합니다. 안전등급, 정확한 사고 위치, 실제 경사도, 휠체어 접근성, 최적·안전한 경로는 산정하거나 추측하지 않습니다.
- 프리뷰 UI: `보행안전 도구 → AI 안전정보 검색`. 로그인 상태에서 질문과 참고자료를 확인하고 위치를 지도에서 볼 수 있습니다.
- Supabase 공개 URL/Publishable Key가 앱에 설정되어 있고 로그인이 완료돼야 합니다.
- 검사: `node --check src/v880-supabase-safety-ai.js`, `npm test`, `npm run build`. 이 브랜치에서는 전체 Playwright가 실행되지 않도록 제한했습니다.
- **운영 미배포.** 새 Edge Function ACTIVE는 확인했으나, 실제 로그인 브라우저 호출 검증 및 375/390/430·1280/1440/1920 전체 호환성은 통합 단계에서 재검증해야 합니다.
