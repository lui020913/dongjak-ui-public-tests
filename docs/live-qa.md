# Live QA — anonymous mobile visual audit

No ChatGPT Work runtime is required. Keep the existing mobile release workflow and protected Production rules unchanged until the audit has been independently verified.

## Local live console
From the repository on the audit branch, with Node.js 24:
```sh
npm install
npx playwright install chromium webkit
DONGJAK_TARGET_URL=https://9d136975.dongjak-walk-safety-preview.pages.dev/ node scripts/live-qa.mjs
```
Open http://127.0.0.1:8765 in your browser. The runner uses the existing mobile390 test journeys in a fresh anonymous context. Append `--full` for all configured phone projects. Ctrl+C stops the console. The pause control queues a pause between test journeys (not inside animation or browser actions); resume removes it. You can select any captured scene, replay sampled images, step, seek and mark a defect by clicking the image. Comments stay in the local run directory.

## Evidence and analysis
```sh
node scripts/live-qa-analyze.mjs qa-artifacts
node scripts/live-qa-analyze.mjs qa-artifacts --baseline=/absolute/path/to/older/audit-report.json
```
Optional: set GEMINI_API_KEY in the local process environment, then append `--vision` to analyze up to five anomalous scenes with three nearby anonymous captures each; never commit the key. Reports are diagnostic, not an automatic pass/fail gate. A target with no recorded scenes is not evidence of correctness.

- Chromium DevTools sends actual image samples, throttled to at most approximately 11 per second. These are not a guaranteed 60 FPS recording. Separate rAF observations measure frame intervals and selected DOM metrics, subject to sampling overhead and browser throttling.
- Playwright records full available browser video artifacts, including WebKit; WebKit does not support CDP live images.
- Measurements cover selected common HUD, navigation, layer, window and transport surfaces; repeated layout flags are review candidates, not proven bugs. Existing Playwright assertions remain unchanged.
- Run artifacts include raw captures, metrics.ndjson, frame-times.ndjson, events.ndjson, original Playwright video and audit-report.json. comparison.json compares scene-level status, flags and p95 timing against a supplied previous run. Manual defect records are in manual-bugs.ndjson.
- Never use a signed-in account, private posts or real personal location in this public CI. Keep qa-artifacts out of commits. The console binds loopback only and rejects non-local Host; write calls additionally require a random control token and exact Origin.
- GitHub Actions workflow builds checks on PRs; after merge the owner can manually schedule a capture against a specific anonymous Pages URL. Artifacts are retained for seven days. The optional Vision step is limited to a trusted main-branch owner dispatch. This is not a remote real-time relay.
- Remaining work before enabling a blocking gate: calibrate against known regressions, expand screen registry (including auth safely via synthetic accounts), review real WebKit/device evidence, define severity rules, integrate the existing scoped repair pipeline and run an exact-source candidate through the protected release path. Remote watching needs a separately secured relay and operator authentication.

## Parallel high-rate remote audit (v2)

Full audit dispatch distributes the same Playwright case list across 20 isolated runner shards (quick mode uses 8). One browser worker per runner avoids software-rendering contention; fail-fast is disabled. Each shard retains its own recording, metrics and artifact. Actual runner concurrency depends on GitHub allocation. Existing release gates are unchanged.

Deploy the dedicated QA relay from main before starting a v2 remote audit. Open its root dashboard with the existing viewer key, select a lane (1–20), then change lanes without re-entering the key. A viewer requests frames only from the selected lane; the writer forwards recent Chromium CDP JPEG frames over authenticated WebSockets with a 60 FPS target, bounded buffering, and no persistent per-frame relay writes. Received/displayed FPS are measured, not guaranteed. Chromium emits frames on visual changes; static scenes, network, CI CPU, browser decoding and rendering can lower the rate. WebKit retains offline recordings/DOM telemetry, not live CDP frames. Local sample archive and original Playwright recording retain their existing frame rates. Pause applies to the selected lane at its next journey boundary; closing the last viewer clears pause. Legacy 1 FPS console remains at /legacy. Existing QA_RELAY_URL and keys are reused. No production deploy is performed by this workflow.
