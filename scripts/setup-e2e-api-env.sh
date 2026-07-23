#!/bin/sh
set -eu

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
venv_dir="${DATAGOLF_E2E_VENV:-$repo_root/.tmp/e2e-api-venv}"
python_seed="${DATAGOLF_E2E_PYTHON_SEED:-python3}"

if [ ! -x "$venv_dir/bin/python" ]; then
  "$python_seed" -m venv "$venv_dir"
fi

"$venv_dir/bin/python" -m pip install -r "$repo_root/apps/api/requirements.txt"

echo "$venv_dir/bin/python"
