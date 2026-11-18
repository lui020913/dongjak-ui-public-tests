# Public runner release path (v8.9.11)
Owner-dispatched only, from main. This is a prepared migration, not a verified deployment.

Create protected GitHub Actions environments: public-source-build, public-cloudflare-preview, public-cloudflare-production. Limit deployments to main and restrict changes to trusted maintainers. Configure environment secrets using the GitHub UI, never comments or chat:
- public-source-build: PRIVATE_SOURCE_READ_TOKEN (fine-grained, only private source repository, Contents read), RELEASE_BUNDLE_KEY (32 random bytes, canonical Base64).
- public-cloudflare-preview: same RELEASE_BUNDLE_KEY; CLOUDFLARE_API_TOKEN (minimum Pages deployment/read permissions), CLOUDFLARE_ACCOUNT_ID.
- public-cloudflare-production: same RELEASE_BUNDLE_KEY; PRIVATE_SOURCE_READ_TOKEN; CLOUDFLARE_API_TOKEN; CLOUDFLARE_ACCOUNT_ID. Require explicit approval in this environment where supported.
- Repository variables VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are browser-public configuration, not a service-role secret.

Never expose plaintext private source, private unit/build logs, or source archives in public artifacts. The only cross-job build artifact is authenticated AES-256-GCM ciphertext. A public runner nevertheless receives private source temporarily and must be treated as privileged. If policy prohibits even that, retain private builds. Existing private workflow remains a manual fallback; don't execute both paths for one source.

Run Public runner - private source build and Preview with the exact current private source SHA. It builds, encrypts the candidate, deploys Preview and dispatches the five-viewport anonymous gate. Production requires explicit owner dispatch with matching source SHA, successful build run and five-viewport audit run, current private head, verified Preview identity and predecessor. The encrypted artifact expires after seven days; do not store the encryption key publicly. Existing Cloudflare server bindings remain in Cloudflare; do not copy runtime credentials into GitHub. Public diagnostics intentionally omit private logs. If setup or checks fail, Production stays blocked.

## Setup preflight
Use Actions → Public release setup preflight - no deployment → Run workflow, select main, and enable check_credentials. The public runner checks secret format and read access to the one source ref and Pages project; it does not read source files, expose secret values, or deploy. This cannot establish Cloudflare write permission or that the encryption keys in the three environments are identical; the actual build/Preview must verify those. Static crypto tests use disposable local random keys and never require real credentials.
