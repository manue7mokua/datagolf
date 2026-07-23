#!/bin/sh
set -eu

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
local_e2e_python="$repo_root/.tmp/e2e-api-venv/bin/python"

if [ -n "${DATAGOLF_E2E_PYTHON:-}" ]; then
  python_bin="$DATAGOLF_E2E_PYTHON"
elif [ -x "$local_e2e_python" ] && "$local_e2e_python" -c "import fastapi, pandas, httpx2" >/dev/null 2>&1; then
  python_bin="$local_e2e_python"
elif /usr/bin/python3 -c "import fastapi, pandas, httpx2" >/dev/null 2>&1; then
  python_bin="/usr/bin/python3"
elif python3 -c "import fastapi, pandas, httpx2" >/dev/null 2>&1; then
  python_bin="python3"
else
  echo "API E2E dependencies are not installed. Run pnpm setup:e2e or set DATAGOLF_E2E_PYTHON." >&2
  exit 1
fi

if ! "$python_bin" -c "import fastapi, pandas, httpx2" >/dev/null 2>&1; then
  echo "DATAGOLF_E2E_PYTHON must point to a Python with apps/api/requirements.txt installed." >&2
  exit 1
fi

exec "$python_bin" -m unittest apps.api.tests.test_api_endpoints.ApiEndpointTests.test_e2e_challenge_runner_happy_path
