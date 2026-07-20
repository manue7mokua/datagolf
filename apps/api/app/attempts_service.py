from __future__ import annotations

from datetime import datetime, timezone
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
        return self.attempts_repo.list_attempts_for_session(
            session_id,
            challenge_slug=challenge_slug,
            limit=limit,
        )

    def _validate_request(self, question: QuestionSpec, request: AttemptCreateRequest):
        if question.type == "guided_prompt":
            if not request.prompt_text or not request.prompt_text.strip():
                raise ValueError("prompt_text is required for guided prompt attempts")
            return {
                "prompt_text": request.prompt_text,
                "prompt_token_estimate": estimate_token_count(request.prompt_text),
            }

        if question.type == "multiple_choice":
            if not request.selected_option:
                raise ValueError("selected_option is required for multiple choice attempts")
            return {"selected_option": request.selected_option}

        if question.type == "fill_blank":
            blanks = request.blanks or []
            trimmed_blanks = [blank.strip() for blank in blanks]
            if not trimmed_blanks or any(not blank for blank in trimmed_blanks):
                raise ValueError("blanks is required for fill-in-the-blank attempts")
            return {"blanks": trimmed_blanks}

        if question.type == "micro_code":
            if not request.code_text or not request.code_text.strip():
                raise ValueError("code_text is required for micro-code attempts")
            return {"code_text": request.code_text}

        raise ValueError(f"Unsupported question type: {question.type}")

    def _utcnow(self) -> str:
        return datetime.now(timezone.utc).isoformat()
