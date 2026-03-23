from __future__ import annotations

from pathlib import Path


class DatasetLoader:
    def __init__(self, repo_root: Path) -> None:
        self.repo_root = repo_root
        self._frames: dict[str, object] = {}

    def load(self, relative_path: str):
        dataset_path = (self.repo_root / relative_path).resolve()
        if not dataset_path.exists():
            raise FileNotFoundError(f"Dataset not found: {dataset_path}")

        cache_key = str(dataset_path)
        if cache_key not in self._frames:
            import pandas as pd

            self._frames[cache_key] = pd.read_csv(dataset_path, parse_dates=["post_date"])

        return self._frames[cache_key].copy()
