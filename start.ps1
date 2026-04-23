# Start DevOps Chatbot services for Windows PowerShell

# Resolve the repository root directory from the current script path
$scriptPath = $MyInvocation.MyCommand.Path
$rootDir = Split-Path -Parent $scriptPath
$backendDir = Join-Path $rootDir 'backend'
$frontendDir = Join-Path $rootDir 'frontend'
$venvDir = Join-Path $backendDir '.venv'
$venvScripts = Join-Path $venvDir 'Scripts'

function Write-Info {
    param([string]$Message)
    Write-Host "`n$Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host $Message -ForegroundColor Green
}

function Get-PythonExecutable {
    $candidates = @('python.exe', 'python3.exe')
    foreach ($candidate in $candidates) {
        $command = Get-Command $candidate -ErrorAction SilentlyContinue
        if ($command) { return $command.Source }
    }
    throw 'Python 3 is required to set up the backend environment.'
}

function Setup-Backend {
    Write-Info 'Checking backend environment...'
    $pythonExe = Get-PythonExecutable

    if (-not (Test-Path $venvDir)) {
        Write-Info 'Creating Python virtual environment for backend...'
        & $pythonExe -m venv $venvDir
    }

    $venvPython = Join-Path $venvScripts 'python.exe'

    try {
        & $venvPython -m pip --version *> $null
    } catch {
        Write-Info 'pip not found in virtual environment; bootstrapping pip...'
        try {
            & $venvPython -m ensurepip --upgrade *> $null
        } catch {
            throw 'Failed to bootstrap pip. Install a Python distribution with ensurepip or install pip manually.'
        }
    }

    Write-Info 'Bootstrapping uv in the backend virtual environment...'
    & $venvPython -m pip install --upgrade pip
    & $venvPython -m pip install uv

    Write-Info 'Syncing backend dependencies with uv...'
    Push-Location $backendDir
    & $venvPython -m uv sync
    Pop-Location
}

function Setup-Frontend {
    Write-Info 'Checking frontend environment...'
    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
        throw 'npm is required to install frontend dependencies.'
    }

    $nodeModules = Join-Path $frontendDir 'node_modules'
    if (-not (Test-Path $nodeModules)) {
        Write-Info 'Installing frontend dependencies...'
        Push-Location $frontendDir
        npm install
        Pop-Location
    }
}

function Stop-Services {
    Write-Host '`nStopping services...' -ForegroundColor Cyan
    if ($backendProcess -and -not $backendProcess.HasExited) {
        Stop-Process -Id $backendProcess.Id -ErrorAction SilentlyContinue
    }
    if ($frontendProcess -and -not $frontendProcess.HasExited) {
        Stop-Process -Id $frontendProcess.Id -ErrorAction SilentlyContinue
    }
    Write-Success '✅ All services stopped.'
}

try {
    Write-Info '🚀 Starting DevOps Chatbot Stack...'
    Setup-Backend
    Setup-Frontend

    Write-Info 'Starting Backend...'
    $venvPython = Join-Path $venvScripts 'python.exe'
    $backendProcess = Start-Process -FilePath $venvPython -ArgumentList 'main.py' -WorkingDirectory $backendDir -NoNewWindow -PassThru
    Write-Host "Backend running on PID: $($backendProcess.Id)"

    Write-Info 'Starting Frontend...'
    $frontendProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm run dev" -WorkingDirectory $frontendDir -NoNewWindow -PassThru
    Write-Host "Frontend running on PID: $($frontendProcess.Id)"

    Write-Success '✨ Both services are running!'
    Write-Host 'Backend: http://localhost:8000'
    Write-Host 'Frontend: http://localhost:5173 (usually)'
    Write-Host 'Press Ctrl+C to stop both services.' -ForegroundColor Cyan

    Wait-Process -Id $backendProcess.Id, $frontendProcess.Id
}
finally {
    Stop-Services
}
