$ErrorActionPreference = "Stop"
Set-Location "$PSScriptRoot\..\apps\mobile"
$env:APP_VARIANT = "development"
npx eas-cli@latest build --platform android --profile development
