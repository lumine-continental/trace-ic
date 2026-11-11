# =============================================================================
# TRACE IC — Empaquetador Automático para cPanel (trace.icontinental.edu.pe)
# Compila el Frontend (React + Vite) y ensambla la carpeta `deploy-cpanel/`
# lista para subir directamente al `public_html` del subdominio en cPanel.
# =============================================================================

$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent $PSScriptRoot
$FrontendDir = Join-Path $RootDir "frontend"
$BackendDir = Join-Path $RootDir "backend"
$DeployDir = Join-Path $RootDir "deploy-cpanel"

Write-Host "==> 1. Compilando Frontend React + Vite para produccion (/app/)..." -ForegroundColor Cyan
Push-Location $FrontendDir
npm.cmd run build
Pop-Location

Write-Host "==> 2. Preparando carpeta limpia deploy-cpanel/..." -ForegroundColor Cyan
if (Test-Path $DeployDir) {
    Remove-Item -Recurse -Force $DeployDir
}
New-Item -ItemType Directory -Path $DeployDir | Out-Null
New-Item -ItemType Directory -Path (Join-Path $DeployDir "app") | Out-Null
New-Item -ItemType Directory -Path (Join-Path $DeployDir "api") | Out-Null

Write-Host "==> 3. Copiando Backend PHP (redirect.php, .htaccess, tracker-snippet.js, api/)..." -ForegroundColor Cyan
Copy-Item (Join-Path $BackendDir ".htaccess") (Join-Path $DeployDir ".htaccess")
Copy-Item (Join-Path $BackendDir "redirect.php") (Join-Path $DeployDir "redirect.php")
Copy-Item (Join-Path $BackendDir "tracker-snippet.js") (Join-Path $DeployDir "tracker-snippet.js")
Copy-Item (Join-Path $BackendDir "api\*") (Join-Path $DeployDir "api\") -Recurse

Write-Host "==> 4. Copiando compilacion estatica de React + Vite hacia deploy-cpanel/app/..." -ForegroundColor Cyan
Copy-Item (Join-Path $FrontendDir "dist\*") (Join-Path $DeployDir "app\") -Recurse

Write-Host "==> LISTO: Paquete de produccion generado en: $DeployDir" -ForegroundColor Green
