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
            create_multiple_choice_question(),
            AttemptCreateRequest(
                session_id="session-a",
                selected_option=" B ",
            ),
        )

        self.assertEqual(payload, {"selected_option": "B"})

    def test_validate_multiple_choice_canonicalizes_option_case(self) -> None:
        service = create_service()

        payload = service._validate_request(
            create_multiple_choice_question(),
            AttemptCreateRequest(
                session_id="session-a",
                selected_option=" b ",
            ),
        )

        self.assertEqual(payload, {"selected_option": "B"})

    def test_validate_multiple_choice_rejects_unknown_option(self) -> None:
        service = create_service()

        with self.assertRaisesRegex(
            ValueError,
            "selected_option must be one of: A, B",
        ):
            service._validate_request(
                create_multiple_choice_question(),
                AttemptCreateRequest(
                    session_id="session-a",
                    selected_option="C",
                ),
            )

    def test_validate_multiple_choice_requires_choices(self) -> None:
        service = create_service()

        with self.assertRaisesRegex(
            ValueError,
            "multiple choice questions must define choices",
        ):
            service._validate_request(
                create_question(
                    question_type="multiple_choice",
                    evaluation={
                        "kind": "multiple_choice",
                        "correct_option": "B",
                    },
                ),
                AttemptCreateRequest(
                    session_id="session-a",
                    selected_option="B",
                ),
            )

    def test_validate_multiple_choice_requires_unique_non_empty_choice_ids(self) -> None:
        service = create_service()

        with self.assertRaisesRegex(
            ValueError,
            "multiple choice choices must define unique non-empty ids",
        ):
            service._validate_request(
                create_question(
                    question_type="multiple_choice",
                    evaluation={
                        "kind": "multiple_choice",
                        "correct_option": "B",
                    },
                    choices=[
                        {"id": "A", "text": "First"},
                        {"id": "a", "text": "Duplicate"},
                    ],
                ),
                AttemptCreateRequest(
                    session_id="session-a",
                    selected_option="A",
                ),
            )

        with self.assertRaisesRegex(
            ValueError,
            "multiple choice choices must define unique non-empty ids",
        ):
            service._validate_request(
                create_question(
                    question_type="multiple_choice",
                    evaluation={
                        "kind": "multiple_choice",
                        "correct_option": "B",
                    },
                    choices=[
                        {"id": " ", "text": "Blank"},
                        {"id": "B", "text": "Second"},
                    ],
                ),
                AttemptCreateRequest(
                    session_id="session-a",
                    selected_option="B",
                ),
            )

    def test_validate_multiple_choice_requires_correct_option_in_choices(self) -> None:
        service = create_service()

        with self.assertRaisesRegex(
            ValueError,
            "multiple choice correct option must be one of the defined choices",
        ):
            service._validate_request(
                create_question(
                    question_type="multiple_choice",
                    evaluation={
                        "kind": "multiple_choice",
                        "correct_option": "C",
                    },
                    choices=[
                        {"id": "A", "text": "First"},
                        {"id": "B", "text": "Second"},
                    ],
                ),
                AttemptCreateRequest(
                    session_id="session-a",
                    selected_option="B",
                ),
            )

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

    def test_validate_micro_code_requires_accepted_answers(self) -> None:
        service = create_service()

        with self.assertRaisesRegex(
            ValueError,
            "micro-code questions must define accepted answers",
        ):
            service._validate_request(
                create_question(
                    question_type="micro_code",
                    evaluation={
                        "kind": "micro_code",
                        "accepted_patterns": [],
                    },
                ),
                AttemptCreateRequest(
                    session_id="session-a",
                    code_text="select(post_id)",
                ),
            )

        with self.assertRaisesRegex(
            ValueError,
            "micro-code questions must define accepted answers",
        ):
            service._validate_request(
                create_question(
                    question_type="micro_code",
                    evaluation={
                        "kind": "micro_code",
                        "accepted_patterns": [" "],
                        "accepted_regex": [""],
                    },
                ),
                AttemptCreateRequest(
                    session_id="session-a",
                    code_text="select(post_id)",
                ),
            )

    def test_validate_micro_code_requires_valid_accepted_regex(self) -> None:
        service = create_service()

        with self.assertRaisesRegex(
            ValueError,
            "micro-code accepted regex must be valid",
        ):
            service._validate_request(
                create_question(
                    question_type="micro_code",
                    evaluation={
                        "kind": "micro_code",
                        "accepted_patterns": [],
                        "accepted_regex": ["("],
                    },
                ),
                AttemptCreateRequest(
                    session_id="session-a",
                    code_text="select(post_id)",
                ),
            )

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

    def test_validate_fill_blank_rejects_wrong_blank_count(self) -> None:
        service = create_service()

        with self.assertRaisesRegex(
            ValueError,
            "expected 2 blanks for fill-in-the-blank attempts",
        ):
            service._validate_request(
                create_fill_blank_question(),
                AttemptCreateRequest(
                    session_id="session-a",
                    blanks=["views"],
                ),
            )

        with self.assertRaisesRegex(
            ValueError,
            "expected 2 blanks for fill-in-the-blank attempts",
        ):
            service._validate_request(
                create_fill_blank_question(),
                AttemptCreateRequest(
                    session_id="session-a",
                    blanks=["views", "likes", "shares"],
                ),
            )

    def test_validate_fill_blank_requires_accepted_answers(self) -> None:
        service = create_service()

        with self.assertRaisesRegex(
            ValueError,
            "fill-in-the-blank questions must define accepted answers",
        ):
            service._validate_request(
                create_question(
                    question_type="fill_blank",
                    evaluation={
                        "kind": "fill_blank",
                        "accepted_answers": [],
                    },
                ),
                AttemptCreateRequest(
                    session_id="session-a",
                    blanks=["views"],
                ),
            )

        with self.assertRaisesRegex(
            ValueError,
            "fill-in-the-blank questions must define accepted answers",
        ):
            service._validate_request(
                create_question(
                    question_type="fill_blank",
                    evaluation={
                        "kind": "fill_blank",
                        "accepted_answers": [["views"], [" "]],
                    },
                ),
                AttemptCreateRequest(
                    session_id="session-a",
                    blanks=["views", "likes"],
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

    def test_summarize_session_challenge_counts_retried_question_once(self) -> None:
        repo = FakeAttemptsRepository(
            attempts=[
                create_attempt_record("attempt-1", "Q1", is_correct=False),
                create_attempt_record("attempt-2", "Q1", is_correct=True),
                create_attempt_record("attempt-3", "Q2", is_correct=False),
            ]
        )
        service = AttemptsService(
            challenge_registry=FakeChallengeRegistry(question_count=3),
            dataset_loader=None,
            llm_service=None,
            evaluator=None,
            attempts_repo=repo,
        )

        summary = service.summarize_session_challenge(
            "session-a",
            "challenge-a",
        )

        self.assertEqual(summary["attempted_questions"], 2)
        self.assertEqual(summary["correct_questions"], 1)
        self.assertEqual(summary["remaining_questions"], 2)
        self.assertEqual(summary["incorrect_questions"], 1)
        self.assertEqual(summary["pending_questions"], 0)
        self.assertEqual(summary["skipped_questions"], 1)
        self.assertEqual(summary["retry_questions"], 1)
        self.assertEqual(summary["total_attempts"], 3)
        self.assertEqual(summary["accuracy_percent"], 50)
        self.assertEqual(summary["completion_percent"], 33)
        self.assertEqual(
            repo.calls,
            [
                {
                    "session_id": "session-a",
                    "challenge_slug": "challenge-a",
                    "limit": None,
                }
            ],
        )

    def test_summarize_session_challenge_ignores_removed_questions(self) -> None:
        repo = FakeAttemptsRepository(
            attempts=[
                create_attempt_record("attempt-1", "Q1", is_correct=True),
                create_attempt_record("attempt-removed", "Q99", is_correct=True),
            ]
        )
        service = AttemptsService(
            challenge_registry=FakeChallengeRegistry(question_count=2),
            dataset_loader=None,
            llm_service=None,
            evaluator=None,
            attempts_repo=repo,
        )

        summary = service.summarize_session_challenge(
            "session-a",
            "challenge-a",
        )

        self.assertEqual(summary["attempted_questions"], 1)
        self.assertEqual(summary["correct_questions"], 1)
        self.assertEqual(summary["remaining_questions"], 1)
        self.assertEqual(summary["skipped_questions"], 1)
        self.assertEqual(summary["retry_questions"], 0)
        self.assertEqual(summary["total_attempts"], 1)
        self.assertEqual(summary["accuracy_percent"], 100)
        self.assertEqual(summary["completion_percent"], 50)


class FakeAttemptsRepository:
    def __init__(self, attempts: list[dict] | None = None) -> None:
        self.calls: list[dict] = []
        self.attempts = attempts

    def list_attempts_for_session(
        self,
        session_id: str,
        *,
        challenge_slug: str | None = None,
        limit: int | None = 100,
    ):
        self.calls.append(
            {
                "session_id": session_id,
                "challenge_slug": challenge_slug,
                "limit": limit,
            }
        )
        return self.attempts if self.attempts is not None else [{"id": "attempt-a"}]


class FakeChallengeRegistry:
    def __init__(self, question_count: int) -> None:
        self.challenge = FakeChallenge(question_count)

    def get_challenge(self, challenge_slug: str):
        self.challenge.challenge_slug = challenge_slug
        return self.challenge


class FakeChallenge:
    def __init__(self, question_count: int) -> None:
        self.challenge_slug = "challenge-a"
        self.challenge_version = "v1"
        self.questions = [
            FakeQuestion(question_id=f"Q{index + 1}") for index in range(question_count)
        ]


class FakeQuestion:
    def __init__(self, question_id: str) -> None:
        self.id = question_id


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


def create_multiple_choice_question() -> QuestionSpec:
    return create_question(
        question_type="multiple_choice",
        evaluation={
            "kind": "multiple_choice",
            "correct_option": "B",
        },
        choices=[
            {"id": "A", "text": "First"},
            {"id": "B", "text": "Second"},
        ],
    )


def create_question(
    question_type: str,
    evaluation: dict,
    choices: list[dict] | None = None,
) -> QuestionSpec:
    return QuestionSpec(
        id=f"Q-{question_type}",
        order=1,
        type=question_type,
        title="Question",
        display=QuestionDisplay(task_text="Fill each blank.", choices=choices or []),
        evaluation=evaluation,
    )


def create_attempt_record(
    attempt_id: str,
    question_id: str,
    *,
    is_correct: bool | None,
    status: str = "completed",
) -> dict:
    return {
        "id": attempt_id,
        "question_id": question_id,
        "is_correct": is_correct,
        "status": status,
    }


if __name__ == "__main__":
    unittest.main()
