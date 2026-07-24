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

if [ -n "${DATAGOLF_PLAYWRIGHT_CLI:-}" ]; then
  playwright_cli="$DATAGOLF_PLAYWRIGHT_CLI"
elif [ -x "${CODEX_HOME:-$HOME/.codex}/skills/playwright/scripts/playwright_cli.sh" ]; then
  playwright_cli="${CODEX_HOME:-$HOME/.codex}/skills/playwright/scripts/playwright_cli.sh"
elif command -v playwright-cli >/dev/null 2>&1; then
  playwright_cli="playwright-cli"
else
  echo "Playwright CLI is required. Set DATAGOLF_PLAYWRIGHT_CLI or install playwright-cli." >&2
  exit 1
fi

case "$playwright_cli" in
  */playwright_cli.sh)
    if ! command -v npx >/dev/null 2>&1; then
      echo "npx is required by the bundled Playwright CLI wrapper." >&2
      exit 1
    fi
    ;;
esac

api_port="${DATAGOLF_E2E_API_PORT:-8011}"
web_port="${DATAGOLF_E2E_WEB_PORT:-3011}"
api_url="http://127.0.0.1:${api_port}"
web_url="http://127.0.0.1:${web_port}"
challenge_slug="${DATAGOLF_E2E_CHALLENGE_SLUG:-tiktok-creator-posts}"
playwright_session="datagolf-web-e2e-$$"
tmp_dir=$(mktemp -d "${TMPDIR:-/tmp}/datagolf-web-e2e.XXXXXX")
api_log="$tmp_dir/api.log"
web_log="$tmp_dir/web.log"
api_pid=""
web_pid=""

cleanup() {
  if [ -n "$web_pid" ]; then
    kill "$web_pid" >/dev/null 2>&1 || true
  fi
  if [ -n "$api_pid" ]; then
    kill "$api_pid" >/dev/null 2>&1 || true
  fi
  (cd "$tmp_dir" && "$playwright_cli" --session "$playwright_session" close) >/dev/null 2>&1 || true
  rm -rf "$tmp_dir"
}

trap cleanup EXIT INT TERM

wait_for_url() {
  url="$1"
  label="$2"
  log_file="$3"
  attempts=0

  while [ "$attempts" -lt 80 ]; do
    if "$python_bin" - "$url" >/dev/null 2>&1 <<'PY'
from urllib.request import urlopen
import sys

with urlopen(sys.argv[1], timeout=1) as response:
    if response.status >= 500:
        raise SystemExit(1)
PY
    then
      return 0
    fi

    attempts=$((attempts + 1))
    sleep 0.25
  done

  echo "Timed out waiting for $label at $url." >&2
  echo "---- $label log ----" >&2
  tail -n 80 "$log_file" >&2 || true
  exit 1
}

DATAGOLF_DATABASE_PATH="$tmp_dir/datagolf.sqlite3" \
  DATAGOLF_ALLOW_TEMPLATE_FALLBACK=1 \
  "$python_bin" -m uvicorn app.main:app \
    --app-dir "$repo_root/apps/api" \
    --host 127.0.0.1 \
    --port "$api_port" \
    >"$api_log" 2>&1 &
api_pid=$!

wait_for_url "$api_url/health" "API" "$api_log"

NEXT_PUBLIC_DATAGOLF_API_URL="$api_url" \
  pnpm --dir "$repo_root/apps/web" exec next dev \
    --hostname 127.0.0.1 \
    --port "$web_port" \
    >"$web_log" 2>&1 &
web_pid=$!

wait_for_url "$web_url/challenges" "web app" "$web_log"

(
  cd "$tmp_dir"
  "$playwright_cli" --session "$playwright_session" open "$web_url/challenges"
)

run_log="$tmp_dir/playwright-run.log"
if (
  cd "$tmp_dir"
  "$playwright_cli" --session "$playwright_session" run-code "$(cat "$repo_root/scripts/e2e-web-runner.js")"
) >"$run_log" 2>&1; then
  run_status=0
else
  run_status=$?
fi

cat "$run_log"
if grep -q "^### Error" "$run_log"; then
  exit 1
fi
if [ "$run_status" -ne 0 ]; then
  exit "$run_status"
fi
