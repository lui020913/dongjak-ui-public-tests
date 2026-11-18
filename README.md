# 동작하는 안전지도 — 공개 앱 소스 저장소

이 저장소는 동작하는 안전지도의 **공식 공개 개발·검증·배포 작업 공간**입니다.

## 저장소 구조

- `app/`: 실제 서비스 앱 전체 소스. 지도, GIS 레이어, 안전시설, 실시간 버스·지하철, 길찾기, 계정 및 화면 코드를 포함합니다.
- `tests/`: 공개 브라우저 UI 및 회귀 테스트.
- `frontend/`: 이전 독립 UI 실험실. 실제 서비스 앱의 기준 소스가 아닙니다.
- `.github/workflows/`: 공개 소스 기준의 CI, Preview 및 보호된 Production 배포 절차.

## 개발 원칙

1. 앱 코드의 단일 기준은 공개 저장소의 `app/`입니다.
2. 모바일 UI를 기본 레이아웃으로 설계하고, 태블릿·PC는 같은 컴포넌트와 레이아웃을 화면 공간에 맞게 확장합니다.
3. 모바일·태블릿·PC는 검증 시 서로 다른 뷰포트로 구분하지만 별도 UI 트리를 개발하지 않습니다.
4. 기존 지도 엔진, GIS 데이터, 안전시설, 실시간 교통, 길찾기 및 계정 기능을 보존합니다.
5. 기능 테스트뿐 아니라 실제 브라우저의 배치·크기·겹침·화면 캡처를 검증합니다.

## 로컬 개발

```sh
cd app
npm ci
npm test
npm run check:release
npm run build
npm run dev
```

## 키와 비밀정보

- API 비밀키 및 Cloudflare 런타임 자격증명은 소스 파일이나 Git 이력에 저장하지 않습니다.
- 런타임 API 키는 Cloudflare Pages/Workers Secrets로 관리합니다.
- 배포용 Cloudflare 토큰과 빌드에 필요한 공개 Supabase 설정은 GitHub Actions의 보호된 Environment/Variables로 전달합니다.
- 비공개 저장소의 앱 소스를 빌드 때마다 가져오지 않습니다. 일반 CI·Preview·Production 빌드는 공개 저장소의 `app/`만 사용합니다.
- `.env`, `.dev.vars`, 서명 키, 개인 자격증명 및 비밀값을 커밋하지 않습니다.

## 배포

- PR/커밋 검증: 정적 검사, 앱 단위 테스트, 릴리스 일관성 검사, Vite 빌드 및 Playwright.
- Preview: 공개 앱 소스의 정확한 커밋을 별도 Pages Preview 브랜치에 배포하고, 소스 SHA가 일치하는지 확인합니다.
- Production: Preview와 브라우저 검증을 통과한 동일 산출물만 보호된 Production 승인 절차를 거쳐 승격합니다.
- Production 승인 전에는 운영 주소를 변경하지 않습니다.

## 공개 브라우저 검증 주의

GitHub Actions 로그와 아티팩트는 공개될 수 있습니다. UI 검증은 익명 세션으로 수행하며, 비밀번호·토큰·개인정보를 입력하거나 캡처하지 않습니다.
