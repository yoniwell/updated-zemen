$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$mysqlContainerName = 'zemen-mysql-local'
$mysqlImage = 'mysql:8.4'
$mysqlPort = 3306
$mysqlDatabase = 'zemen_sacco'
$mysqlUser = 'zemen'
$mysqlPassword = 'zemen'
$mysqlRootPassword = 'zemen_root'
$mysqlVolumeName = 'zemen_mysql_data'

function Resolve-DockerCli {
  $dockerCommand = Get-Command docker -ErrorAction SilentlyContinue
  if ($dockerCommand) {
    return $dockerCommand.Source
  }

  $candidates = @(
    (Join-Path $env:ProgramFiles 'Docker\Docker\resources\bin\docker.exe'),
    (Join-Path $env:ProgramFiles 'Docker\Docker\resources\docker-cli.exe'),
    (Join-Path $env:ProgramData 'DockerDesktop\version-bin\docker.exe'),
    (Join-Path $env:ProgramData 'DockerDesktop\version-bin\docker-cli.exe')
  )

  foreach ($candidate in $candidates) {
    if ($candidate -and (Test-Path $candidate)) {
      return $candidate
    }
  }

  return $null
}

function Get-DockerCliOrThrow {
  $dockerCli = Resolve-DockerCli
  if (-not $dockerCli) {
    throw "Docker CLI was not found. Install/start Docker Desktop and restart this terminal. To run website only, use: npm --prefix frontend run dev"
  }

  return $dockerCli
}

function Test-PortListening {
  param([int]$Port)
  return [bool](Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
}

function Start-MySqlContainer {
  $dockerCli = Get-DockerCliOrThrow

  $existing = (& $dockerCli ps -a --filter "name=^/$mysqlContainerName$" --format "{{.Names}}" 2>$null)
  if (-not $existing) {
    Write-Output "Creating local MySQL container '$mysqlContainerName'..."
    & $dockerCli run -d --name $mysqlContainerName --restart unless-stopped `
      -e "MYSQL_ROOT_PASSWORD=$mysqlRootPassword" `
      -e "MYSQL_DATABASE=$mysqlDatabase" `
      -e "MYSQL_USER=$mysqlUser" `
      -e "MYSQL_PASSWORD=$mysqlPassword" `
      -p "$mysqlPort`:3306" `
      -v "$mysqlVolumeName`:/var/lib/mysql" `
      $mysqlImage | Out-Null
    return $dockerCli
  }

  $running = (& $dockerCli ps --filter "name=^/$mysqlContainerName$" --format "{{.Names}}" 2>$null)
  if (-not $running) {
    Write-Output "Starting existing MySQL container '$mysqlContainerName'..."
    & $dockerCli start $mysqlContainerName | Out-Null
  } else {
    Write-Output "MySQL container '$mysqlContainerName' already running."
  }

  return $dockerCli
}

function Wait-ForMySql {
  param(
    [string]$DockerCli,
    [int]$TimeoutSeconds = 90
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  do {
    & $DockerCli exec $mysqlContainerName mysqladmin ping -h 127.0.0.1 -uroot "-p$mysqlRootPassword" --silent 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) {
      return $true
    }

    Start-Sleep -Milliseconds 500
  } while ((Get-Date) -lt $deadline)

  return $false
}

Write-Output '== Local Dev Startup =='

$dockerCli = Start-MySqlContainer
if (-not (Wait-ForMySql -DockerCli $dockerCli -TimeoutSeconds 90)) {
  throw "MySQL container '$mysqlContainerName' did not become ready within timeout"
}

$databaseUrl = "mysql://${mysqlUser}:${mysqlPassword}@localhost:${mysqlPort}/${mysqlDatabase}"

if (!(Test-PortListening -Port 3000)) {
  Write-Output 'Starting frontend on port 3000...'
  Start-Process -FilePath 'powershell.exe' -ArgumentList @(
    '-NoExit',
    '-Command',
    "Set-Location '$repoRoot'; npm --prefix frontend run dev"
  ) | Out-Null
} else {
  Write-Output 'Frontend already running on port 3000.'
}

if (!(Test-PortListening -Port 5000)) {
  Write-Output 'Starting backend on port 5000...'
  $backendCommand = "Set-Location '$repoRoot'; `$env:DATABASE_URL = '$databaseUrl'; npm --prefix backend run dev"
  Start-Process -FilePath 'powershell.exe' -ArgumentList @(
    '-NoExit',
    '-Command',
    $backendCommand
  ) | Out-Null
} else {
  Write-Output 'Backend already running on port 5000.'
}

Write-Output ''
Write-Output "Local MySQL: container=$mysqlContainerName, database=$mysqlDatabase, url=$databaseUrl"
Write-Output 'Admin login:'
Write-Output 'http://localhost:3000/admin/login'
Write-Output 'Username: admin@zemen.com'
Write-Output 'Password: admin123'
