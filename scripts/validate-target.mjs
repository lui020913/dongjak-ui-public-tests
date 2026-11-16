// Restrict remote browser audits to the known, public Cloudflare Pages deployment family.
const input = process.env.DONGJAK_TARGET_URL || 'https://dongjak-walk-safety-preview.pages.dev/';
let url;
try { url = new URL(input); } catch { throw new Error('Invalid target URL'); }
const root = 'dongjak-walk-safety-preview.pages.dev';
const host = url.hostname.toLowerCase();
if (
  url.protocol !== 'https:' ||
  url.username || url.password || url.search || url.hash || url.port ||
  !(host === root || host.endsWith('.' + root)) ||
  url.pathname !== '/'
) throw new Error('Only HTTPS root URLs under ' + root + ' are allowed without URL secrets.');
console.log('Approved anonymous test target: ' + url.origin + '/');
