#!/usr/bin/env bash
set -euo pipefail
PRIVATE_REPO="lui020913/dongjak-safety-map"
PAGES_PROJECT="dongjak-walk-safety-preview"
PREVIEW_BRANCH="button-design-v2-20261125"
PREVIEW_URL=""
SOURCE_SHA="$MOBILE_SOURCE_SHA"
APP_VERSION="$MOBILE_APP_VERSION"
PUBLIC_SHA="$MOBILE_PUBLIC_SHA"
CSS_SHA="$MOBILE_CSS_SHA"
test -n "$SOURCE_SHA" && test -n "$APP_VERSION" && test -n "$PUBLIC_SHA" && test -n "$CSS_SHA"
test -n "$CLOUDFLARE_API_TOKEN" && test -n "$CLOUDFLARE_ACCOUNT_ID" && test -n "$GH_TOKEN"
encrypted="$RUNNER_TEMP/encrypted"
release="$RUNNER_TEMP/release"
mkdir -m 700 "$encrypted" "$release"
trap 'rm -rf "$encrypted" "$release" "$RUNNER_TEMP/mobile-overhaul.tar.gz" "$RUNNER_TEMP/preview-deploy.log" "$RUNNER_TEMP/project.json" "$RUNNER_TEMP/production-before.txt"' EXIT
node scripts/seal-private-release.mjs open "$RUNNER_TEMP/mobile-overhaul.sealed" "$RUNNER_TEMP/mobile-overhaul.tar.gz" "$SOURCE_SHA"
tar -xzf "$RUNNER_TEMP/mobile-overhaul.tar.gz" -C "$release"
jq -e --arg source "$SOURCE_SHA" --arg public "$PUBLIC_SHA" --arg css "$CSS_SHA" --arg version "$APP_VERSION" --arg build "$GITHUB_RUN_ID" '.source_commit==$source and .public_ui_source_commit==$public and .public_ui_overlay_sha256==$css and .application_version==$version and .build_run==$build and .release_status=="CANDIDATE_PREVIEW_NOT_PRODUCTION"' "$release/dist/release-source.json" >/dev/null
api="https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects/$PAGES_PROJECT"
curl -fsS --max-time 30 -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" "$api" -o "$RUNNER_TEMP/project.json"
jq -e '.success==true and .result.production_branch=="main"' "$RUNNER_TEMP/project.json" >/dev/null
previous="$(curl -fsS --max-time 30 -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" "$api/deployments?env=production&per_page=1" | jq -er '.result[0].id')"
test -n "$previous"
echo "$previous" > "$RUNNER_TEMP/production-before.txt"
cd "$release"
if ! npx --yes wrangler@4 pages deploy dist --project-name="$PAGES_PROJECT" --branch="$PREVIEW_BRANCH" --commit-hash="$SOURCE_SHA" --commit-message="Button design V2 Preview public=$PUBLIC_SHA" >"$RUNNER_TEMP/preview-deploy.log" 2>&1; then
  echo "::error::Preview deployment failed; deployment diagnostics withheld"
  exit 1
fi
PREVIEW_URL=''
for n in $(seq 1 12); do
  deployments="$(curl -fsS --max-time 30 -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" "$api/deployments?env=preview&per_page=20")"
  candidate="$(printf '%s' "$deployments" | jq -c --arg branch "$PREVIEW_BRANCH" --arg source "$SOURCE_SHA" --arg public "$PUBLIC_SHA" '[.result[] | select((.deployment_trigger.metadata.branch // "")==$branch and (((.deployment_trigger.metadata.commit_hash // "")==$source) or ((.deployment_trigger.metadata.commit_message // "") | contains("public="+$public))))] | sort_by(.created_on) | last // empty')"
  if [ -n "$candidate" ]; then
    PREVIEW_URL="$(printf '%s' "$candidate" | jq -er '.url // .aliases[0] // empty')"
    break
  fi
  sleep 5
done
test -n "$PREVIEW_URL"
case "$PREVIEW_URL" in
  https://*) ;;
  *) PREVIEW_URL="https://$PREVIEW_URL" ;;
esac
echo "Detected exact Preview deployment URL: $PREVIEW_URL"
verified=0
for n in $(seq 1 12); do
  if curl -fsSL --max-time 25 "$PREVIEW_URL/release-source.json?verify=$GITHUB_RUN_ID-$n" | jq -e --arg source "$SOURCE_SHA" --arg public "$PUBLIC_SHA" --arg css "$CSS_SHA" --arg version "$APP_VERSION" --arg build "$GITHUB_RUN_ID" '.source_commit==$source and .public_ui_source_commit==$public and .public_ui_overlay_sha256==$css and .application_version==$version and .build_run==$build and .release_status=="CANDIDATE_PREVIEW_NOT_PRODUCTION"' >/dev/null; then
    verified=1
    break
  fi
  sleep 5
done
test "$verified" = 1
echo "Preview source identity verified."
# A successful upload and static marker can precede edge propagation of
# version metadata or Pages Functions. Retry readiness, never relax identity
# or capability checks. Keep diagnostics restricted to fixed endpoint names.
version_ready=0
transport_ready=0
for n in $(seq 1 12); do
  if [ "$version_ready" = 0 ] && curl -fsSL --max-time 25 "$PREVIEW_URL/version.json?verify=$GITHUB_RUN_ID-$n" | jq -e --arg version "$APP_VERSION" '.version==$version' >/dev/null; then
    version_ready=1
    echo "Preview version metadata verified."
  fi
  if [ "$transport_ready" = 0 ] && curl -fsSL --max-time 25 "$PREVIEW_URL/api/transport/status?verify=$GITHUB_RUN_ID-$n" | jq -e '.bus==true and .subway==true' >/dev/null; then
    transport_ready=1
    echo "Preview transport capabilities verified."
  fi
  if [ "$version_ready" = 1 ] && [ "$transport_ready" = 1 ]; then break; fi
  echo "Preview readiness retry $n/12: version=$version_ready transport=$transport_ready"
  sleep 5
done
if [ "$version_ready" != 1 ] || [ "$transport_ready" != 1 ]; then
  echo "::error::Preview readiness verification failed: version=$version_ready transport=$transport_ready"
  exit 1
fi
current="$(curl -fsS --max-time 30 -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" "$api/deployments?env=production&per_page=1" | jq -er '.result[0].id')"
test "$current" = "$previous"
echo "preview_url=$PREVIEW_URL" >> "$GITHUB_OUTPUT"
echo "Preview: $PREVIEW_URL" >> "$GITHUB_STEP_SUMMARY"
echo "Private source: $SOURCE_SHA ($APP_VERSION)" >> "$GITHUB_STEP_SUMMARY"
echo "Public UI commit: $PUBLIC_SHA" >> "$GITHUB_STEP_SUMMARY"
echo "CSS SHA-256: $CSS_SHA" >> "$GITHUB_STEP_SUMMARY"
echo "Experiment only; no Production promotion job exists." >> "$GITHUB_STEP_SUMMARY"
echo "Preview deployed and Production deployment identity verified unchanged."
