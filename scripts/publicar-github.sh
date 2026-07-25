#!/usr/bin/env bash
set -euo pipefail

repo="https://github.com/Tehkne-Solutions/bem-me-cuida.git"

command -v git >/dev/null || {
  echo "Git não encontrado." >&2
  exit 1
}

if [ ! -d .git ]; then
  echo "Execute este script na raiz do repositório BemMeCuida." >&2
  exit 1
fi

if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$repo"
else
  git remote add origin "$repo"
fi

git push -u origin main
