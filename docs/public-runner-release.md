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

## Windows one-time local setup
For a Windows PC with PowerShell 7 and GitHub CLI authenticated as the repository owner, run the reviewed script `scripts/configure-public-release.ps1` locally. It prompts for the limited source and Cloudflare credentials, confirms the owner and Pages project, creates main-only environments only if absent, requires an owner reviewer for Production, and registers the encrypted bundle key without printing it. It refuses to modify existing incompatible environment settings. Running again rotates the key and invalidates previous encrypted bundles. Use the optional `-RunPreflight` flag to dispatch the read-only checks; it never starts a build or deploy. Never run scripts downloaded from untrusted refs or enter credentials into chat.

## Exact build proof
A public candidate passes its build_run as well as source_commit to the remote UI gate. Each viewport verifies the exact candidate hostname, SHA, version and build_run before and after testing. Production rejects legacy SHA-only audits and requires five successful viewport jobs from the matching build run. A new build of the same Git commit requires a new audit; an old result cannot authorize Production.

## Run identity and serialization
Dispatch a fresh public candidate instead of rerunning its workflow. GitHub reruns retain the run ID, so candidate packaging and Preview reject attempts above 1 and Production rejects any candidate with a rerun history. Preview and Production share one concurrency group to prevent competing public release changes. Existing legacy private workflows must not be run in parallel with the public release path.
