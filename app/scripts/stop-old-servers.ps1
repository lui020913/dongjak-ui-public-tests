# Run only in Windows PowerShell. Stop old local DongjakApp Node/Vite servers.
$ErrorActionPreference = 'Stop'
$ports = @(5178, 5194, 5195, 5196)
$connections = @(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
  Where-Object { $_.LocalPort -in $ports -and $_.OwningProcess -gt 4 })
$owners = @($connections | Select-Object -ExpandProperty OwningProcess -Unique)
if ($owners.Count -eq 0) { Write-Host '종료할 동작구 지도 서버가 없습니다.'; exit 0 }
foreach ($processId in $owners) {
  $processInfo = Get-CimInstance Win32_Process -Filter "ProcessId = $processId" -ErrorAction SilentlyContinue
  if ($null -eq $processInfo) { continue }
  $name = [string]$processInfo.Name
  $commandLine = [string]$processInfo.CommandLine
  $node = ($name -eq 'node.exe')
  $dongjak = ($commandLine -match '(?i)DongjakApp')
  $server = ($commandLine -match '(?i)(transport-proxy\.mjs|vite[\\/]bin[\\/]vite\.js|start-local\.mjs)')
  if ($node -and $dongjak -and $server) {
    Write-Host "동작구 서버 종료: PID=$processId"
    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
  } else {
    Write-Warning "다른 프로세스가 포트를 사용 중입니다. 자동 종료하지 않았습니다: PID=$processId ($name)"
  }
}
