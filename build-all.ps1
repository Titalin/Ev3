$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$projects = @("Eurekeando/eureka", "auth-server", "MS-A", "MS-B", "rate")
foreach ($project in $projects) {
    Write-Host "Building $project ..." -ForegroundColor Cyan
    Push-Location (Join-Path $root $project)
    try { .\mvnw.cmd -U clean package } finally { Pop-Location }
}
Write-Host "Installing Angular dependencies and building frontend ..." -ForegroundColor Cyan
Push-Location (Join-Path $root "frontend")
try { npm install; npm run build } finally { Pop-Location }
Write-Host "All project build commands completed." -ForegroundColor Green