$ErrorActionPreference = 'SilentlyContinue'

$mysqlContainerName = 'zemen-mysql-local'

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

function Stop-PortProcess {
  param([int]$Port)
  $pids = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique

  foreach ($processId in $pids) {
    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
    Write-Output "Stopped process on port $Port (PID $processId)"
  }
}

function Stop-MySqlContainer {
  $dockerCli = Resolve-DockerCli
  if (-not $dockerCli) {
    Write-Output 'Docker CLI not found. Skipping MySQL container shutdown.'
    return
  }

  $existing = (& $dockerCli ps -a --filter "name=^/$mysqlContainerName$" --format "{{.Names}}" 2>$null)
  if (-not $existing) {
    Write-Output "MySQL container '$mysqlContainerName' not found."
    return
  }

  $running = (& $dockerCli ps --filter "name=^/$mysqlContainerName$" --format "{{.Names}}" 2>$null)
  if ($running) {
    & $dockerCli stop $mysqlContainerName | Out-Null
    Write-Output "Stopped MySQL container '$mysqlContainerName'."
  } else {
    Write-Output "MySQL container '$mysqlContainerName' is already stopped."
  }
}

Write-Output '== Local Dev Shutdown =='
Stop-PortProcess -Port 3000
Stop-PortProcess -Port 5000
Stop-MySqlContainer
