# Build French Bridge release APK
# Output: frontend/android/app/build/outputs/apk/release/app-release.apk
#
# To install on a connected Android device:
#   adb install app-release.apk
#
# Or copy the APK file to your phone and open it to sideload.
# (You may need to enable "Install from unknown sources" in Android settings.)

$ErrorActionPreference = "Stop"
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"

Push-Location "$PSScriptRoot\frontend"
try {
    Write-Host "Building frontend..." -ForegroundColor Cyan
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "Frontend build failed" }

    Write-Host "Syncing to Android project..." -ForegroundColor Cyan
    npx cap sync android
    if ($LASTEXITCODE -ne 0) { throw "Capacitor sync failed" }

    Write-Host "Regenerating app icons..." -ForegroundColor Cyan
    node generate-icons.mjs
    if ($LASTEXITCODE -ne 0) { throw "Icon generation failed" }

    Push-Location android
    try {
        Write-Host "Building release APK..." -ForegroundColor Cyan
        .\gradlew.bat assembleRelease
        if ($LASTEXITCODE -ne 0) { throw "Gradle build failed" }
    } finally {
        Pop-Location
    }
} finally {
    Pop-Location
}

$apk = "$PSScriptRoot\frontend\android\app\build\outputs\apk\release\app-release.apk"
if (Test-Path $apk) {
    $size = [math]::Round((Get-Item $apk).Length / 1MB, 2)
    Write-Host "`nRelease APK built successfully ($size MB):" -ForegroundColor Green
    Write-Host "  $apk" -ForegroundColor Yellow
} else {
    Write-Host "`nBuild completed but APK not found at expected location." -ForegroundColor Red
}
