$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
Set-Location (Join-Path $PSScriptRoot 'frontend')
npm run build
npx cap sync android
<<<<<<< HEAD
node generate-icons.mjs
=======
>>>>>>> 6bbfa76b388c1782de731d6f200df74a420e9300
npx cap run android --target R5CY20VFJ1N
