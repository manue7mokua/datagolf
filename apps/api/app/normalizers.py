from __future__ import annotations

import re


def normalize_token(value: str) -> str:
    cleaned = value.strip().lower().replace("`", "")
    return re.sub(r"\s+", "", cleaned)


def normalize_code(value: str) -> str:
    stripped = value.strip().replace("```r", "").replace("```", "")
    stripped = stripped.replace("`", "").replace("\n", "")
    return re.sub(r"\s+", "", stripped.lower()).rstrip(";")


def estimate_token_count(value: str) -> int:
    return len(re.findall(r"\w+|[^\s\w]", value))
