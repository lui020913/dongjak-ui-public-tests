# 동작하는 안전지도 — 공개 앱 소스

이 디렉터리는 앱의 실제 실행 소스입니다. 공개 저장소에서 개발·검증·빌드·Preview 및 Production 배포를 수행합니다.

API 비밀키, Cloudflare 배포 토큰, Supabase 비밀키, 로컬 환경 파일은 저장소에 포함하지 않습니다. 런타임 API 키는 Cloudflare Pages/Workers Secrets로 관리하고, 공개 빌드에 필요한 Supabase URL 및 publishable key만 Actions 환경 변수로 전달합니다.

로컬 실행:

```sh
npm ci
npm test
npm run build
npm run dev
```
