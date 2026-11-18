#!/usr/bin/env bash
set -euo pipefail
PRIVATE_REPO="lui020913/dongjak-safety-map"
SOURCE_PIN="$GITHUB_WORKSPACE/release/mobile-first-overhaul-source.json"
SOURCE_SHA="$(jq -er '.source_sha' "$SOURCE_PIN")"
SOURCE_REF="$(jq -er '.source_ref' "$SOURCE_PIN")"
APP_VERSION="$(jq -er '.application_version' "$SOURCE_PIN")"
REQUEST_SHA="$(jq -er '.source_sha' "$GITHUB_WORKSPACE/release/mobile-first-overhaul-request.json")"
test "$REQUEST_SHA" = "$SOURCE_SHA"
test "$APP_VERSION" = "8.26.1"
test -n "$PRIVATE_SOURCE_READ_TOKEN"
test -n "$VITE_SUPABASE_URL"
test -n "$VITE_SUPABASE_PUBLISHABLE_KEY"
actual="$(gh api "repos/$PRIVATE_REPO/git/ref/heads/$SOURCE_REF" --jq .object.sha)"
test "$actual" = "$SOURCE_SHA"
work="$RUNNER_TEMP/private-application"
mkdir -m 700 "$work"
git -C "$work" init -q
git -C "$work" remote add origin "https://github.com/$PRIVATE_REPO.git"
auth="$(printf 'x-access-token:%s' "$PRIVATE_SOURCE_READ_TOKEN" | base64 -w0)"
echo "::add-mask::$auth"
GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=http.extraheader GIT_CONFIG_VALUE_0="Authorization: Basic $auth" git -C "$work" fetch -q --depth=1 origin "$SOURCE_SHA" >/dev/null 2>&1
git -C "$work" checkout -q --detach FETCH_HEAD >/dev/null 2>&1
test "$(git -C "$work" rev-parse HEAD)" = "$SOURCE_SHA"
cd "$work"
test "$(node -p "require('./package.json').version")" = "$APP_VERSION"
jq -e --arg version "$APP_VERSION" '.version==$version' public/version.json >/dev/null
test -f wrangler.toml
grep -Fq "import './v914-mobile-ux-fixes.css';" src/main.js
grep -Fq "import './public-ui-production-overlay.css';" src/main.js
grep -Fq "public-ui-mobile-surface-coordinator.js" src/main.js
cp "$GITHUB_WORKSPACE/frontend/production/mobile-first-overhaul.css" src/mobile-first-overhaul.css
node "$GITHUB_WORKSPACE/scripts/apply-mobile-only-gate.mjs" "$work"
node --input-type=module <<'NODE'
import {readFileSync,writeFileSync} from 'node:fs';
const path='src/main.js';
const source=readFileSync(path,'utf8');
const anchor="import './v914-mobile-ux-fixes.css';";
if(source.split(anchor).length!==2) throw new Error('Expected exactly one final mobile CSS import anchor');
if(source.includes("import './mobile-first-overhaul.css';")) throw new Error('Mobile overhaul already injected');
writeFileSync(path,source.replace(anchor,anchor+String.fromCharCode(10)+"import './mobile-first-overhaul.css';"));
NODE
git diff --check
expected_changes="$(printf '%s\n' index.html)"
actual_changes="$(git diff --name-only | sort)"
test "$actual_changes" = "$expected_changes"
test -s src/mobile-first-overhaul.css
safe=(env -i "PATH=$PATH" "HOME=$HOME" CI=true DONGJAK_UI_ONLY=1 "GITHUB_SHA=$SOURCE_SHA" "GITHUB_RUN_ID=$GITHUB_RUN_ID" "VITE_SUPABASE_URL=$VITE_SUPABASE_URL" "VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY")
log="$RUNNER_TEMP/private-build.log"
run_private(){
  title="$1"
  shift
  if "${safe[@]}" "$@" >"$log" 2>&1; then
    echo "$title passed"
  else
    echo "::error::$title failed; private diagnostic output withheld"
    rm -f "$log"
    exit 1
  fi
  rm -f "$log"
}
run_private "Dependency installation" npm ci --no-audit --no-fund --prefer-offline
if "${safe[@]}" node "$GITHUB_WORKSPACE/scripts/run-mobile-regressions.mjs" "$work" >"$log" 2>&1; then
  echo "Mobile/shared private Node regression suite passed"
else
  node "$GITHUB_WORKSPACE/scripts/private-test-fingerprint.mjs" "$log"
  rm -f "$log"
  echo "::error::Mobile/shared private Node regression suite failed; private diagnostics withheld"
  exit 1
fi
rm -f "$log"
run_private "Application build" npm run build
run_private "Release consistency" npm run check:release
test -s dist/index.html
jq -e --arg version "$APP_VERSION" '.version==$version' dist/version.json >/dev/null
CSS_SHA="$(sha256sum "$GITHUB_WORKSPACE/frontend/production/mobile-first-overhaul.css" | cut -d' ' -f1)"
jq -n --arg source "$SOURCE_SHA" --arg public "$GITHUB_SHA" --arg css "$CSS_SHA" --arg version "$APP_VERSION" --arg build "$GITHUB_RUN_ID" '{source_commit:$source,public_ui_source_commit:$public,public_ui_overlay_sha256:$css,application_version:$version,build_run:$build,release_status:"CANDIDATE_PREVIEW_NOT_PRODUCTION"}' > dist/release-source.json
umask 077
tar -C "$RUNNER_TEMP/private-application" -czf "$RUNNER_TEMP/mobile-overhaul.tar.gz" dist functions server src package.json package-lock.json wrangler.toml
node "$GITHUB_WORKSPACE/scripts/seal-private-release.mjs" seal "$RUNNER_TEMP/mobile-overhaul.tar.gz" "$RUNNER_TEMP/mobile-overhaul.sealed" "$SOURCE_SHA"
rm -f "$RUNNER_TEMP/mobile-overhaul.tar.gz"
echo "source_sha=$SOURCE_SHA" >> "$GITHUB_OUTPUT"
echo "app_version=$APP_VERSION" >> "$GITHUB_OUTPUT"
echo "public_sha=$GITHUB_SHA" >> "$GITHUB_OUTPUT"
echo "css_sha=$CSS_SHA" >> "$GITHUB_OUTPUT"
rm -rf "$RUNNER_TEMP/private-application" "$RUNNER_TEMP/private-build.log"
echo "Private source tested, CSS injected only in temporary build, encrypted artifact created."
