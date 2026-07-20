from __future__ import annotations

from pathlib import Path
import sys
import unittest


REPO_ROOT = Path(__file__).resolve().parents[3]
API_ROOT = REPO_ROOT / "apps" / "api"
sys.path.insert(0, str(API_ROOT))

from app.attempts_service import AttemptsService


class AttemptsServiceTests(unittest.TestCase):
    def test_list_attempts_for_session_delegates_filter_and_limit(self) -> None:
        repo = FakeAttemptsRepository()
        service = AttemptsService(
            challenge_registry=None,
            dataset_loader=None,
            llm_service=None,
            evaluator=None,
            attempts_repo=repo,
        )

        attempts = service.list_attempts_for_session(
            "session-a",
            challenge_slug="challenge-a",
            limit=25,
        )

        self.assertEqual(attempts, [{"id": "attempt-a"}])
        self.assertEqual(
            repo.calls,
            [
                {
                    "session_id": "session-a",
                    "challenge_slug": "challenge-a",
                    "limit": 25,
                }
            ],
        )


class FakeAttemptsRepository:
    def __init__(self) -> None:
        self.calls: list[dict] = []

    def list_attempts_for_session(
        self,
        session_id: str,
        *,
        challenge_slug: str | None = None,
        limit: int = 100,
    ):
        self.calls.append(
            {
                "session_id": session_id,
                "challenge_slug": challenge_slug,
                "limit": limit,
            }
        )
        return [{"id": "attempt-a"}]


if __name__ == "__main__":
    unittest.main()
