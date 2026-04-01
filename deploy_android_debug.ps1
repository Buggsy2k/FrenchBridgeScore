$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
Set-Location (Join-Path $PSScriptRoot 'frontend')
npm run build
npx cap sync android
npx cap run android --target R5CY20VFJ1N
