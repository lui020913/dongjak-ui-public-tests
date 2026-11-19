# 동작하는 안전지도 v8.7.10 — 안정화 3단계 / iOS 복귀 콜백 잠김 방지

기준 통합본: `DongjakApp_FULL_v8.7.9_STABILITY_PHASE2_TEST_AUDIT_20261115(1).zip`

## 수정된 실제 동작

- `src/v875-map-resume.js`: iOS PWA가 백그라운드에서 돌아왔을 때 `requestAnimationFrame`이 실행되지 않아 지도 복구 `pending` 상태가 계속 남는 문제를 방지합니다. 1,100ms 안에 프레임 콜백이 도착하지 않으면 감시 타이머가 지도 `resize`와 `triggerRepaint`를 한 번 수행하며, 늦게 도착한 프레임은 무시합니다.
- 백그라운드 전환 또는 WebGL 컨텍스트 소실 시 기존 예약 복구를 무효화합니다. 컨텍스트 복원 시 새 복구를 시작하며, 중복 복구 예약은 하나로 병합합니다.
- 창을 떠날 때 감시·재시도 타이머와 이벤트 리스너를 해제합니다. 기존 지도 소스·스타일·도보 분석·교통 API를 수정하지 않습니다.

## 테스트 정비

- `tests/v8710-stability-phase3.test.mjs`: 정지된 rAF, 백그라운드·WebGL 이벤트, 반복 복귀 이벤트의 타이머 병합, 현재 교통 선택 좌표/패널 카메라 보정, 공통 창 닫기 ARIA 상태를 검증하는 회귀 테스트 5건 추가.
- `tests/v873-home-facilities-quality.test.mjs`: 과거의 `v8.7.9` 고정 버전 문자열 대신 `package.json`의 최신 버전을 참조하도록 변경.
- 과거 소스 전체 해시를 고정한 14건은 **변경하거나 통과 처리하지 않았습니다.** 이들은 현재의 교통·지도 동작을 검증하지 못하므로 장기적으로 세분화된 기능 계약 테스트로 이관해야 합니다.

## 검증 결과와 제한사항

- `node --test tests/*.test.mjs`: **1,452건 중 1,438건 통과 / 14건 실패**. 실패 14건은 v8.7.9에서 보고된 구형 해시·허용 패치 범위 비교 항목과 동일하며 새로운 실패 항목은 없습니다.
- `node --test tests/v8710-stability-phase3.test.mjs tests/v878-stability-phase1.test.mjs`: **10/10 통과**.
- `node scripts/check-release-version.mjs`: 버전 일치 및 릴리스 이력 검사 통과.
- 변경된 JS의 `node --check` 통과.
- **Vite 빌드와 Playwright E2E는 이 작업 환경에서 수행할 수 없었습니다.** npm 패키지 설치 중 npm 레지스트리 DNS 조회가 실패(`EAI_AGAIN`)했고, 오프라인 캐시에 Playwright 패키지가 없었습니다. 실기기 iPhone PWA 렌더링 및 실제 외부 API 동작도 별도 검증이 필요합니다.

## Windows 적용 및 검증

1. 이 패치 ZIP을 **기존 프로젝트 폴더와 별도의 폴더**에 압축 해제합니다.
2. `APPLY_PATCH.cmd "C:\DongjakApp\DongjakApp_CLEAN_LATEST"`처럼 기존 **v8.7.9 프로젝트 폴더**를 지정하여 실행합니다. 인수 없이 실행하면 입력을 요청합니다.
3. 적용 스크립트가 기존 `package.json`의 버전과 파일 상태를 사전 확인하고, 덮어쓸 파일을 `PATCH_BACKUPS` 폴더에 백업한 뒤, 변경 파일만 덮어씁니다. 불일치 파일이 있으면 덮어쓰지 않습니다.
4. 적용 후 프로젝트 폴더에서 아래 명령을 실행합니다.

```powershell
npm ci
npm run check:release
npm test
npm run build
npm run test:e2e:desktop
npm run test:e2e:mobile
# 실제 배포할 때만
npm run deploy:pages
```

**참고:** 현재의 `npm test`는 과거 바이트 해시 검증 14건이 남아 있어 종료코드가 1입니다. 신규 5건 및 기존 테스트에서 그 외 새로운 실패가 없는지 확인하세요. 이전 버전을 수정하거나 압축 해제한 패치를 프로젝트 루트에서 강제로 덮어쓰지 마세요.
