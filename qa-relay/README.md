# Live QA remote relay (optional)

This is a separate Cloudflare Worker, not part of the safety-map production app. Local Live QA remains the default. Use only anonymous test sessions and a dedicated Cloudflare account/project configuration.

## Owner setup after the PR checks pass

1. Install/authenticate Wrangler with access to the intended Cloudflare account. From the checked-out repository run:
   `npx wrangler deploy --config qa-relay/wrangler.toml`.
2. Generate **two different** high-entropy strings (at least 32 characters; e.g. `openssl rand -hex 32` twice). Register each interactively, without exposing it in shell history or Git:
   `npx wrangler secret put QA_WRITER_KEY --config qa-relay/wrangler.toml` and
   `npx wrangler secret put QA_VIEWER_KEY --config qa-relay/wrangler.toml`.
3. In the repository Actions settings, add variable `QA_RELAY_URL` (the exact HTTPS Worker origin) and encrypted secret `QA_WRITER_KEY`. Do not add the viewer key to Actions.
4. On the trusted main branch, manually run **Live QA visual audit** with an approved anonymous target and `remote=true`. Open the Worker URL and enter the viewer key. Never put either key into a URL, commit, issue, or chat.
5. To stop remote observation, omit the remote option or revoke the relay keys. Delete the dedicated Worker if it is no longer needed.

The relay displays the latest sampled JPEG and timing counters approximately once per second, with pause/resume requests applied between journeys. It is not a live video stream. Full recordings and offline replay remain Actions artifacts/local console. A stale packet is hidden after 30 seconds, and the Durable Object deletes remote state after about two minutes without publishing. The relay does not provide remote shell or arbitrary browser controls. A deployed Worker, secrets, actual remote connectivity, and any account-specific Cloudflare constraints must be independently verified; this repository does not deploy or configure them automatically.
