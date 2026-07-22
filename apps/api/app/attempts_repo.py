from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager
import json
from pathlib import Path
import sqlite3
from typing import Any


class AttemptsRepository:
    def __init__(self, database_path: Path) -> None:
        self.database_path = database_path

    def initialize(self) -> None:
        self.database_path.parent.mkdir(parents=True, exist_ok=True)
        with self._connection() as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS attempts (
                    id TEXT PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    question_id TEXT NOT NULL,
                    question_type TEXT NOT NULL,
                    status TEXT NOT NULL,
                    challenge_slug TEXT NOT NULL,
                    challenge_version TEXT NOT NULL,
                    dataset_slug TEXT NOT NULL,
                    dataset_version TEXT NOT NULL,
                    prompt_version TEXT NOT NULL,
                    model TEXT NOT NULL,
                    evaluator_version TEXT NOT NULL,
                    user_input_payload TEXT NOT NULL,
                    generated_code TEXT,
                    evaluation_payload TEXT,
                    is_correct INTEGER,
                    error_message TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
                """
            )
            connection.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_attempts_session_created_at
                ON attempts (session_id, created_at)
                """
            )
            connection.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_attempts_session_challenge_created_at
                ON attempts (session_id, challenge_slug, created_at)
                """
            )
            connection.commit()

    def create_attempt(self, record: dict[str, Any]) -> dict[str, Any]:
        record = self._normalize_attempt_record(record)
        with self._connection() as connection:
            connection.execute(
                """
                INSERT INTO attempts (
                    id, session_id, question_id, question_type, status,
                    challenge_slug, challenge_version, dataset_slug, dataset_version,
                    prompt_version, model, evaluator_version, user_input_payload,
                    generated_code, evaluation_payload, is_correct, error_message,
                    created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    record["id"],
                    record["session_id"],
                    record["question_id"],
                    record["question_type"],
                    record["status"],
                    record["challenge_slug"],
                    record["challenge_version"],
                    record["dataset_slug"],
                    record["dataset_version"],
                    record["prompt_version"],
                    record["model"],
                    record["evaluator_version"],
                    json.dumps(record["user_input_payload"]),
                    record.get("generated_code"),
                    json.dumps(record["evaluation_payload"])
                    if record.get("evaluation_payload") is not None
                    else None,
                    self._serialize_bool(record.get("is_correct")),
                    record.get("error_message"),
                    record["created_at"],
                    record["updated_at"],
                ),
            )
            connection.commit()
        return record

    def update_attempt(
        self,
        attempt_id: str,
        *,
        status: str,
        model: str,
        generated_code: str | None,
        evaluation_payload: dict[str, Any] | None,
        is_correct: bool | None,
        error_message: str | None,
        updated_at: str,
    ) -> dict[str, Any] | None:
        attempt_id = attempt_id.strip()
        status = status.strip()
        model = model.strip()
        with self._connection() as connection:
            connection.execute(
                """
                UPDATE attempts
                SET status = ?,
                    model = ?,
                    generated_code = ?,
                    evaluation_payload = ?,
                    is_correct = ?,
                    error_message = ?,
                    updated_at = ?
                WHERE id = ?
                """,
                (
                    status,
                    model,
                    generated_code,
                    json.dumps(evaluation_payload) if evaluation_payload is not None else None,
                    self._serialize_bool(is_correct),
                    error_message,
                    updated_at,
                    attempt_id,
                ),
            )
            connection.commit()
        return self.get_attempt(attempt_id)

    def get_attempt(self, attempt_id: str) -> dict[str, Any] | None:
        attempt_id = attempt_id.strip()
        with self._connection() as connection:
            cursor = connection.execute(
                "SELECT * FROM attempts WHERE id = ?",
                (attempt_id,),
            )
            row = cursor.fetchone()
        if row is None:
            return None
        return self._deserialize_row(row)

    def list_attempts_for_session(
        self,
        session_id: str,
        *,
        challenge_slug: str | None = None,
        limit: int | None = 100,
    ) -> list[dict[str, Any]]:
        if limit is not None and limit <= 0:
            return []

        session_id = session_id.strip()
        challenge_slug = challenge_slug.strip() if challenge_slug is not None else None
        query = "SELECT * FROM attempts WHERE session_id = ?"
        params: list[Any] = [session_id]

        if challenge_slug:
            query += " AND challenge_slug = ?"
            params.append(challenge_slug)

        query += " ORDER BY created_at ASC, id ASC"

        if limit is not None:
            query += " LIMIT ?"
            params.append(limit)

        with self._connection() as connection:
            cursor = connection.execute(query, params)
            rows = cursor.fetchall()

        return [self._deserialize_row(row) for row in rows]

    def _normalize_attempt_record(self, record: dict[str, Any]) -> dict[str, Any]:
        normalized = dict(record)
        for key in (
            "id",
            "session_id",
            "question_id",
            "question_type",
            "status",
            "challenge_slug",
            "challenge_version",
            "dataset_slug",
            "dataset_version",
            "prompt_version",
            "model",
            "evaluator_version",
        ):
            value = normalized.get(key)
            if isinstance(value, str):
                normalized[key] = value.strip()

        return normalized

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.database_path)
        connection.row_factory = sqlite3.Row
        return connection

    @contextmanager
    def _connection(self) -> Iterator[sqlite3.Connection]:
        connection = self._connect()
        try:
            yield connection
        finally:
            connection.close()

    def _deserialize_row(self, row: sqlite3.Row) -> dict[str, Any]:
        payload = dict(row)
        payload["user_input_payload"] = json.loads(payload["user_input_payload"])
        if payload["evaluation_payload"] is not None:
            payload["evaluation_payload"] = json.loads(payload["evaluation_payload"])
        payload["is_correct"] = self._deserialize_bool(payload["is_correct"])
        return payload

    def _serialize_bool(self, value: bool | None) -> int | None:
        if value is None:
            return None
        return 1 if value else 0

    def _deserialize_bool(self, value: int | None) -> bool | None:
        if value is None:
            return None
        return bool(value)
