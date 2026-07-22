from __future__ import annotations

from datetime import datetime, timezone
import re
from uuid import uuid4

from .attempts_repo import AttemptsRepository
from .challenge_registry import ChallengeRegistry
from .dataset_loader import DatasetLoader
from .evaluator import Evaluator
from .llm_service import LLMService
from .normalizers import estimate_token_count
from .schemas import AttemptCreateRequest, GuidedPromptEvaluation, QuestionSpec


class AttemptsService:
    def __init__(
        self,
        challenge_registry: ChallengeRegistry,
        dataset_loader: DatasetLoader,
        llm_service: LLMService,
        evaluator: Evaluator,
        attempts_repo: AttemptsRepository,
    ) -> None:
        self.challenge_registry = challenge_registry
        self.dataset_loader = dataset_loader
        self.llm_service = llm_service
        self.evaluator = evaluator
        self.attempts_repo = attempts_repo

    def run_attempt(self, question_id: str, request: AttemptCreateRequest):
        challenge, question = self.challenge_registry.get_question(question_id)
        user_input_payload = self._validate_request(question, request)
        now = self._utcnow()
        attempt_id = str(uuid4())

        base_record = {
            "id": attempt_id,
            "session_id": request.session_id,
            "question_id": question.id,
            "question_type": question.type,
            "status": "pending",
            "challenge_slug": challenge.challenge_slug,
            "challenge_version": challenge.challenge_version,
            "dataset_slug": challenge.dataset.slug,
            "dataset_version": challenge.dataset.version,
            "prompt_version": challenge.prompt_version,
            "model": "not_applicable",
            "evaluator_version": challenge.evaluator_version,
            "user_input_payload": user_input_payload,
            "generated_code": None,
            "evaluation_payload": None,
            "is_correct": None,
            "error_message": None,
            "created_at": now,
            "updated_at": now,
        }
        self.attempts_repo.create_attempt(base_record)

        try:
            generated_code = None
            model = "not_applicable"

            if question.type == "guided_prompt":
                generated = self.llm_service.generate_guided_prompt_code(
                    challenge,
                    question,
                    user_input_payload["prompt_text"],
                )
                generated_code = generated.code
                model = generated.model
                dataframe = self.dataset_loader.load(challenge.dataset.path)
                evaluation_payload = self.evaluator.evaluate_guided_prompt(
                    question,
                    generated_code,
                    dataframe,
                )
            elif question.type == "multiple_choice":
                evaluation_payload = self.evaluator.evaluate_multiple_choice(
                    question,
                    user_input_payload["selected_option"],
                )
            elif question.type == "fill_blank":
                evaluation_payload = self.evaluator.evaluate_fill_blank(
                    question,
                    user_input_payload["blanks"],
                )
            elif question.type == "micro_code":
                evaluation_payload = self.evaluator.evaluate_micro_code(
                    question,
                    user_input_payload["code_text"],
                )
            else:
                raise ValueError(f"Unsupported question type: {question.type}")

            return self.attempts_repo.update_attempt(
                attempt_id,
                status="completed",
                model=model,
                generated_code=generated_code,
                evaluation_payload=evaluation_payload,
                is_correct=bool(evaluation_payload["passed"]),
                error_message=None,
                updated_at=self._utcnow(),
            )
        except Exception as exc:
            return self.attempts_repo.update_attempt(
                attempt_id,
                status="failed",
                model="not_applicable",
                generated_code=None,
                evaluation_payload=None,
                is_correct=None,
                error_message=str(exc),
                updated_at=self._utcnow(),
            )

    def get_attempt(self, attempt_id: str):
        return self.attempts_repo.get_attempt(attempt_id)

    def list_attempts_for_session(
        self,
        session_id: str,
        challenge_slug: str | None = None,
        limit: int = 100,
    ):
        normalized_session_id = session_id.strip()
        normalized_challenge_slug = challenge_slug.strip() if challenge_slug else None
        return self.attempts_repo.list_attempts_for_session(
            normalized_session_id,
            challenge_slug=normalized_challenge_slug or None,
            limit=limit,
        )

    def summarize_session_challenge(self, session_id: str, challenge_slug: str):
        normalized_session_id = session_id.strip()
        normalized_challenge_slug = challenge_slug.strip()
        challenge = self.challenge_registry.get_challenge(normalized_challenge_slug)
        attempts = self.attempts_repo.list_attempts_for_session(
            normalized_session_id,
            challenge_slug=normalized_challenge_slug,
            limit=None,
        )
        progress_by_question: dict[str, dict[str, object]] = {}
        current_question_ids = {question.id for question in challenge.questions}
        total_current_attempts = 0

        for attempt in attempts:
            if attempt["question_id"] not in current_question_ids:
                continue

            total_current_attempts += 1
            question_progress = progress_by_question.setdefault(
                attempt["question_id"],
                {
                    "attempt_count": 0,
                    "correct_count": 0,
                    "last_status": None,
                },
            )
            question_progress["attempt_count"] = (
                int(question_progress["attempt_count"]) + 1
            )
            if attempt["is_correct"] is True:
                question_progress["correct_count"] = (
                    int(question_progress["correct_count"]) + 1
                )
            question_progress["last_status"] = attempt["status"]

        total_questions = len(challenge.questions)
        attempted_questions = len(progress_by_question)
        correct_questions = sum(
            1
            for progress in progress_by_question.values()
            if int(progress["correct_count"]) > 0
        )
        pending_questions = sum(
            1
            for progress in progress_by_question.values()
            if int(progress["correct_count"]) == 0
            and progress["last_status"] == "pending"
        )
        retry_questions = sum(
            1
            for progress in progress_by_question.values()
            if int(progress["attempt_count"]) > 1
        )
        incorrect_questions = (
            attempted_questions - correct_questions - pending_questions
        )
        completion_percent = (
            round((correct_questions / total_questions) * 100)
            if total_questions > 0
            else 0
        )
        accuracy_percent = (
            round((correct_questions / attempted_questions) * 100)
            if attempted_questions > 0
            else 0
        )

        return {
            "session_id": normalized_session_id,
            "challenge_slug": challenge.challenge_slug,
            "challenge_version": challenge.challenge_version,
            "total_questions": total_questions,
            "attempted_questions": attempted_questions,
            "correct_questions": correct_questions,
            "remaining_questions": total_questions - correct_questions,
            "incorrect_questions": incorrect_questions,
            "pending_questions": pending_questions,
            "skipped_questions": total_questions - attempted_questions,
            "retry_questions": retry_questions,
            "total_attempts": total_current_attempts,
            "accuracy_percent": min(max(accuracy_percent, 0), 100),
            "completion_percent": min(max(completion_percent, 0), 100),
        }

    def _validate_request(self, question: QuestionSpec, request: AttemptCreateRequest):
        if question.type == "guided_prompt":
            prompt_text = request.prompt_text.strip() if request.prompt_text else ""
            if not prompt_text:
                raise ValueError("prompt_text is required for guided prompt attempts")
            return {
                "prompt_text": prompt_text,
                "prompt_token_estimate": estimate_token_count(prompt_text),
            }

        if question.type == "multiple_choice":
            selected_option = (
                request.selected_option.strip() if request.selected_option else ""
            )
            if not selected_option:
                raise ValueError("selected_option is required for multiple choice attempts")
            choice_ids = [choice.id.strip() for choice in question.display.choices]
            normalized_choice_ids = [choice_id.lower() for choice_id in choice_ids]
            if any(not choice_id for choice_id in choice_ids) or len(
                normalized_choice_ids
            ) != len(set(normalized_choice_ids)):
                raise ValueError("multiple choice choices must define unique non-empty ids")
            choice_id_by_normalized = {
                choice_id.lower(): choice_id for choice_id in choice_ids
            }
            if not choice_id_by_normalized:
                raise ValueError("multiple choice questions must define choices")
            if question.evaluation.correct_option not in choice_id_by_normalized.values():
                raise ValueError(
                    "multiple choice correct option must be one of the defined choices"
                )
            canonical_selected_option = choice_id_by_normalized.get(
                selected_option.lower()
            )
            if canonical_selected_option is None:
                allowed_options = ", ".join(sorted(choice_id_by_normalized.values()))
                raise ValueError(f"selected_option must be one of: {allowed_options}")
            return {"selected_option": canonical_selected_option}

        if question.type == "fill_blank":
            blanks = request.blanks or []
            trimmed_blanks = [blank.strip() for blank in blanks]
            if not trimmed_blanks or any(not blank for blank in trimmed_blanks):
                raise ValueError("blanks is required for fill-in-the-blank attempts")
            accepted_answers = question.evaluation.accepted_answers
            if not accepted_answers or any(
                not any(answer.strip() for answer in answer_group)
                for answer_group in accepted_answers
            ):
                raise ValueError("fill-in-the-blank questions must define accepted answers")
            expected_blank_count = len(accepted_answers)
            if len(trimmed_blanks) != expected_blank_count:
                raise ValueError(
                    f"expected {expected_blank_count} blanks for fill-in-the-blank attempts"
                )
            return {"blanks": trimmed_blanks}

        if question.type == "micro_code":
            code_text = request.code_text.strip() if request.code_text else ""
            if not code_text:
                raise ValueError("code_text is required for micro-code attempts")
            if (
                not any(
                    pattern.strip()
                    for pattern in question.evaluation.accepted_patterns
                )
                and not any(
                    pattern.strip()
                    for pattern in question.evaluation.accepted_regex
                )
            ):
                raise ValueError("micro-code questions must define accepted answers")
            for pattern in question.evaluation.accepted_regex:
                if pattern.strip():
                    try:
                        re.compile(pattern)
                    except re.error as exc:
                        raise ValueError(
                            "micro-code accepted regex must be valid"
                        ) from exc
            return {"code_text": code_text}

        raise ValueError(f"Unsupported question type: {question.type}")

    def _utcnow(self) -> str:
        return datetime.now(timezone.utc).isoformat()
