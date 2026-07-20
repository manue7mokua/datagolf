from __future__ import annotations

from pathlib import Path
import sys
import tempfile
import unittest


REPO_ROOT = Path(__file__).resolve().parents[3]
API_ROOT = REPO_ROOT / "apps" / "api"
sys.path.insert(0, str(API_ROOT))

from app.attempts_repo import AttemptsRepository


class AttemptsRepositoryTests(unittest.TestCase):
    def test_list_attempts_for_session_orders_and_filters_results(self) -> None:
        with tempfile.TemporaryDirectory() as tempdir:
            repo = AttemptsRepository(Path(tempdir) / "attempts.sqlite3")
            repo.initialize()

            repo.create_attempt(
                _attempt_record(
                    attempt_id="attempt-2",
                    session_id="session-a",
                    challenge_slug="challenge-a",
                    question_id="Q2",
                    created_at="2026-01-01T00:00:02+00:00",
                )
            )
            repo.create_attempt(
                _attempt_record(
                    attempt_id="attempt-1",
                    session_id="session-a",
                    challenge_slug="challenge-a",
                    question_id="Q1",
                    created_at="2026-01-01T00:00:01+00:00",
                )
            )
            repo.create_attempt(
                _attempt_record(
                    attempt_id="attempt-3",
                    session_id="session-a",
                    challenge_slug="challenge-b",
                    question_id="Q3",
                    created_at="2026-01-01T00:00:03+00:00",
                )
            )
            repo.create_attempt(
                _attempt_record(
                    attempt_id="attempt-4",
                    session_id="session-b",
                    challenge_slug="challenge-a",
                    question_id="Q4",
                    created_at="2026-01-01T00:00:04+00:00",
                )
            )

            all_session_attempts = repo.list_attempts_for_session("session-a")
            filtered_attempts = repo.list_attempts_for_session(
                "session-a",
                challenge_slug="challenge-a",
            )

        self.assertEqual(
            [attempt["id"] for attempt in all_session_attempts],
            ["attempt-1", "attempt-2", "attempt-3"],
        )
        self.assertEqual(
            [attempt["id"] for attempt in filtered_attempts],
            ["attempt-1", "attempt-2"],
        )
        self.assertEqual(filtered_attempts[0]["user_input_payload"], {"selected_option": "B"})
        self.assertTrue(filtered_attempts[0]["is_correct"])


def _attempt_record(
    *,
    attempt_id: str,
    session_id: str,
    challenge_slug: str,
    question_id: str,
    created_at: str,
) -> dict:
    return {
        "id": attempt_id,
        "session_id": session_id,
        "question_id": question_id,
        "question_type": "multiple_choice",
        "status": "completed",
        "challenge_slug": challenge_slug,
        "challenge_version": "v1",
        "dataset_slug": "dataset-a",
        "dataset_version": "v1",
        "prompt_version": "prompt_v1",
        "model": "not_applicable",
        "evaluator_version": "evaluator_v1",
        "user_input_payload": {"selected_option": "B"},
        "generated_code": None,
        "evaluation_payload": {"passed": True},
        "is_correct": True,
        "error_message": None,
        "created_at": created_at,
        "updated_at": created_at,
    }


if __name__ == "__main__":
    unittest.main()
