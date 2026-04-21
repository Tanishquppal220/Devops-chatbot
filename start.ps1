# Start DevOps Chatbot services for Windows PowerShell

# Resolve the repository root directory from the current script path
$scriptPath = $MyInvocation.MyCommand.Path
$rootDir = Split-Path -Parent $scriptPath

Write-Host "`n🚀 Starting DevOps Chatbot Stack..." -ForegroundColor Cyan

function Stop-Services {
    Write-Host "`nStopping services..." -ForegroundColor Cyan
    if ($backendProcess -and -not $backendProcess.HasExited) {
        Stop-Process -Id $backendProcess.Id -ErrorAction SilentlyContinue
    }
    if ($frontendProcess -and -not $frontendProcess.HasExited) {
        Stop-Process -Id $frontendProcess.Id -ErrorAction SilentlyContinue
    }
    Write-Host "✅ All services stopped." -ForegroundColor Green
}

try {
    # 1. Start Backend
    Write-Host "Starting Backend..." -ForegroundColor Cyan
    $backendProcess = Start-Process -FilePath uv -ArgumentList 'run', 'main.py' -WorkingDirectory "$rootDir\backend" -NoNewWindow -PassThru
    Write-Host "Backend running on PID: $($backendProcess.Id)"

    # 2. Start Frontend
    Write-Host "Starting Frontend..." -ForegroundColor Cyan
    $frontendProcess = Start-Process -FilePath npm -ArgumentList 'run', 'dev' -WorkingDirectory "$rootDir\frontend" -NoNewWindow -PassThru
    Write-Host "Frontend running on PID: $($frontendProcess.Id)"

    Write-Host "`n✨ Both services are running!" -ForegroundColor Green
    Write-Host "Backend: http://localhost:8000"
    Write-Host "Frontend: http://localhost:5173 (usually)"
    Write-Host "Press Ctrl+C to stop both services." -ForegroundColor Cyan

    Wait-Process -Id $backendProcess.Id, $frontendProcess.Id
}
finally {
    Stop-Services
}
