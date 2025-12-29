param(
  [switch]$SkipInstall,
  [switch]$SkipDocker,
  [switch]$SkipDb,
  [switch]$SkipSeed,
  [switch]$SkipPreview,
  [switch]$NoInstallDocker
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot

if ($SkipDb) {
  $SkipSeed = $true
}

function Invoke-Checked {
  param(
    [string]$Command,
    [string[]]$Args
  )
  & $Command @Args
  if ($LASTEXITCODE -ne 0) {
    throw "$Command $($Args -join ' ') failed with exit code $LASTEXITCODE"
  }
}

function Ensure-EnvFile {
  $envExample = Join-Path $RepoRoot ".env.example"
  $envLocal = Join-Path $RepoRoot ".env.local"
  $envDefault = Join-Path $RepoRoot ".env"

  if (Test-Path $envDefault) {
    Write-Host "[one-click] Existing .env file found."
    return
  }

  if (Test-Path $envLocal) {
    Copy-Item $envLocal $envDefault -Force
    Write-Host "[one-click] Created .env from .env.local."
    return
  }

  if (Test-Path $envExample) {
    Copy-Item $envExample $envDefault -Force
    if (-not (Test-Path $envLocal)) {
      Copy-Item $envExample $envLocal -Force
    }
    Write-Host "[one-click] Created .env (and .env.local) from .env.example."
    return
  }

  Write-Host "[one-click] No .env file created (missing .env.example)."
}

function Ensure-Npm {
  if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    throw "npm is not available. Install Node.js 20+ and retry."
  }
}

function Install-Dependencies {
  if ($SkipInstall) {
    return
  }

  $nodeModules = Join-Path $RepoRoot "node_modules"
  $nextBin = Join-Path $nodeModules ".bin\\next.cmd"
  if (-not (Test-Path $nodeModules) -or -not (Test-Path $nextBin)) {
    Write-Host "[one-click] Installing dependencies..."
    Invoke-Checked "npm" @("install")
  }
}

function Ensure-Docker {
  if ($SkipDocker) {
    return
  }

  $dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
  if (-not $dockerCmd) {
    if ($NoInstallDocker) {
      throw "Docker not found. Install Docker Desktop or rerun with -SkipDocker and provide your own Postgres."
    }

    $wingetCmd = Get-Command winget -ErrorAction SilentlyContinue
    if (-not $wingetCmd) {
      throw "Docker not found and winget is unavailable. Install Docker Desktop and retry."
    }

    Write-Host "[one-click] Installing Docker Desktop via winget..."
    Invoke-Checked "winget" @("install", "-e", "--id", "Docker.DockerDesktop", "--accept-package-agreements", "--accept-source-agreements")
  }

  $dockerDesktop = Join-Path $Env:ProgramFiles "Docker\\Docker\\Docker Desktop.exe"
  if (-not (Test-Path $dockerDesktop)) {
    $dockerDesktop = Join-Path $Env:ProgramFiles "Docker Desktop\\Docker Desktop.exe"
  }
  if (Test-Path $dockerDesktop) {
    Start-Process $dockerDesktop | Out-Null
  }

  $ready = $false
  for ($i = 0; $i -lt 60; $i++) {
    & docker info *> $null
    if ($LASTEXITCODE -eq 0) {
      $ready = $true
      break
    }
    Start-Sleep -Seconds 2
  }

  if (-not $ready) {
    throw "Docker is not ready. Start Docker Desktop and retry."
  }

  Write-Host "[one-click] Starting Docker services (postgres, redis, mailhog)..."
  Invoke-Checked "docker" @("compose", "up", "-d", "postgres", "redis", "mailhog")
}

function Setup-Database {
  if ($SkipDb) {
    return
  }
  Write-Host "[one-click] Generating Prisma client..."
  Invoke-Checked "npm" @("run", "prisma:generate")
  Write-Host "[one-click] Running Prisma migrations..."
  Invoke-Checked "npm" @("run", "prisma:migrate")
  if (-not $SkipSeed) {
    Write-Host "[one-click] Seeding database..."
    Invoke-Checked "npm" @("run", "prisma:seed")
  }
}

function Start-Preview {
  if ($SkipPreview) {
    Write-Host "[one-click] Done. Run npm run preview to start the app."
    return
  }

  Write-Host "[one-click] Starting preview..."
  Invoke-Checked "npm" @("run", "preview")
}

Push-Location $RepoRoot
try {
  Ensure-EnvFile
  Ensure-Npm
  Install-Dependencies
  Ensure-Docker
  Setup-Database
  Start-Preview
} finally {
  Pop-Location
}
