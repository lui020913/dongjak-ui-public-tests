#!/usr/bin/env bash
# Run locally once, never in an untrusted runner, and never commit generated key material.
set -euo pipefail
umask 077
repo=lui020913/dongjak-ui-public-tests
for cmd in gh keytool openssl; do command -v "$cmd" >/dev/null || { echo "Required: $cmd" >&2; exit 1; }; done
gh auth status
existing="$(gh secret list -R "$repo" --json name --jq '.[].name')"
if grep -Eq '^ANDROID_DEBUG_(KEYSTORE_BASE64|KEYSTORE_PASSWORD|CERT_SHA256)$' <<<"$existing"; then
  echo 'Existing signing setup found; refusing to overwrite. Restore the original key instead.' >&2
  exit 1
fi
dir="$HOME/.dongjak-android-debug-signing"
if [ -e "$dir" ]; then echo "Existing key directory found. Do not replace it: $dir" >&2; exit 1; fi
mkdir -m 700 "$dir"
openssl rand -hex 24 > "$dir/password.txt"
export DONGJAK_SIGN_PASSWORD="$(cat "$dir/password.txt")"
trap 'unset DONGJAK_SIGN_PASSWORD' EXIT
keytool -genkeypair -noprompt -alias dongjak-debug -keyalg RSA -keysize 3072 -validity 10950 -dname 'CN=Dongjak Safety Map Test Distribution' -storetype PKCS12 -keystore "$dir/debug.p12" -storepass:env DONGJAK_SIGN_PASSWORD -keypass:env DONGJAK_SIGN_PASSWORD
keytool -exportcert -alias dongjak-debug -keystore "$dir/debug.p12" -storepass:env DONGJAK_SIGN_PASSWORD | openssl dgst -sha256 -r | awk '{print $1}' > "$dir/cert-sha256.txt"
grep -Eq '^[a-fA-F0-9]{64}$' "$dir/cert-sha256.txt"
openssl base64 -A -in "$dir/debug.p12" | gh secret set ANDROID_DEBUG_KEYSTORE_BASE64 -R "$repo"
gh secret set ANDROID_DEBUG_KEYSTORE_PASSWORD -R "$repo" < "$dir/password.txt"
gh secret set ANDROID_DEBUG_CERT_SHA256 -R "$repo" < "$dir/cert-sha256.txt"
echo "Signing secrets registered. Securely back up $dir; do not share its contents."
