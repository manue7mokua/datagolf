from __future__ import annotations

from pathlib import Path
import sys
import unittest


REPO_ROOT = Path(__file__).resolve().parents[3]
API_ROOT = REPO_ROOT / "apps" / "api"
sys.path.insert(0, str(API_ROOT))

from app.attempts_service import AttemptsService
from app.schemas import AttemptCreateRequest, QuestionDisplay, QuestionSpec


class AttemptsServiceTests(unittest.TestCase):
    def test_validate_fill_blank_trims_values(self) -> None:
        service = AttemptsService(
            challenge_registry=None,
            dataset_loader=None,
            llm_service=None,
            evaluator=None,
            attempts_repo=FakeAttemptsRepository(),
        )

        payload = service._validate_request(
            create_fill_blank_question(),
            AttemptCreateRequest(
                session_id="session-a",
                blanks=[" views ", " likes"],
            ),
        )

        self.assertEqual(payload, {"blanks": ["views", "likes"]})

    def test_validate_fill_blank_rejects_empty_values(self) -> None:
        service = AttemptsService(
            challenge_registry=None,
            dataset_loader=None,
            llm_service=None,
            evaluator=None,
            attempts_repo=FakeAttemptsRepository(),
        )

        with self.assertRaisesRegex(
            ValueError,
            "blanks is required for fill-in-the-blank attempts",
        ):
            service._validate_request(
                create_fill_blank_question(),
                AttemptCreateRequest(
                    session_id="session-a",
                    blanks=["views", " "],
                ),
            )

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


def create_fill_blank_question() -> QuestionSpec:
    return QuestionSpec(
        id="Q-fill",
        order=1,
        type="fill_blank",
        title="Fill blanks",
        display=QuestionDisplay(task_text="Fill each blank."),
        evaluation={
            "kind": "fill_blank",
            "accepted_answers": [["views"], ["likes"]],
        },
    )


if __name__ == "__main__":
    unittest.main()
