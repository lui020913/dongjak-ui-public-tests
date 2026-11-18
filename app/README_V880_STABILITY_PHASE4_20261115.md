# 동작하는 안전지도 v8.8.0 — 안정화 4단계 통합 업데이트

## 적용 기준

- 첨부된 원본 `DongjakApp_FULL_v8.7.9_STABILITY_PHASE2_TEST_AUDIT_20261115(1).zip`.
- v8.7.10 안정화 3단계에서 수행한 iOS PWA MapLibre 복귀 감시·해제 기능과 테스트 5건을 **모두 포함**합니다.
- 지도 원본 엔진 `src/main.js` 및 교통 렌더러 `src/transport-map.js`의 코드를 수정하지 않았습니다. 기존 데이터 파일과 로그인 설정 구조를 유지합니다.

## 단계 4 수정 사항

1. **모바일 창 펼침 상태 단일화**: `src/v880-sheet-state.js`가 길찾기·커뮤니티·동작소식·내 정보·교통정보 창의 확장 상태를 제어합니다. 여러 창이 동시에 확장 상태를 유지하지 않으며, 창 숨김·재열기·가로 모드 전환 시 상태와 `aria-pressed`/`aria-expanded`를 일치시킵니다.
2. **iPhone 화면 잠김 대응**: 제어 스케줄에서 `requestAnimationFrame`이 중단될 때 150ms 감시 타이머로 UI 상태 동기화를 완료합니다. 회전, viewport 변화, PWA 복귀, 하단탭 높이 변화를 반영하고 종료 시 이벤트 및 예약 타이머를 해제합니다.
3. **전체 확장 레이아웃**: `src/v880-unified-sheet.css`의 **모바일 전용** 규칙이 safe-area, 하단 탭 높이 및 내부 스크롤을 계산해 패널 잘림을 방지합니다. 데스크톱 스타일은 덮어쓰지 않고 기존 PC 반응형 설계를 유지합니다.
4. **역사적 바이트 검사 분리**: 옛 지도·교통 소스 해시와 동일해야 한다는 14건의 검사 코드는 삭제하지 않았습니다. `npm run test:historical`을 실행할 때 원본 SHA 비교를 다시 활성화합니다. 일반 `npm test`는 현재 동작 검사를 실행하며 해당 역사적 검사는 `SKIP`으로 명확하게 표시합니다. **옛 14건을 기능 수정으로 해결하거나 통과로 위장한 것은 아닙니다.**
5. **현재 동작 계약 검사 12건 추가**: 확장·접기, 여러 창 충돌, 닫은 창 상태, 화면 회전, iOS 프레임 정지, 하단탭 위치, 교통지도 POI 출처, 선택 핀 좌표, 지도 창 닫기 상태 등을 확인합니다.

## 검증

- `node --test tests/*.test.mjs`: 1,465건 / 통과 1,451 / 실패 0 / 역사적 검사 SKIP 14.
- `node scripts/check-release-version.mjs`: 버전·release log·package lock·HTML·빌드 메타데이터 일치.
- 변경된 JavaScript 파일 `node --check` 검사.
- 패치 ZIP 및 전체 ZIP 파일 무결성 / 원본과 변경 파일 해시 비교.
- **수행하지 못한 검증**: `npm run build`, PC/모바일 Playwright E2E, 실제 iPhone WebGL 복귀, 실제 교통 API 응답. npm 레지스트리 DNS 연결 `EAI_AGAIN`으로 패키지 설치 불가. 이 검증이 끝나기 전까지 배포 품질을 확정하지 않습니다.

## ZIP 파일 적용

**통합본**은 기존 폴더와 다른 폴더에 압축 해제하고 `.env.local` 등 사용자 설정을 별도로 유지/복사한 뒤 실행합니다.

**델타 패치**는 정확한 **v8.7.9 원본 프로젝트 폴더**에 적용하며, `APPLY_PATCH.cmd`를 별도 압축 해제 위치에서 실행합니다. 기존 코드가 일부 다르면 SHA 사전 검증이 덮어쓰기를 중단하며, 파일 백업은 `PATCH_BACKUPS`로 저장합니다. 기존에 v8.7.10 패치를 적용한 폴더라면 이번 v8.7.9용 델타 패치를 덮어쓰지 말고 **v8.8.0 통합본**을 사용하세요.

```powershell
npm ci
npm run check:release
npm test
npm run build
npm run test:e2e:desktop
npm run test:e2e:mobile
# 배포는 위 검증 성공 후에만
npm run deploy:pages
```

주의: `npm run test:historical`에서 구버전 바이트 해시가 다르다는 실패가 나오는 것은 예상된 동작입니다. 역사적 회귀 감사이며 현재 기능 테스트의 실패가 아닙니다.
