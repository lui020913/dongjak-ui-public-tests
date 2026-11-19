# Multiplatform distribution

The release source is the exact current public Production bundle, not the 8.26.1 snapshot. Web and PWA share a build; Android and iOS consume verified assets. Debug APK is not public distribution.

Android: configure ANDROID_KEYSTORE_BASE64, ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS and ANDROID_KEY_PASSWORD for the existing signed build. Set ANDROID_RELEASE_CERT_SHA256 in android-distribution, allow main only; manually run signed build then Publish verified signed Android APK using its run ID.

iOS: simulator is unsigned and not installable on a phone. Simulator builds run automatically after verified Production (set IOS_AUTOMATIC_BUILD=false to opt out) or when the iOS workflow itself changes on main. TestFlight requires manual dispatch. For TestFlight configure main-only ios-signing with reviewer protection, RELEASE_BUNDLE_KEY, IOS_CERTIFICATE_P12, IOS_CERTIFICATE_PASSWORD, IOS_APPSTORE_PROFILE_BASE64, ASC_API_KEY_P8 secrets and IOS_TEAM_ID, ASC_API_KEY_ID, ASC_API_ISSUER_ID vars. Register kr.dongjak.safetyapp with Apple. Signed IPA is only uploaded to Apple, never public artifacts. Set ios in app/public/download-links.json only after a real public TestFlight/App Store link exists. Real hardware, OAuth, native API compatibility and Apple review are separate gates. No MapLibre Native or WebGPU conversion in this PR.

The separate `iOS simulator startup smoke` workflow reuses the already-built unsigned simulator artifact and verifies installation, launch, process survival and a startup screenshot against the current Production marker. It does not rebuild the app, require signing secrets, or certify map interaction, authentication, or device FPS.
