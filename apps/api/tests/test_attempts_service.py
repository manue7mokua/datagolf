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
    def test_validate_guided_prompt_trims_text(self) -> None:
        service = create_service()

        payload = service._validate_request(
            create_question(
                question_type="guided_prompt",
                evaluation={
                    "kind": "guided_prompt",
                    "operation": "select",
                    "expected_columns": ["post_id"],
                    "expected_rows": [],
                },
            ),
            AttemptCreateRequest(
                session_id="session-a",
                prompt_text=" show top posts ",
            ),
        )

        self.assertEqual(payload["prompt_text"], "show top posts")

    def test_validate_multiple_choice_trims_option(self) -> None:
        service = create_service()

        payload = service._validate_request(
            create_question(
                question_type="multiple_choice",
                evaluation={
                    "kind": "multiple_choice",
                    "correct_option": "B",
                },
            ),
            AttemptCreateRequest(
                session_id="session-a",
                selected_option=" B ",
            ),
        )

        self.assertEqual(payload, {"selected_option": "B"})

    def test_validate_micro_code_trims_code(self) -> None:
        service = create_service()

        payload = service._validate_request(
            create_question(
                question_type="micro_code",
                evaluation={
                    "kind": "micro_code",
                    "accepted_patterns": ["select"],
                },
            ),
            AttemptCreateRequest(
                session_id="session-a",
                code_text=" select(post_id) ",
            ),
        )

        self.assertEqual(payload, {"code_text": "select(post_id)"})

    def test_validate_fill_blank_trims_values(self) -> None:
        service = create_service()

        payload = service._validate_request(
            create_fill_blank_question(),
            AttemptCreateRequest(
                session_id="session-a",
                blanks=[" views ", " likes"],
            ),
        )

        self.assertEqual(payload, {"blanks": ["views", "likes"]})

    def test_validate_fill_blank_rejects_empty_values(self) -> None:
        service = create_service()

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


def create_service(attempts_repo=None) -> AttemptsService:
    return AttemptsService(
        challenge_registry=None,
        dataset_loader=None,
        llm_service=None,
        evaluator=None,
        attempts_repo=attempts_repo or FakeAttemptsRepository(),
    )


def create_fill_blank_question() -> QuestionSpec:
    return create_question(
        question_type="fill_blank",
        evaluation={
            "kind": "fill_blank",
            "accepted_answers": [["views"], ["likes"]],
        },
    )


def create_question(question_type: str, evaluation: dict) -> QuestionSpec:
    return QuestionSpec(
        id=f"Q-{question_type}",
        order=1,
        type=question_type,
        title="Question",
        display=QuestionDisplay(task_text="Fill each blank."),
        evaluation=evaluation,
    )


if __name__ == "__main__":
    unittest.main()
