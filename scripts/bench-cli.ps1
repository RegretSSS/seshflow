$ErrorActionPreference = 'Stop'

$repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$tmp = Join-Path $env:TEMP ("seshflow-bench-" + [guid]::NewGuid().ToString())
$node = (Get-Command node).Source
$cli = Join-Path $repo 'packages\cli\bin\seshflow.js'

function Measure-Cli {
  param(
    [string]$Label,
    [string[]]$CommandArgs,
    [int]$Iterations = 8
  )

  $times = @()
  1..$Iterations | ForEach-Object {
    $measurement = Measure-Command { & $node $cli @CommandArgs | Out-Null }
    $times += $measurement.TotalMilliseconds
  }

  [pscustomobject]@{
    command = $Label
    avg_ms = [math]::Round((($times | Measure-Object -Average).Average), 2)
    min_ms = [math]::Round((($times | Measure-Object -Minimum).Minimum), 2)
    max_ms = [math]::Round((($times | Measure-Object -Maximum).Maximum), 2)
  }
}

New-Item -ItemType Directory -Path $tmp | Out-Null

try {
  Push-Location $tmp

  $results = @()
  $init = Measure-Command { & $node $cli init --force | Out-Null }
  $results += [pscustomobject]@{
    command = 'init'
    avg_ms = [math]::Round($init.TotalMilliseconds, 2)
    min_ms = $null
    max_ms = $null
  }

  $foundation = (& $node $cli add 'Foundation' --priority P0) | ConvertFrom-Json
  (& $node $cli add 'API contract' --priority P1) | Out-Null
  (& $node $cli add 'Web control plane' --priority P1) | Out-Null

  $results += Measure-Cli -Label 'ncfr' -CommandArgs @('ncfr')
  $results += Measure-Cli -Label 'list' -CommandArgs @('list')
  $results += Measure-Cli -Label 'next' -CommandArgs @('next')
  $results += Measure-Cli -Label 'show' -CommandArgs @('show', $foundation.task.id)
  $results += Measure-Cli -Label 'stats' -CommandArgs @('stats')

  $results | ConvertTo-Json -Depth 4
}
finally {
  Pop-Location
  Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
}
