Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  🚍 Bus Tracking System" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
cmd.exe /c "cd /d $PSScriptRoot\server && npm install" 2>&1 | Out-Null
cmd.exe /c "cd /d $PSScriptRoot\client && npm install" 2>&1 | Out-Null

Write-Host "🌱 Seeding database..." -ForegroundColor Yellow
cmd.exe /c "cd /d $PSScriptRoot\server && node config/seed.js"

Write-Host ""
Write-Host "🚀 Starting server (port 5000)..." -ForegroundColor Green
$serverJob = Start-Job -ScriptBlock { cmd.exe /c "cd /d $using:PSScriptRoot\server && node server.js" }

Start-Sleep -Seconds 2

Write-Host "🌐 Starting client (port 5173)..." -ForegroundColor Green
$clientJob = Start-Job -ScriptBlock { cmd.exe /c "cd /d $using:PSScriptRoot\client && npx vite --host" }

Start-Sleep -Seconds 3

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  ✅ System is Running!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  📱 Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "  🖥️  API:     http://localhost:5000/api" -ForegroundColor White
Write-Host ""
Write-Host "📋 Test Accounts:" -ForegroundColor Yellow
Write-Host "  Driver 1:    driver1@test.com / password123" -ForegroundColor Gray
Write-Host "  Driver 2:    driver2@test.com / password123" -ForegroundColor Gray
Write-Host "  Passenger:   pass1@test.com / password123" -ForegroundColor Gray
Write-Host ""
Write-Host "Press Ctrl+C to stop" -ForegroundColor Red

try {
    while ($true) {
        Start-Sleep -Seconds 10
    }
} finally {
    Write-Host "`nStopping services..." -ForegroundColor Yellow
    Stop-Job $serverJob -ErrorAction SilentlyContinue
    Stop-Job $clientJob -ErrorAction SilentlyContinue
    Remove-Job $serverJob -ErrorAction SilentlyContinue
    Remove-Job $clientJob -ErrorAction SilentlyContinue
    Write-Host "Done." -ForegroundColor Green
}
