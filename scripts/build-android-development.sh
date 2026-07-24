#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../apps/mobile"
export APP_VARIANT=development
npx eas-cli@latest build --platform android --profile development
