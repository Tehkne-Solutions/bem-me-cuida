$ErrorActionPreference = "Stop"

$Repo = "https://github.com/Tehkne-Solutions/bem-me-cuida.git"

if (-not (Test-Path ".git")) {
  throw "Execute este script na raiz do repositório BemMeCuida."
}

$OriginExists = git remote 2>$null | Select-String -SimpleMatch "origin"
if ($OriginExists) {
  git remote set-url origin $Repo
} else {
  git remote add origin $Repo
}

git push -u origin main
Write-Host "Publicado em https://github.com/Tehkne-Solutions/bem-me-cuida" -ForegroundColor Green
