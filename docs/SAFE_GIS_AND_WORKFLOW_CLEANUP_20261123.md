# 이-작 보행안전지도 — 배포 유지형 정리 기록 (2026-11-23)

이 변경은 *지도·GIS·Supabase·앱 UI 코드는 수정하지 않는* 저위험 정리다.

## 실제 삭제 대상

- \`.github/workflows/recovery-smoke.yml\`: 운영 복구가 아닌, 최초 실행에서 고의로 실패한 뒤 재실행을 시험하는 수동 실험
- \`.github/workflows/recovery-smoke-controller.yml\`: 위 실험 하나만 재실행하는 시험용 오케스트레이터
- \`.github/workflows/notification-test.yml\`: 사용자 트리거로 모의 GitHub 댓글을 생성하는 알림 테스트

운영 배포, 실제 장애 자동 복구, UI·지도 및 GitHub Actions 알림의 현재 워크플로는 삭제하지 않는다.

## GIS 데이터 유지 검사

\`app/tests/runtime-gis-asset-contract.test.mjs\`에서 런타임 소스에 정적으로 적힌 \`/data/*\` 파일 URL이 실제 배포 자산에 있는지 검증한다. PRI 6개 지수의 원본·패치, 보호구역 공백 300m, 제한속도, 보행 네트워크와 경사 자료의 존재 여부도 확인한다.

이 정적 검사는 문자열로 조립되는 경로나 외부 API 파일을 완전하게 추적하지는 못한다. 따라서 **GIS 파일 삭제 허가 도구가 아니다.** 원본 및 출처 스냅샷은 그대로 유지하고, 실제 참조와 연구 활용을 확인한 뒤에만 개별 이동한다.

## Production 배포 안전 조건

코드 검증 → Preview → 12개 모바일 분할 검증 → PC·태블릿 검증 → 보호된 Production → 서비스 확인 순서를 유지한다. 운영에서 실패하면 마지막 정상 배포본으로 롤백한다. 결과가 확정될 때까지 이 변경을 '전체 리팩터링 완료'로 표시해서는 안 된다.
