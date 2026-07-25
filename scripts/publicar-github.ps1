$ErrorActionPreference = "Stop"
$Repo = "https://github.com/Tehkne-Solutions/bem-me-cuida.git"

if (-not (Test-Path ".git")) {
  throw "Execute este script na raiz do repositório Git."
}

$Origin = git remote get-url origin 2>$null
if ($LASTEXITCODE -eq 0) {
  git remote set-url origin $Repo
} else {
  git remote add origin $Repo
}

git push -u origin main
