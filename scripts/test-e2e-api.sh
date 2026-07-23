#!/bin/sh
set -eu

if [ -n "${DATAGOLF_E2E_PYTHON:-}" ]; then
  python_bin="$DATAGOLF_E2E_PYTHON"
elif /usr/bin/python3 -c "import fastapi" >/dev/null 2>&1; then
  python_bin="/usr/bin/python3"
elif python3 -c "import fastapi" >/dev/null 2>&1; then
  python_bin="python3"
else
  echo "FastAPI test dependencies are not installed. Install apps/api/requirements.txt or set DATAGOLF_E2E_PYTHON." >&2
  exit 1
fi

exec "$python_bin" -m unittest apps.api.tests.test_api_endpoints.ApiEndpointTests.test_e2e_challenge_runner_happy_path
