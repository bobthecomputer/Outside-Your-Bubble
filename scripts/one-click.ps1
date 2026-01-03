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
$script:DockerCommand = $null
$script:NpmCommand = $null

if ($SkipDb) {
  $SkipSeed = $true
}

function Invoke-Checked {
  param(
    [string]$Executable,
    [string[]]$Arguments
  )
  if ($Arguments) {
    & $Executable @Arguments
  } else {
    & $Executable
  }
  if ($LASTEXITCODE -ne 0) {
    throw "$Executable $($Arguments -join ' ') failed with exit code $LASTEXITCODE"
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

function Resolve-DockerCommand {
  $dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
  if ($dockerCmd) {
    return $dockerCmd.Source
  }

  $candidatePaths = @(
    (Join-Path $Env:ProgramFiles "Docker\\Docker\\resources\\bin\\docker.exe"),
    (Join-Path ${Env:ProgramFiles(x86)} "Docker\\Docker\\resources\\bin\\docker.exe")
  )

  foreach ($candidate in $candidatePaths) {
    if ($candidate -and (Test-Path $candidate)) {
      return $candidate
    }
  }

  return $null
}

function Resolve-NpmCommand {
  $npmCmd = Get-Command "npm.cmd" -ErrorAction SilentlyContinue
  if ($npmCmd) {
    return $npmCmd.Source
  }

  $npm = Get-Command npm -ErrorAction SilentlyContinue
  if ($npm) {
    return $npm.Source
  }

  return $null
}

function Ensure-Npm {
  $resolved = Resolve-NpmCommand
  if (-not $resolved) {
    throw "npm is not available. Install Node.js 20+ and retry."
  }
  $script:NpmCommand = $resolved
}

function Install-Dependencies {
  if ($SkipInstall) {
    return
  }

  $nodeModules = Join-Path $RepoRoot "node_modules"
  $nextBin = Join-Path $nodeModules ".bin\\next.cmd"
  if (-not (Test-Path $nodeModules) -or -not (Test-Path $nextBin)) {
    Write-Host "[one-click] Installing dependencies..."
    Invoke-Checked $script:NpmCommand @("install")
  }
}

function Ensure-Docker {
  if ($SkipDocker) {
    return
  }

  $resolved = Resolve-DockerCommand
  if ($resolved) {
    $script:DockerCommand = $resolved
  }

  if (-not $script:DockerCommand) {
    if ($NoInstallDocker) {
      throw "Docker not found. Install Docker Desktop or rerun with -SkipDocker and provide your own Postgres."
    }

    $wingetCmd = Get-Command winget -ErrorAction SilentlyContinue
    if (-not $wingetCmd) {
      throw "Docker not found and winget is unavailable. Install Docker Desktop and retry."
    }

    Write-Host "[one-click] Installing Docker Desktop via winget..."
    Invoke-Checked "winget" @(
      "install",
      "-e",
      "--id",
      "Docker.DockerDesktop",
      "--accept-package-agreements",
      "--accept-source-agreements",
      "--disable-interactivity"
    )
  }

  if (-not $script:DockerCommand) {
    $resolved = Resolve-DockerCommand
    if ($resolved) {
      $script:DockerCommand = $resolved
    } else {
      throw "Docker CLI not found after installation. Close and reopen your terminal, or run -SkipDocker with a local Postgres."
    }
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
    & $script:DockerCommand info *> $null
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
  Invoke-Checked $script:DockerCommand @("compose", "up", "-d", "postgres", "redis", "mailhog")
}

function Setup-Database {
  if ($SkipDb) {
    return
  }
  Write-Host "[one-click] Generating Prisma client..."
  Invoke-Checked $script:NpmCommand @("run", "prisma:generate")
  Write-Host "[one-click] Applying Prisma migrations..."
  Invoke-Checked $script:NpmCommand @("run", "prisma:deploy")
  if (-not $SkipSeed) {
    Write-Host "[one-click] Seeding database..."
    Invoke-Checked $script:NpmCommand @("run", "prisma:seed")
  }
}

function Start-Preview {
  if ($SkipPreview) {
    Write-Host "[one-click] Done. Run npm run preview to start the app."
    return
  }

  Write-Host "[one-click] Starting preview..."
  Invoke-Checked $script:NpmCommand @("run", "preview")
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
