# Build French Bridge release APK
# Output: frontend/android/app/build/outputs/apk/release/app-release.apk
#
# To install on a connected Android device:
#   adb install app-release.apk
#
# Or copy the APK file to your phone and open it to sideload.
# (You may need to enable "Install from unknown sources" in Android settings.)

$ErrorActionPreference = "Stop"

# Find a suitable JDK 17+ for Android Gradle Plugin
$javaHomeCandidates = @(
    "C:\Program Files\Android\Android Studio\jbr",
    "C:\Program Files\Microsoft\jdk-21.0.10.7-hotspot"
)
$env:JAVA_HOME = $javaHomeCandidates | Where-Object { Test-Path "$_\bin\java.exe" } | Select-Object -First 1
if (-not $env:JAVA_HOME) { throw "No suitable JDK found. Install JDK 17+ and update this script." }
Write-Host "Using JAVA_HOME: $env:JAVA_HOME" -ForegroundColor Cyan

# Ensure ANDROID_HOME is set for Gradle
if (-not $env:ANDROID_HOME) {
    $sdkCandidates = @(
        "$env:LOCALAPPDATA\Android\Sdk",
        "$env:USERPROFILE\AppData\Local\Android\Sdk"
    )
    $env:ANDROID_HOME = $sdkCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
}
if (-not $env:ANDROID_HOME) { throw "Android SDK not found. Run Android Studio setup wizard first." }

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
