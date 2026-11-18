# 동작구 지도 v820 — v816 폰트 회귀 테스트 수정 (2026-11-13)

## 수정 사항

- 업로드된 v820 통합본에서 `public/fonts/AppleSDGothicNeo*.ttf` 9개를 **배포용 소스에서 제외**했습니다. **원본 사용자가 올린 ZIP은 수정되지 않습니다.**
- 존재하지 않는 `/fonts/Dongjak-*.woff2` 파일을 가리키던 `src/local-font.css`를 변경해, 운영체제 또는 PC에 설치된 `Apple SD Gothic Neo`를 우선 사용하고 `Malgun Gothic`으로 폴백합니다.
- `.gitignore`에 `public/fonts/AppleSDGothicNeo*`를 추가해 재포함 실수를 예방했습니다.
- `tests/v816-pc-night-weather-font.test.mjs`는 **변경하지 않았습니다.**
- 지도·기능·교통정보 관련 나머지 파일은 수정하지 않았습니다.

## 검증

```powershell
node --test tests/v816-pc-night-weather-font.test.mjs
npm test
npm run build
```

이것은 **테스트와 배포 구성 수정**이며 Windows에 해당 글꼴을 자동 설치하지 않습니다. PC 글꼴이 설치되지 않았다면 대체 폰트로 표시됩니다.

## 원본 파일 보관

- **전체 ZIP**: 원래 업로드한 v820 ZIP에 포함된 글꼴은 제거하지 않았으며 해당 원본 ZIP을 별도 보관하시면 됩니다.
- **델타 패치**: Windows `APPLY_PATCH.cmd`를 사용하면 현재 `public/fonts`의 관련 파일을 **프로젝트 밖의 백업 폴더**로 이동한 뒤 소스 2개를 교체합니다. 폰트 파일은 패치 ZIP에 들어 있지 않습니다.

Apple 산돌고딕 네오의 웹폰트 재배포는 별도 허가가 필요할 수 있습니다. 적법한 웹폰트를 사용하실 때만 `public/fonts` 및 `@font-face`로 별도 등록하십시오.
