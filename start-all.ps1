$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

# ===== Verificación de JDK 21 (requerido por todos los módulos) =====
# java -version escribe en stderr; con Stop eso lanza NativeCommandError
$prevEap = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
$javaVersion = (& java -version 2>&1 | Select-Object -First 1) | Out-String
$ErrorActionPreference = $prevEap
if ($javaVersion -notmatch 'version "21') {
    Write-Host "ERROR: se requiere JDK 21 y el 'java' del PATH reporta:" -ForegroundColor Red
    Write-Host "  $javaVersion" -ForegroundColor Red
    Write-Host "Ajusta JAVA_HOME o el PATH para usar JDK 21 (por ejemplo C:\Program Files\Java\jdk-21.x)." -ForegroundColor Yellow
    exit 1
}
Write-Host "JDK detectado: $javaVersion" -ForegroundColor Green

# mvnw usa JAVA_HOME; el del sistema puede apuntar a otro JDK.
# Se fija JAVA_HOME al java.home del JDK 21 detectado para las ventanas hijas.
$prevEap = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
$javaHomeLine = (& java -XshowSettings:properties -version 2>&1 | Select-String 'java.home' | Select-Object -First 1) | Out-String
$ErrorActionPreference = $prevEap
if ($javaHomeLine -match 'java.home\s*=\s*(.+)') {
    $env:JAVA_HOME = $matches[1].Trim()
    Write-Host "JAVA_HOME fijado a $env:JAVA_HOME" -ForegroundColor Green
} else {
    Write-Host "AVISO: no se pudo leer java.home; se usara el JAVA_HOME actual." -ForegroundColor Yellow
}

$envFile = Join-Path $root ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]*)=(.*)$') {
            $name = $matches[1].Trim(); $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
}
function Start-ServiceWindow($name,$folder,$command){$path=Join-Path $root $folder;Start-Process powershell -ArgumentList '-NoExit','-Command',"Set-Location '$path'; $command"}
Start-ServiceWindow 'Eureka' 'Eurekeando/eureka' '.\mvnw.cmd spring-boot:run'
Start-Sleep -Seconds 10
Start-ServiceWindow 'AuthServer' 'auth-server' '.\mvnw.cmd spring-boot:run'
Start-Sleep -Seconds 10
Start-ServiceWindow 'MS-A' 'MS-A' '.\mvnw.cmd spring-boot:run'
Start-ServiceWindow 'MS-B' 'MS-B' '.\mvnw.cmd spring-boot:run'
Start-ServiceWindow 'RATE' 'rate' '.\mvnw.cmd spring-boot:run'
Start-ServiceWindow 'Angular' 'frontend' 'npm install; npm start'