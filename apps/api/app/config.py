from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
import os


@dataclass(frozen=True)
class Settings:
    repo_root: Path
    challenge_specs_root: Path
    default_database_path: Path
    openai_api_key: str | None
    openai_model: str
    allow_template_fallback: bool

    @property
    def database_path(self) -> Path:
        raw_path = os.getenv("DATAGOLF_DATABASE_PATH")
        if raw_path:
            return Path(raw_path).expanduser().resolve()
        return self.default_database_path


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    repo_root = Path(__file__).resolve().parents[3]
    return Settings(
        repo_root=repo_root,
        challenge_specs_root=repo_root / "packages" / "challenges",
        default_database_path=repo_root / "apps" / "api" / "datagolf.sqlite3",
        openai_api_key=os.getenv("OPENAI_API_KEY"),
        openai_model=os.getenv("OPENAI_MODEL", "gpt-5.2"),
        allow_template_fallback=os.getenv("DATAGOLF_ALLOW_TEMPLATE_FALLBACK", "1") != "0",
    )
