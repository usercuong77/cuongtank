[CmdletBinding()]
param(
    [switch]$Visual,
    [switch]$UpdateSnapshots,
    [switch]$Headed,
    [switch]$Ui,
    [switch]$NoPause
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Write-Step {
    param([string]$Message)
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Ensure-NodeTools {
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        $nodeDir = "C:\Program Files\nodejs"
        if (Test-Path (Join-Path $nodeDir "node.exe")) {
            if (($env:Path -split ';') -notcontains $nodeDir) {
                $env:Path = "$nodeDir;$env:Path"
            }
        }
    }

    $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
    if (-not $nodeCmd) {
        throw "Node.js not found. Please install Node.js first."
    }

    $npmCmd = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if (-not $npmCmd) {
        $fallback = "C:\Program Files\nodejs\npm.cmd"
        if (Test-Path $fallback) {
            $npmCmd = Get-Item $fallback
        }
    }

    if (-not $npmCmd) {
        throw "npm.cmd not found. Please verify Node.js installation."
    }

    return @{
        Node = $nodeCmd.Path
        Npm  = $npmCmd.Path
    }
}

$exitCode = 0

try {
    $projectRoot = $PSScriptRoot
    if (-not (Test-Path (Join-Path $projectRoot "package.json"))) {
        $parent = Split-Path -Parent $PSScriptRoot
        if ($parent -and (Test-Path (Join-Path $parent "package.json"))) {
            $projectRoot = $parent
        }
    }
    if (-not (Test-Path (Join-Path $projectRoot "package.json"))) {
        throw "package.json not found in: $PSScriptRoot or parent folder"
    }

    Set-Location -Path $projectRoot

    $tools = Ensure-NodeTools
    Write-Step ("Project: " + $projectRoot)
    Write-Step ("Node: " + (& $tools.Node -v))
    Write-Step ("NPM : " + (& $tools.Npm -v))

    if ($UpdateSnapshots) {
        $Visual = $true
    }

    $scriptName = "test:e2e"
    if ($Visual) {
        $scriptName = "test:visual"
        if ($UpdateSnapshots) {
            $scriptName = "test:visual:update"
        }
    } elseif ($Ui) {
        $scriptName = "test:e2e:ui"
    } elseif ($Headed) {
        $scriptName = "test:e2e:headed"
    }

    Write-Step ("Running: npm run " + $scriptName)
    & $tools.Npm run $scriptName
    $exitCode = $LASTEXITCODE

    if ($exitCode -eq 0) {
        Write-Host ""
        Write-Host "PASS - All tests completed successfully." -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host ("FAIL - Tests failed. Exit code: " + $exitCode) -ForegroundColor Red
    }
}
catch {
    $exitCode = 1
    Write-Host ""
    Write-Host ("ERROR - " + $_.Exception.Message) -ForegroundColor Red
}
finally {
    if (-not $NoPause) {
        Write-Host ""
        Read-Host "Press Enter to close"
    }
    exit $exitCode
}
