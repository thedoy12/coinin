# Script setup PostgreSQL untuk Windows
# Jalankan: powershell -ExecutionPolicy Bypass -File setup-postgres.ps1

Write-Host "=== CoinIn PostgreSQL Setup ===" -ForegroundColor Cyan

# Check if PostgreSQL is installed
$postgresPath = "C:\Program Files\PostgreSQL"
$postgresFound = Test-Path $postgresPath

if (-not $postgresFound) {
    Write-Host "⚠️  PostgreSQL tidak ditemukan di $postgresPath" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Silakan install PostgreSQL 16 terlebih dahulu:" -ForegroundColor Yellow
    Write-Host "1. Download dari: https://www.postgresql.org/download/windows/" -ForegroundColor Gray
    Write-Host "2. Run installer, gunakan password 'postgres' untuk superuser" -ForegroundColor Gray
    Write-Host "3. Pastikan port 5432 tidak digunakan aplikasi lain" -ForegroundColor Gray
    Write-Host "4. Jalankan script ini kembali setelah instalasi selesai" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

Write-Host "✓ PostgreSQL ditemukan" -ForegroundColor Green

# Try to connect and create database
Write-Host "Membuat database 'coinin'..." -ForegroundColor Cyan

try {
    # This will prompt for password
    $env:PGPASSWORD="postgres"
    
    # Create database
    & "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -h localhost -c "CREATE DATABASE coinin;" 2>$null
    
    Write-Host "✓ Database 'coinin' siap" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Gagal membuat database. Pastikan PostgreSQL service berjalan:" -ForegroundColor Yellow
    Write-Host "   Services > PostgreSQL -> Start" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Setup selesai! Lanjutkan dengan:" -ForegroundColor Green
Write-Host "  cd d:\coinin" -ForegroundColor Gray
Write-Host "  npm run db:push" -ForegroundColor Gray
Write-Host "  npm run db:seed" -ForegroundColor Gray
