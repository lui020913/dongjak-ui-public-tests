# Set up ONLY Supabase Project URL and Publishable Key, never secrets.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not (Test-Path (Join-Path $root 'package.json')) -or -not (Test-Path (Join-Path $root 'supabase\favorites.sql'))) {
  Write-Host '[ERROR] This is not the DongjakApp project root.' -ForegroundColor Red
  exit 1
}
Write-Host ''
Write-Host 'Dongjak Safety Map - Supabase public client configuration' -ForegroundColor Cyan
Write-Host 'Find these values in Supabase Dashboard > Project Settings / Connect > API Keys.'
Write-Host 'Only PUBLIC credentials belong here. Never use sb_secret_, service_role, or database passwords.' -ForegroundColor Yellow
Write-Host ''
$url = (Read-Host 'Project URL (https://xxxx.supabase.co)').Trim().TrimEnd('/')
$key = (Read-Host 'Publishable Key (sb_publishable_...)').Trim()
if ($url -notmatch '^https://[a-z0-9-]+\.supabase\.co$') {
  Write-Host '[ERROR] Project URL must be https://PROJECT_REF.supabase.co' -ForegroundColor Red
  exit 1
}
if ($key -notmatch '^(sb_publishable_[A-Za-z0-9_-]{10,}|eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$' -or $key -match 'sb_secret_|service_role') {
  Write-Host '[ERROR] Use the public Publishable Key only (not a secret key).' -ForegroundColor Red
  exit 1
}
$contents = "VITE_SUPABASE_URL=$url`nVITE_SUPABASE_PUBLISHABLE_KEY=$key`n"
$enc = New-Object System.Text.UTF8Encoding($false)
foreach ($name in @('.env.production.local','.env.local')) {
  $path = Join-Path $root $name
  if (Test-Path $path) {
    $old = Get-Content -Raw -LiteralPath $path
    # Preserve other existing .env settings, while replacing ONLY these two public values.
    $lines = @($old -split '\r?\n' | Where-Object {$_ -notmatch '^\s*VITE_SUPABASE_(URL|PUBLISHABLE_KEY)\s*=' -and $_ -notmatch '^\s*$'})
    $new = ($lines -join "`n").TrimEnd() + "`n" + $contents
  } else { $new = $contents }
  [System.IO.File]::WriteAllText($path,$new,$enc)
  Write-Host "[OK] $name written (public config only; key not printed)" -ForegroundColor Green
}
Write-Host ''
Write-Host 'Next: run SQL from supabase/favorites.sql in Supabase SQL Editor (once).'
Write-Host 'Then run: npm ci; npm run build; npm run deploy:pages'
Write-Host 'Cloudflare Pages login redirects must include your deployed site URL.'
