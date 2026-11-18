#Requires -Version 7.0
# Run locally as repository owner; never paste credentials into a chat, command line or issue.
[CmdletBinding()]
param([switch]$RunPreflight)
$ErrorActionPreference = 'Stop'
$repo = 'lui020913/dongjak-ui-public-tests'
$private = 'lui020913/dongjak-safety-map'
$owner = 'lui020913'
function Invoke-Gh {
    param([Parameter(Mandatory)][string[]]$Arguments, [string]$Stdin)
    if ($PSBoundParameters.ContainsKey('Stdin')) {
        $output = $Stdin | & gh @Arguments
    } else {
        $output = & gh @Arguments
    }
    if ($LASTEXITCODE -ne 0) { throw 'GitHub CLI request failed; no deployment was requested.' }
    return $output
}
function Read-Secret([string]$Label) {
    $secure = Read-Host $Label -AsSecureString
    if ($secure.Length -eq 0) { throw 'A required value was empty.' }
    return [System.Net.NetworkCredential]::new('', $secure).Password
}
function Set-EnvSecret([string]$Environment, [string]$Name, [string]$Value) {
    if ([string]::IsNullOrWhiteSpace($Value)) { throw "Empty value for $Name" }
    $null = Invoke-Gh -Arguments @('secret','set',$Name,'--repo',$repo,'--env',$Environment) -Stdin $Value
    Write-Host "Configured $Environment / $Name"
}
function Set-ProtectedEnvironment([string]$Name, [bool]$Production, [long]$OwnerId) {
    $endpoint = "repos/$repo/environments/$Name"
    $existingRaw = & gh api $endpoint 2>$null
    $exists = $LASTEXITCODE -eq 0
    if (-not $exists) {
        # Fail closed if a missing environment cannot be created with a main-only policy.
        $body = @{
            deployment_branch_policy = @{ protected_branches = $false; custom_branch_policies = $true }
        }
        if ($Production) {
            $body.reviewers = @(@{type='User';id=$OwnerId})
            $body.prevent_self_review = $false
        }
        $null = Invoke-Gh -Arguments @('api','--method','PUT',$endpoint,'--input','-') -Stdin ($body | ConvertTo-Json -Depth 8 -Compress)
        $rule = @{name='main';type='branch'} | ConvertTo-Json -Compress
        $null = Invoke-Gh -Arguments @('api','--method','POST',"$endpoint/deployment-branch-policies",'--input','-') -Stdin $rule
    }
    # Do not overwrite any existing environment or silently relax protection.
    $environment = (Invoke-Gh -Arguments @('api',$endpoint) | ConvertFrom-Json)
    $policy = $environment.deployment_branch_policy
    if (-not $policy.custom_branch_policies -or $policy.protected_branches) {
        throw "Environment '$Name' must use a custom main-only deployment branch policy. Inspect existing settings; nothing was overwritten."
    }
    $rules = (Invoke-Gh -Arguments @('api',"$endpoint/deployment-branch-policies") | ConvertFrom-Json).branch_policies
    if (@($rules).Count -ne 1 -or $rules[0].name -ne 'main' -or ($rules[0].type -and $rules[0].type -ne 'branch')) {
        throw "Environment '$Name' does not have exactly one main branch rule. Inspect it manually."
    }
    if ($Production) {
        $reviewRule = @($environment.protection_rules | Where-Object {$_.type -eq 'required_reviewers'})
        $reviewers = @($reviewRule | ForEach-Object {$_.reviewers})
        if ($reviewers.Count -ne 1 -or $reviewers[0].type -ne 'User' -or [long]$reviewers[0].reviewer.id -ne $OwnerId) {
            throw "Production requires the repository owner as its only required reviewer. Inspect the environment manually."
        }
    }
    Write-Host "Verified main-only environment: $Name"
}
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    throw 'Install GitHub CLI (https://cli.github.com/) and run gh auth login first.'
}
$account = (Invoke-Gh -Arguments @('api','user') | ConvertFrom-Json)
if ($account.login -ne $owner) { throw "Sign in as $owner using gh auth login." }
$meta = (Invoke-Gh -Arguments @('api',"repos/$repo") | ConvertFrom-Json)
if (-not $meta.permissions.admin -or $meta.private) { throw 'Expected owner-admin access to the public release repository.' }
Write-Host 'This configures three restricted environments. It does NOT deploy or change Production.'
Write-Host 'Use a fine-grained token limited to the private source repository: Contents: Read-only.'
$sourceToken = Read-Secret 'Private-source read token'
$cfToken = Read-Secret 'Cloudflare Pages deployment token'
$cfAccount = Read-Host 'Cloudflare account ID'
if ($cfAccount -notmatch '^[a-fA-F0-9]{32}$') { throw 'Invalid Cloudflare account ID.' }
$sbUrl = Read-Host 'Supabase project HTTPS URL (browser-public)'
if ($sbUrl -notmatch '^https://[a-zA-Z0-9-]+\.supabase\.co/?$') { throw 'Unexpected Supabase project URL.' }
$sbKey = Read-Secret 'Supabase publishable key (sb_publishable_..., NEVER service-role)'
if ($sbKey -notmatch '^sb_publishable_[A-Za-z0-9_-]+$') { throw 'Expected only a Supabase publishable key.' }
try {
    # Check read access directly. Do not reuse the broad GitHub CLI session token.
    $headers = @{ Authorization="Bearer $sourceToken"; Accept='application/vnd.github+json'; 'X-GitHub-Api-Version'='2022-11-28' }
    $source = Invoke-RestMethod -Method Get -Uri "https://api.github.com/repos/$private/git/ref/heads/hotfix/v8.9.11-motion-20261118" -Headers $headers -ErrorAction Stop
    if ($source.object.sha -notmatch '^[a-f0-9]{40}$') { throw 'Private source identity check failed.' }
    $cfHeaders = @{ Authorization="Bearer $cfToken" }
    $project = Invoke-RestMethod -Method Get -Uri "https://api.cloudflare.com/client/v4/accounts/$cfAccount/pages/projects/dongjak-walk-safety-preview" -Headers $cfHeaders -ErrorAction Stop
    if (-not $project.success -or $project.result.production_branch -ne 'main') { throw 'Wrong Cloudflare Pages project.' }
    $envs = @('public-source-build','public-cloudflare-preview','public-cloudflare-production')
    Set-ProtectedEnvironment $envs[0] $false $account.id
    Set-ProtectedEnvironment $envs[1] $false $account.id
    Set-ProtectedEnvironment $envs[2] $true $account.id
    # Generate exactly once. Re-running rotates the bundle key and invalidates old encrypted artifacts.
    $confirmation = Read-Host 'Type CONFIGURE to register secrets (rotates encrypted-bundle key)'
    if ($confirmation -cne 'CONFIGURE') { throw 'Secret registration cancelled.' }
    $keyBytes = [System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32)
    $bundleKey = [Convert]::ToBase64String($keyBytes)
    foreach ($name in $envs) { Set-EnvSecret $name 'RELEASE_BUNDLE_KEY' $bundleKey }
    foreach ($name in @($envs[0],$envs[2])) { Set-EnvSecret $name 'PRIVATE_SOURCE_READ_TOKEN' $sourceToken }
    foreach ($name in @($envs[1],$envs[2])) {
        Set-EnvSecret $name 'CLOUDFLARE_API_TOKEN' $cfToken
        Set-EnvSecret $name 'CLOUDFLARE_ACCOUNT_ID' $cfAccount
    }
    $null = Invoke-Gh -Arguments @('variable','set','VITE_SUPABASE_URL','--repo',$repo) -Stdin $sbUrl.TrimEnd('/')
    $null = Invoke-Gh -Arguments @('variable','set','VITE_SUPABASE_PUBLISHABLE_KEY','--repo',$repo) -Stdin $sbKey
    Write-Host 'Configuration completed; actual write/deploy permission is not yet verified.'
    if ($RunPreflight) {
        $null = Invoke-Gh -Arguments @('workflow','run','public-release-preflight.yml','--repo',$repo,'--ref','main','-f','check_credentials=true')
        Write-Host 'Requested read-only preflight; Production reviewer approval is required for its access check.'
    }
    Write-Host "Latest private source at preflight: $($source.object.sha)"
    Write-Host 'No application deployment was requested.'
} finally {
    if ($keyBytes) { [Array]::Clear($keyBytes,0,$keyBytes.Length) }
    $sourceToken = $cfToken = $bundleKey = $sbKey = $headers = $cfHeaders = $null
}
