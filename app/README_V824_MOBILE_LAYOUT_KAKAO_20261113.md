# Dongjak Walk Safety — v8.2.4 (2026-11-13)

## UI changes

- Route panel has its original mobile `min(61dvh, 520px)` height. `overflow-y:auto` restores touch scrolling inside that panel, not page-level scrolling. The primary **도보 경로 찾기** control retains its position before optional waypoint editing.
- **도보 길찾기, 우리 동네 이야기, 동작구 소식, 내 기록** close controls all use a real two-column heading grid. The X occupies the right-hand column in normal layout flow (`position:static`), not a left/absolute shortcut.
- Login/password/profile input controls on iPhone have at least 16px font size to avoid Safari's automatic input zoom. The login form does not force-focus an input upon opening on mobile. With keyboard visible, only the `내 기록` panel scrolls to reveal the field.
- Other map, routing, favorites, Supabase and Kakao code remains unchanged. No new database migrations are required.

## Kakao login `KOE205` (must fix at provider dashboard)

This means the OAuth authorization request includes consent scopes not enabled in your Kakao Developers application. The Supabase Kakao provider may request **`account_email`, `profile_image`, `profile_nickname`** even though the application did not explicitly add those `scopes` in `signInWithOAuth`. Adding `scopes` in JavaScript is not a reliable way to remove default provider scopes.

1. Visit https://developers.kakao.com/console/app and open the **same Kakao app** whose **REST API key** is configured in Supabase Authentication → Providers → Kakao.
2. Choose **Kakao Login → Consent Items** and compare the consent items against the actual authorization request (tap **왜 에러가 발생하나요?** on the KOE205 screen, or inspect its `scope` query parameter; do not publish authentication URLs containing sensitive session parameters).
3. Enable the needed items (for example `profile_nickname`, `profile_image`, `account_email`) with a consent stage the app is entitled to use. A `사용 안 함` item cannot be requested. If `account_email` is unavailable for your account, Kakao **Biz App / individual developer Biz App** registration or a different auth strategy may be required. [Kakao Docs](https://developers.kakao.com/docs/ko/app-setting/app), [Supabase Kakao Docs](https://supabase.com/docs/guides/auth/social-sign-in/auth-kakao).
4. If the error persists, check that the REST API key and Client Secret in Supabase belong to this exact Kakao app. The `redirect_uri` should be your **Supabase** auth callback (`https://<project>.supabase.co/auth/v1/callback`); redirect URI mismatch gives `KOE006`, a different problem.
5. Preserve the existing signed-in email user: connect Kakao under `내 기록 → 내 계정 → 연결된 계정` rather than creating a second user that will have a different favorites database row.

**Privacy:** Do not put a Kakao Client Secret or Supabase service_role key in website source or `.env.production.local`. The provider secret belongs only in Supabase's provider admin configuration.

## Verification

Run `npm ci`, `npm test`, `npm run check:release`, `npm run build`, and only then deploy with `npm run deploy:pages`. A browser static-layout check is not equivalent to a live iPhone Safari test or a real Kakao OAuth handshake.
